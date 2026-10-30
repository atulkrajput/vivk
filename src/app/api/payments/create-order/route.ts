import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { paymentService, paymentUtils, getRazorpayCredentials, MIN_ORDER_AMOUNT_PAISE } from "@/lib/payments"
import { SUBSCRIPTION_PLANS, type SubscriptionTier } from "@/lib/subscriptions"
import { discountService, DiscountError, CHECKOUT_TIMEOUT_SECONDS, type AppliedDiscount } from "@/lib/discounts"

// POST /api/payments/create-order - Create Razorpay payment order
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { subscriptionTier, discountCode } = body

    if (!subscriptionTier || !['pro', 'business'].includes(subscriptionTier)) {
      return NextResponse.json(
        { error: "Invalid subscription tier" },
        { status: 400 }
      )
    }

    const plan = SUBSCRIPTION_PLANS[subscriptionTier as SubscriptionTier]
    if (!plan) {
      return NextResponse.json(
        { error: "Subscription plan not found" },
        { status: 404 }
      )
    }

    if (plan.price < MIN_ORDER_AMOUNT_PAISE) {
      return NextResponse.json(
        { error: `Amount must be at least ${MIN_ORDER_AMOUNT_PAISE} paise` },
        { status: 400 }
      )
    }

    // Re-check the discount and hold a use for this checkout; the amount the user pays is only
    // ever computed server-side
    let discount: (AppliedDiscount & { reservationId: string }) | null = null
    if (discountCode) {
      try {
        discount = await discountService.reserve(String(discountCode), session.user.id, subscriptionTier as SubscriptionTier)
      } catch (error) {
        if (error instanceof DiscountError) {
          return NextResponse.json({ error: error.message }, { status: 400 })
        }
        throw error
      }
    }
    const amount = discount ? discount.finalAmount : plan.price

    // Create payment order
    const receipt = paymentUtils.generateReceiptId(session.user.id, subscriptionTier)
    let paymentOrder
    try {
      paymentOrder = await paymentService.createPaymentOrder(
        session.user.id,
        amount, // Amount in paise
        'INR',
        receipt,
        subscriptionTier as SubscriptionTier,
        discount
          ? { discount_code: discount.code.code, discount_amount: String(discount.discountAmount), original_amount: String(discount.originalAmount) }
          : undefined
      )
    } catch (error: any) {
      if (discount) {
        await discountService.release(discount.reservationId).catch((e) => console.error('Could not release discount reservation:', e))
      }
      if (error?.statusCode === 401) {
        console.error("Razorpay rejected RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET (401):", error?.error?.description)
        return NextResponse.json(
          { error: "Payment gateway authentication failed" },
          { status: 401 }
        )
      }
      return NextResponse.json(
        { error: error?.error?.description || "Failed to create payment order" },
        { status: 500 }
      )
    }

    if (discount) {
      // Lets verify/webhook confirm this reservation; if it fails they record the use themselves
      await discountService.attachOrder(discount.reservationId, paymentOrder.id)
        .catch((e) => console.error('Could not link discount reservation to order:', e))
    }

    return NextResponse.json({
      success: true,
      order: {
        id: paymentOrder.id,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        receipt: paymentOrder.receipt
      },
      plan: {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        priceDisplay: plan.priceDisplay
      },
      discount: discount
        ? {
            code: discount.code.code,
            originalAmount: discount.originalAmount,
            discountAmount: discount.discountAmount,
            finalAmount: discount.finalAmount
          }
        : null,
      // The discount's use is reserved only for a limited time
      checkoutTimeoutSeconds: discount ? CHECKOUT_TIMEOUT_SECONDS : null,
      razorpayKeyId: getRazorpayCredentials().keyId
    })

  } catch (error) {
    console.error("Error creating payment order:", error)
    return NextResponse.json(
      { error: "Failed to create payment order" },
      { status: 500 }
    )
  }
}