/**
 * Main Health Check Endpoint for VIVK MVP
 * 
 * Provides comprehensive health status of all system components
 */

import { NextRequest, NextResponse } from 'next/server'
import { monitoring } from '@/lib/monitoring'
import { isMaintenanceMode, getMaintenanceMessage } from '@/lib/error-handling'

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    
    // Check if in maintenance mode
    if (isMaintenanceMode()) {
      return NextResponse.json(
        {
          status: 'maintenance',
          message: getMaintenanceMessage(),
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      )
    }
    
    // Perform comprehensive health check
    const healthStatus = await monitoring.performHealthCheck()
    
    const duration = Date.now() - startTime
    
    // Record health check performance
    monitoring.recordMetric({
      name: 'health_check_duration',
      value: duration,
      tags: {
        status: healthStatus.status
      }
    })

    // Determine HTTP status code based on health
    let statusCode = 200
    if (healthStatus.status === 'degraded') {
      statusCode = 206 // Partial Content
    } else if (healthStatus.status === 'unhealthy') {
      statusCode = 503 // Service Unavailable
    }

    const response = {
      ...healthStatus,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      duration_ms: duration
    }

    return NextResponse.json(response, { status: statusCode })

  } catch (error) {
    console.error('Health check failed:', error)
    
    monitoring.reportError({
      error: error instanceof Error ? error : new Error('Health check failed'),
      context: {
        endpoint: '/api/health',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date()
    })

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: {
        database: false,
        redis: false,
        ai_providers: false,
        payment_gateway: false
      }
    }, { status: 503 })
  }
}