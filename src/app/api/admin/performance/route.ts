import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { PerformanceDashboard, PerformanceMonitor } from "@/lib/performance-monitoring"
import { withRateLimit, getClientIdentifier } from "@/lib/rate-limiting"
import { logSecureError } from "@/lib/security"

// GET /api/admin/performance - Get performance metrics (admin only)
async function getPerformanceMetrics(request: NextRequest) {
  try {
    const session = await auth()
    
    // Check if user is admin (you'll need to implement admin role checking)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }
    
    // For now, allow any authenticated user - in production, add admin role check
    // if (session.user.role !== 'admin') {
    //   return NextResponse.json(
    //     { error: "Admin access required" },
    //     { status: 403 }
    //   )
    // }
    
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
      userId: (await auth())?.user?.id
    })
    
    return NextResponse.json(
      { error: "Failed to fetch performance metrics" },
      { status: 500 }
    )
  }
}

// POST /api/admin/performance - Record client-side performance metrics
async function recordPerformanceMetric(request: NextRequest) {
  try {
    const session = await auth()
    const body = await request.json()
    
    const { type, name, value, tags, url } = body
    
    if (!type || !name || typeof value !== 'number') {
      return NextResponse.json(
        { error: "Invalid metric data" },
        { status: 400 }
      )
    }
    
    // Record the metric
    PerformanceMonitor.recordMetric({
      name: `client_${name}`,
      value,
      tags: {
        ...tags,
        type,
        url,
        userId: session?.user?.id || 'anonymous'
      }
    })
    
    return NextResponse.json({
      success: true,
      message: "Metric recorded"
    })
    
  } catch (error) {
    logSecureError(error as Error, {
      context: 'performance_metric_record',
      userId: (await auth())?.user?.id
    })
    
    return NextResponse.json(
      { error: "Failed to record metric" },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(
  'ADMIN',
  (request: NextRequest) => getClientIdentifier(request)
)(getPerformanceMetrics)

export const POST = withRateLimit(
  'API',
  (request: NextRequest) => getClientIdentifier(request)
)(recordPerformanceMetric)