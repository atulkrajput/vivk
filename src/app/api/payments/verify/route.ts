import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { paymentService } from "@/lib/payments"
import { type SubscriptionTier } from "@/lib/subscriptions"

// POST /api/payments/verify - Verify payment and upgrade subscription
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
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      subscription_tier 
    } = body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !subscription_tier) {
      return NextResponse.json(
        { error: "Missing required payment verification data" },
        { status: 400 }
      )
    }

    if (!['pro', 'business'].includes(subscription_tier)) {
      return NextResponse.json(
        { error: "Invalid subscription tier" },
        { status: 400 }
      )
    }

    // Handle payment success
    const success = await paymentService.handlePaymentSuccess(
      session.user.id,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      subscription_tier as SubscriptionTier
    )

    if (!success) {
      return NextResponse.json(
        { error: "Payment verification failed" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Payment successful! Your subscription has been upgraded to ${subscription_tier}.`,
      subscription: {
        tier: subscription_tier,
        status: 'active'
      }
    })

  } catch (error) {
    console.error("Error verifying payment:", error)
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    )
  }
}