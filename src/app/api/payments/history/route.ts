import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { paymentDb } from "@/lib/db"
import { paymentUtils } from "@/lib/payments"
import { CacheService, CACHE_KEYS, CACHE_TTL } from "@/lib/redis"
import { withRateLimit, getUserIdentifier } from "@/lib/rate-limiting"

// GET /api/payments/history - Get user's payment history
async function getPaymentHistory(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Try to get from cache first
    const cacheKey = `${CACHE_KEYS.PAYMENT_HISTORY}${session.user.id}`
    let cachedPayments = await CacheService.get(cacheKey)

    if (cachedPayments) {
      return NextResponse.json({
        success: true,
        ...cachedPayments,
        cached: true
      })
    }

    // Fetch from database if not cached
    const payments = await paymentDb.getByUserId(session.user.id)

    // Format payments for display
    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      amountDisplay: paymentUtils.formatAmount(payment.amount, payment.currency),
      currency: payment.currency,
      status: payment.status,
      razorpayPaymentId: payment.razorpay_payment_id,
      createdAt: payment.created_at,
      createdAtDisplay: new Date(payment.created_at).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }))

    const result = {
      payments: formattedPayments,
      totalPayments: payments.length,
      totalAmount: payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0)
    }

    // Cache the result
    await CacheService.set(cacheKey, result, CACHE_TTL.PAYMENT_HISTORY)

    return NextResponse.json({
      success: true,
      ...result,
      cached: false
    })

  } catch (error) {
    console.error("Error fetching payment history:", error)
    return NextResponse.json(
      { error: "Failed to fetch payment history" },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(
  'USER_API',
  async (request: NextRequest) => {
    const session = await auth()
    return session?.user?.id ? getUserIdentifier(session.user.id) : 'anonymous'
  }
)(getPaymentHistory)