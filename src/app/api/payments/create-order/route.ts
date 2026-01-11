import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { paymentService, paymentUtils } from "@/lib/payments"
import { SUBSCRIPTION_PLANS, type SubscriptionTier } from "@/lib/subscriptions"

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
    const { subscriptionTier } = body

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

    // Create payment order
    const receipt = paymentUtils.generateReceiptId(session.user.id, subscriptionTier)
    const paymentOrder = await paymentService.createPaymentOrder(
      session.user.id,
      plan.price, // Amount in paise
      'INR',
      receipt
    )

    if (!paymentOrder) {
      return NextResponse.json(
        { error: "Failed to create payment order" },
        { status: 500 }
      )
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
      razorpayKeyId: process.env.RAZORPAY_KEY_ID
    })

  } catch (error) {
    console.error("Error creating payment order:", error)
    return NextResponse.json(
      { error: "Failed to create payment order" },
      { status: 500 }
    )
  }
}