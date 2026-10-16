// Razorpay payment integration utilities
import Razorpay from 'razorpay'
import crypto from 'crypto'
import { paymentDb, subscriptionDb, userDb } from './db'
import { SUBSCRIPTION_PLANS, type SubscriptionTier } from './subscriptions'

// Razorpay rejects orders below ₹1
export const MIN_ORDER_AMOUNT_PAISE = 100

// Lazy initialization of Razorpay instance
let razorpayInstance: Razorpay | null = null

function getRazorpayInstance(): Razorpay {
  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    
    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials not configured')
    }
    
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })
  }
  
  return razorpayInstance
}

// Environment validation
export function validatePaymentEnvironment(): { isValid: boolean; missingVars: string[] } {
  const requiredVars = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']
  const missingVars = requiredVars.filter(varName => !process.env[varName])
  
  return {
    isValid: missingVars.length === 0,
    missingVars
  }
}

export interface PaymentIntent {
  id: string
  amount: number
  currency: string
  receipt: string
  status: string
  created_at: number
}

export interface SubscriptionIntent {
  id: string
  plan_id: string
  customer_id?: string
  status: string
  current_start?: number
  current_end?: number
  created_at: number
}

export interface RazorpayWebhookPayload {
  entity: string
  account_id: string
  event: string
  contains: string[]
  payload: {
    payment?: {
      entity: any
    }
    subscription?: {
      entity: any
    }
  }
  created_at: number
}

// Payment operations
export const paymentService = {
  // Create payment order for one-time payment
  async createPaymentOrder(
    userId: string,
    amount: number,
    currency: string = 'INR',
    receipt?: string,
    subscriptionTier?: SubscriptionTier
  ): Promise<PaymentIntent> {
    if (!Number.isInteger(amount) || amount < MIN_ORDER_AMOUNT_PAISE) {
      throw new Error(`Order amount must be at least ${MIN_ORDER_AMOUNT_PAISE} paise`)
    }

    try {
      const razorpay = getRazorpayInstance()
      const order = await razorpay.orders.create({
        amount: amount, // Amount in paise
        currency,
        receipt: receipt || `payment_${userId}_${Date.now()}`,
        // Stored on Razorpay's side so verification doesn't depend on our payments table
        notes: {
          user_id: userId,
          ...(subscriptionTier ? { subscription_tier: subscriptionTier } : {})
        }
      })

      // Store payment record in database
      await paymentDb.create({
        user_id: userId,
        razorpay_payment_id: order.id,
        amount,
        currency,
        status: 'pending'
      })

      return {
        id: order.id,
        amount: typeof order.amount === 'string' ? parseInt(order.amount) : order.amount,
        currency: order.currency,
        receipt: order.receipt || '',
        status: order.status,
        created_at: order.created_at
      }
    } catch (error) {
      // Rethrow so the route can tell Razorpay auth failures (statusCode 401) from other errors
      console.error('Error creating payment order:', error)
      throw error
    }
  },

  // Verify payment signature: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean {
    try {
      const keySecret = process.env.RAZORPAY_KEY_SECRET
      if (!keySecret) {
        throw new Error('Razorpay credentials not configured')
      }

      const body = orderId + '|' + paymentId
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(body)
        .digest('hex')

      const expected = Buffer.from(expectedSignature, 'utf8')
      const received = Buffer.from(String(signature), 'utf8')
      return expected.length === received.length && crypto.timingSafeEqual(expected, received)
    } catch (error) {
      console.error('Error verifying payment signature:', error)
      return false
    }
  },

  // Handle successful payment
  async handlePaymentSuccess(
    userId: string,
    paymentId: string,
    orderId: string,
    signature: string,
    subscriptionTier: SubscriptionTier
  ): Promise<boolean> {
    try {
      // Verify signature first
      if (!this.verifyPaymentSignature(orderId, paymentId, signature)) {
        console.error('Invalid payment signature')
        return false
      }

      // The Razorpay order is the source of truth: it must belong to this user and have been
      // created for this tier's price. Without this a user could pay for Pro and claim Business.
      const order: any = await getRazorpayInstance().orders.fetch(orderId)
      const orderAmount = typeof order.amount === 'string' ? parseInt(order.amount) : order.amount
      // The local record is best-effort; it may be missing if its insert failed at order creation
      const payment = await paymentDb.getByRazorpayId(orderId)
      // Orders created before notes were added fall back to the local record's owner
      const orderUserId = order.notes?.user_id || payment?.user_id
      if (orderUserId !== userId) {
        console.error('Payment order does not belong to user')
        return false
      }
      if (order.notes?.subscription_tier && order.notes.subscription_tier !== subscriptionTier) {
        console.error('Payment order was created for a different subscription tier')
        return false
      }
      if (orderAmount !== SUBSCRIPTION_PLANS[subscriptionTier].price) {
        console.error('Payment amount does not match subscription tier')
        return false
      }

      if (payment?.status === 'completed') {
        console.error('Payment order already completed')
        return false
      }
      if (payment) {
        await paymentDb.updateStatus(payment.id, 'completed')
      } else {
        await paymentDb.create({
          user_id: userId,
          razorpay_payment_id: orderId,
          amount: orderAmount,
          currency: order.currency || 'INR',
          status: 'completed'
        })
      }

      // Upgrade user subscription
      const nextBillingDate = new Date()
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

      const updatedUser = await userDb.update(userId, {
        subscription_tier: subscriptionTier,
        subscription_status: 'active',
        subscription_expires_at: nextBillingDate
      })
      if (!updatedUser) {
        console.error(`Payment ${paymentId} verified but user ${userId} could not be upgraded`)
        return false
      }

      // Create or update subscription record
      let subscription = await subscriptionDb.getByUserId(userId)
      if (subscription) {
        await subscriptionDb.update(subscription.id, {
          plan_id: subscriptionTier,
          status: 'active',
          current_period_start: new Date(),
          current_period_end: nextBillingDate
        })
      } else {
        await subscriptionDb.create({
          user_id: userId,
          plan_id: subscriptionTier,
          status: 'active',
          current_period_start: new Date(),
          current_period_end: nextBillingDate
        })
      }

      return true
    } catch (error) {
      console.error('Error handling payment success:', error)
      return false
    }
  },

  // Handle payment failure
  async handlePaymentFailure(
    userId: string,
    paymentId: string,
    reason?: string
  ): Promise<boolean> {
    try {
      const payment = await paymentDb.getByRazorpayId(paymentId)
      if (payment) {
        await paymentDb.updateStatus(payment.id, 'failed')
      }

      console.log(`Payment failed for user ${userId}: ${reason}`)
      return true
    } catch (error) {
      console.error('Error handling payment failure:', error)
      return false
    }
  },

  // Get payment details from Razorpay
  async getPaymentDetails(paymentId: string): Promise<any> {
    try {
      const razorpay = getRazorpayInstance()
      const payment = await razorpay.payments.fetch(paymentId)
      return payment
    } catch (error) {
      console.error('Error fetching payment details:', error)
      return null
    }
  }
}

// Subscription operations
export const subscriptionService = {
  // Create Razorpay subscription plan (one-time setup)
  async createSubscriptionPlan(
    planId: string,
    amount: number,
    interval: number = 1,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly'
  ): Promise<any> {
    try {
      const razorpay = getRazorpayInstance()
      const plan = await razorpay.plans.create({
        period,
        interval,
        item: {
          name: `VIVK ${planId} Plan`,
          amount: amount, // Amount in paise
          currency: 'INR'
        }
      })
      return plan
    } catch (error) {
      console.error('Error creating subscription plan:', error)
      return null
    }
  },

  // Create subscription for user
  async createSubscription(
    userId: string,
    planId: string,
    customerId?: string
  ): Promise<SubscriptionIntent | null> {
    try {
      const razorpay = getRazorpayInstance()
      const subscriptionData: any = {
        plan_id: planId,
        total_count: 12, // 12 months
        quantity: 1,
        customer_notify: 1,
        notes: {
          user_id: userId
        }
      }

      if (customerId) {
        subscriptionData.customer_id = customerId
      }

      const subscription = await razorpay.subscriptions.create(subscriptionData)

      // Store subscription record
      await subscriptionDb.create({
        user_id: userId,
        razorpay_subscription_id: subscription.id,
        plan_id: planId as SubscriptionTier,
        status: 'pending',
        current_period_start: subscription.current_start ? new Date(subscription.current_start * 1000) : new Date(),
        current_period_end: subscription.current_end ? new Date(subscription.current_end * 1000) : undefined
      })

      return {
        id: subscription.id,
        plan_id: subscription.plan_id,
        customer_id: subscription.customer_id || undefined,
        status: subscription.status,
        current_start: subscription.current_start || undefined,
        current_end: subscription.current_end || undefined,
        created_at: subscription.created_at
      }
    } catch (error) {
      console.error('Error creating subscription:', error)
      return null
    }
  },

  // Cancel subscription
  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      const razorpay = getRazorpayInstance()
      await razorpay.subscriptions.cancel(subscriptionId)
      return true
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      return false
    }
  },

  // Handle subscription webhook
  async handleSubscriptionWebhook(payload: any): Promise<boolean> {
    try {
      const { event, payload: webhookPayload } = payload
      const subscription = webhookPayload.subscription?.entity

      if (!subscription) {
        return false
      }

      // Find subscription in database
      const dbSubscription = await subscriptionDb.getByUserId(subscription.notes?.user_id)
      if (!dbSubscription) {
        console.error('Subscription not found in database')
        return false
      }

      switch (event) {
        case 'subscription.activated':
          await subscriptionDb.update(dbSubscription.id, {
            status: 'active',
            current_period_start: new Date(subscription.current_start * 1000),
            current_period_end: new Date(subscription.current_end * 1000)
          })
          
          await userDb.update(subscription.notes.user_id, {
            subscription_status: 'active',
            subscription_expires_at: new Date(subscription.current_end * 1000)
          })
          break

        case 'subscription.charged':
          // Handle successful billing
          await paymentDb.create({
            user_id: subscription.notes.user_id,
            razorpay_payment_id: subscription.latest_invoice,
            amount: subscription.plan.amount,
            currency: 'INR',
            status: 'completed'
          })
          break

        case 'subscription.cancelled':
          await subscriptionDb.update(dbSubscription.id, {
            status: 'cancelled'
          })
          
          await userDb.update(subscription.notes.user_id, {
            subscription_status: 'cancelled'
          })
          break

        case 'subscription.expired':
          await subscriptionDb.update(dbSubscription.id, {
            status: 'expired'
          })
          
          await userDb.update(subscription.notes.user_id, {
            subscription_status: 'expired',
            subscription_tier: 'free'
          })
          break

        default:
          console.log(`Unhandled subscription event: ${event}`)
      }

      return true
    } catch (error) {
      console.error('Error handling subscription webhook:', error)
      return false
    }
  }
}

// Webhook verification
export const webhookService = {
  // Verify Razorpay webhook signature
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex')

      return expectedSignature === signature
    } catch (error) {
      console.error('Error verifying webhook signature:', error)
      return false
    }
  },

  // Process webhook payload
  async processWebhook(payload: RazorpayWebhookPayload): Promise<boolean> {
    try {
      const { event, payload: webhookPayload } = payload

      switch (event) {
        case 'payment.captured':
        case 'payment.failed':
          // Handle payment events
          const payment = webhookPayload.payment?.entity
          if (payment) {
            const status = event === 'payment.captured' ? 'completed' : 'failed'
            const dbPayment = await paymentDb.getByRazorpayId(payment.order_id)
            if (dbPayment) {
              await paymentDb.updateStatus(dbPayment.id, status)
            }
          }
          break

        case 'subscription.activated':
        case 'subscription.charged':
        case 'subscription.cancelled':
        case 'subscription.expired':
          // Handle subscription events
          return await subscriptionService.handleSubscriptionWebhook(payload)

        default:
          console.log(`Unhandled webhook event: ${event}`)
      }

      return true
    } catch (error) {
      console.error('Error processing webhook:', error)
      return false
    }
  }
}

// Utility functions
export const paymentUtils = {
  // Format amount for display
  formatAmount(amount: number, currency: string = 'INR'): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0
    }).format(amount / 100) // Convert paise to rupees
  },

  // Convert rupees to paise
  rupeesToPaise(rupees: number): number {
    return Math.round(rupees * 100)
  },

  // Convert paise to rupees
  paiseToRupees(paise: number): number {
    return paise / 100
  },

  // Generate receipt ID (Razorpay allows at most 40 characters)
  generateReceiptId(userId: string, planId: string): string {
    return `vivk_${planId}_${userId.slice(0, 8)}_${Date.now().toString(36)}`.slice(0, 40)
  },

  // Get plan amount in paise
  getPlanAmountInPaise(tier: SubscriptionTier): number {
    const plan = SUBSCRIPTION_PLANS[tier]
    return plan.price // Already in paise
  }
}