import { NextRequest, NextResponse } from "next/server"
import { SUBSCRIPTION_PLANS, getAllPlans, getPaidPlans } from "@/lib/subscriptions"

// GET /api/subscriptions/plans - Get all available subscription plans
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paidOnly = searchParams.get('paid') === 'true'
    
    const plans = paidOnly ? getPaidPlans() : getAllPlans()
    
    return NextResponse.json({
      success: true,
      plans,
      currency: 'INR'
    })
    
  } catch (error) {
    console.error("Error fetching subscription plans:", error)
    return NextResponse.json(
      { error: "Failed to fetch subscription plans" },
      { status: 500 }
    )
  }
}