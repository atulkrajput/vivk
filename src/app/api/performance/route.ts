import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { PerformanceMonitor } from "@/lib/performance-monitoring"
import { withRateLimit, getClientIdentifier } from "@/lib/rate-limiting"
import { logSecureError } from "@/lib/security"

// POST /api/performance - Record client-side performance metrics
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

export const POST = withRateLimit(
  'API',
  (request: NextRequest) => getClientIdentifier(request)
)(recordPerformanceMetric)