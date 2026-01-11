import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { usageDb, dbUtils } from "@/lib/db"
import { UserCacheService } from "@/lib/redis"
import { withRateLimit, getUserIdentifier } from "@/lib/rate-limiting"

// GET /api/usage - Get usage statistics for the current user
async function getUsage(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Try to get from cache first
    let cachedUsage = await UserCacheService.getUserUsage(session.user.id)
    
    if (cachedUsage) {
      return NextResponse.json({
        success: true,
        usage: cachedUsage.usage,
        limits: cachedUsage.limits,
        cached: true
      })
    }

    // Fetch from database if not cached
    const [usageStats, limitStatus] = await Promise.all([
      usageDb.getUsageStats(session.user.id),
      dbUtils.getUsageLimitStatus(session.user.id)
    ])
    
    const result = {
      usage: usageStats,
      limits: limitStatus
    }

    // Cache the result
    await UserCacheService.cacheUserUsage(session.user.id, result)
    
    return NextResponse.json({
      success: true,
      ...result,
      cached: false
    })
    
  } catch (error) {
    console.error("Error fetching usage statistics:", error)
    return NextResponse.json(
      { error: "Failed to fetch usage statistics" },
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
)(getUsage)