// Razorpay TypeScript type definitions

export interface RazorpayOrder {
  id: string
  entity: string
  amount: number
  amount_paid: number
  amount_due: number
  currency: string
  receipt: string
  offer_id?: string
  status: 'created' | 'attempted' | 'paid'
  attempts: number
  notes: Record<string, any>
  created_at: number
}

export interface RazorpayPayment {
  id: string
  entity: string
  amount: number
  currency: string
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed'
  order_id: string
  invoice_id?: string
  international: boolean
  method: string
  amount_refunded: number
  refund_status?: string
  captured: boolean
  description?: string
  card_id?: string
  bank?: string
  wallet?: string
  vpa?: string
  email: string
  contact: string
  notes: Record<string, any>
  fee?: number
  tax?: number
  error_code?: string
  error_description?: string
  error_source?: string
  error_step?: string
  error_reason?: string
  acquirer_data?: Record<string, any>
  created_at: number
}

export interface RazorpaySubscription {
  id: string
  entity: string
  plan_id: string
  customer_id?: string
  status: 'created' | 'authenticated' | 'active' | 'pending' | 'halted' | 'cancelled' | 'completed' | 'expired'
  current_start?: number
  current_end?: number
  ended_at?: number
  quantity: number
  notes: Record<string, any>
  charge_at?: number
  start_at?: number
  end_at?: number
  auth_attempts: number
  total_count: number
  paid_count: number
  customer_notify: boolean
  created_at: number
  expire_by?: number
  short_url?: string
  has_scheduled_changes: boolean
  change_scheduled_at?: number
  source: string
  offer_id?: string
  remaining_count: number
}

export interface RazorpayPlan {
  id: string
  entity: string
  interval: number
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  item: {
    id: string
    active: boolean
    name: string
    description?: string
    amount: number
    unit_amount: number
    currency: string
    type: string
    unit?: string
    tax_inclusive: boolean
    hsn_code?: string
    sac_code?: string
    tax_rate?: number
    tax_id?: string
    tax_group_id?: string
    created_at: number
    updated_at: number
  }
  notes: Record<string, any>
  created_at: number
}

export interface RazorpayWebhookEvent {
  entity: string
  account_id: string
  event: string
  contains: string[]
  payload: {
    payment?: {
      entity: RazorpayPayment
    }
    order?: {
      entity: RazorpayOrder
    }
    subscription?: {
      entity: RazorpaySubscription
    }
  }
  created_at: number
}

export interface RazorpayOptions {
  key_id: string
  key_secret: string
}

export interface RazorpayOrderCreateOptions {
  amount: number
  currency: string
  receipt?: string
  notes?: Record<string, any>
  payment_capture?: 0 | 1
}

export interface RazorpaySubscriptionCreateOptions {
  plan_id: string
  customer_id?: string
  total_count?: number
  quantity?: number
  start_at?: number
  expire_by?: number
  addons?: Array<{
    item: {
      name: string
      amount: number
      currency: string
    }
  }>
  notes?: Record<string, any>
  notify_info?: {
    notify_phone?: string
    notify_email?: string
  }
  customer_notify?: 0 | 1
}

export interface RazorpayPlanCreateOptions {
  id?: string
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  item: {
    name: string
    amount: number
    currency: string
    description?: string
  }
  notes?: Record<string, any>
}

// Razorpay SDK interface
export interface RazorpayInstance {
  orders: {
    create(options: RazorpayOrderCreateOptions): Promise<RazorpayOrder>
    fetch(orderId: string): Promise<RazorpayOrder>
    fetchPayments(orderId: string): Promise<{ items: RazorpayPayment[] }>
  }
  payments: {
    fetch(paymentId: string): Promise<RazorpayPayment>
    capture(paymentId: string, amount: number, currency?: string): Promise<RazorpayPayment>
    refund(paymentId: string, options?: { amount?: number; speed?: string; notes?: Record<string, any> }): Promise<any>
  }
  subscriptions: {
    create(options: RazorpaySubscriptionCreateOptions): Promise<RazorpaySubscription>
    fetch(subscriptionId: string): Promise<RazorpaySubscription>
    cancel(subscriptionId: string, options?: { cancel_at_cycle_end?: 0 | 1 }): Promise<RazorpaySubscription>
    update(subscriptionId: string, options: Partial<RazorpaySubscriptionCreateOptions>): Promise<RazorpaySubscription>
  }
  plans: {
    create(options: RazorpayPlanCreateOptions): Promise<RazorpayPlan>
    fetch(planId: string): Promise<RazorpayPlan>
  }
}

// Constructor type
export interface RazorpayConstructor {
  new (options: RazorpayOptions): RazorpayInstance
}

declare const Razorpay: RazorpayConstructor
export default Razorpay