import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { dbUtils } from "@/lib/db"

// GET /api/chat/analytics - Get conversation analytics for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const analytics = await dbUtils.getConversationAnalytics(session.user.id)
    
    return NextResponse.json({
      success: true,
      analytics
    })
    
  } catch (error) {
    console.error("Error fetching analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    )
  }
}