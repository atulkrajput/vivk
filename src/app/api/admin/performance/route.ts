import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin"
import { PerformanceDashboard } from "@/lib/performance-monitoring"
import { withRateLimit, getClientIdentifier } from "@/lib/rate-limiting"
import { logSecureError } from "@/lib/security"

// GET /api/admin/performance - Get performance metrics (admin only)
async function getPerformanceMetrics(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const since = searchParams.get('since')
    const sinceTime = since ? parseInt(since) : undefined
    
    const overview = await PerformanceDashboard.getOverview(sinceTime)
    const alerts = PerformanceDashboard.getAlerts(sinceTime)
    
    return NextResponse.json({
      success: true,
      data: {
        overview,
        alerts,
        timestamp: Date.now()
      }
    })
    
  } catch (error) {
    logSecureError(error as Error, {
      context: 'performance_metrics_fetch',
      userId: 'admin'
    })
    
    return NextResponse.json(
      { error: "Failed to fetch performance metrics" },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(
  'ADMIN',
  (request: NextRequest) => getClientIdentifier(request)
)(getPerformanceMetrics)
