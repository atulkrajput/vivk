import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { discountService, DiscountError } from "@/lib/discounts"
import { paymentUtils } from "@/lib/payments"
import { type SubscriptionTier } from "@/lib/subscriptions"

// POST /api/payments/discount - Preview a discount code for a plan before checkout
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { code, subscriptionTier } = await request.json()
    if (!subscriptionTier || !['pro', 'business'].includes(subscriptionTier)) {
      return NextResponse.json({ error: "Invalid subscription tier" }, { status: 400 })
    }
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: "Enter a discount code" }, { status: 400 })
    }

    const applied = await discountService.apply(code, session.user.id, subscriptionTier as SubscriptionTier)
    return NextResponse.json({
      success: true,
      code: applied.code.code,
      discountType: applied.code.discount_type,
      discountValue: applied.code.discount_value,
      originalAmount: applied.originalAmount,
      discountAmount: applied.discountAmount,
      finalAmount: applied.finalAmount,
      finalAmountDisplay: paymentUtils.formatAmount(applied.finalAmount),
    })
  } catch (error) {
    if (error instanceof DiscountError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("Error validating discount code:", error)
    return NextResponse.json({ error: "Could not check this discount code" }, { status: 500 })
  }
}
