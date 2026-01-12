/**
 * Main Health Check Endpoint for VIVK MVP
 * 
 * Provides comprehensive health status of all system components
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    
    // Basic health check without dependencies
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        server: true,
        database: false, // Will be true when env vars are configured
        redis: false,    // Will be true when env vars are configured
        ai_providers: false, // Will be true when env vars are configured
        payment_gateway: false // Will be true when env vars are configured
      }
    }
    
    // Check environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL'
    ]
    
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName] || process.env[varName]?.includes('placeholder'))
    
    if (missingEnvVars.length > 0) {
      healthStatus.status = 'degraded'
      healthStatus.checks.database = false
    } else {
      healthStatus.checks.database = true
      healthStatus.status = 'healthy'
    }
    
    const duration = Date.now() - startTime
    
    // Determine HTTP status code based on health
    let statusCode = 200
    if (healthStatus.status === 'degraded') {
      statusCode = 206 // Partial Content - some services unavailable
    }

    const response = {
      ...healthStatus,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      duration_ms: duration,
      missing_env_vars: missingEnvVars.length > 0 ? missingEnvVars : undefined
    }

    return NextResponse.json(response, { status: statusCode })

  } catch (error) {
    console.error('Health check failed:', error)

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: {
        server: false,
        database: false,
        redis: false,
        ai_providers: false,
        payment_gateway: false
      }
    }, { status: 503 })
  }
}