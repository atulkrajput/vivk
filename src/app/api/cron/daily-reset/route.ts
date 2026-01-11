import { NextRequest, NextResponse } from "next/server"
import { resetDailyUsageCounters, formatISTTime } from "@/lib/cron"

// POST /api/cron/daily-reset - Reset daily usage counters (called by cron job)
export async function POST(request: NextRequest) {
  try {
    // Verify the request is from a trusted source (in production, use proper authentication)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.log(`Daily reset triggered at ${formatISTTime()}`)
    
    await resetDailyUsageCounters()
    
    return NextResponse.json({
      success: true,
      message: "Daily usage counters reset successfully",
      timestamp: formatISTTime()
    })
    
  } catch (error) {
    console.error("Error in daily reset cron job:", error)
    return NextResponse.json(
      { 
        error: "Failed to reset daily usage counters",
        timestamp: formatISTTime()
      },
      { status: 500 }
    )
  }
}

// GET /api/cron/daily-reset - Health check for cron job
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    message: "Daily reset cron job endpoint is active",
    timestamp: formatISTTime()
  })
}