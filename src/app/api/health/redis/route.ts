/**
 * Redis Health Check Endpoint
 * 
 * Verifies Redis connectivity and basic operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export async function GET(request: NextRequest) {
  try {
    // Check if this is a health check request
    const isHealthCheck = request.headers.get('x-health-check') === 'true'
    
    if (!isHealthCheck) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })

    // Test basic Redis connectivity with ping
    const pingResult = await redis.ping()
    
    if (pingResult !== 'PONG') {
      throw new Error('Redis ping failed')
    }

    // Test write operation
    const testKey = `health_check:${Date.now()}`
    const testValue = 'health_check_value'
    
    await redis.set(testKey, testValue, { ex: 60 }) // Expire in 60 seconds
    
    // Test read operation
    const retrievedValue = await redis.get(testKey)
    
    if (retrievedValue !== testValue) {
      throw new Error('Redis read/write test failed')
    }

    // Clean up test key
    await redis.del(testKey)

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        connectivity: true,
        ping: true,
        read_operation: true,
        write_operation: true
      }
    })

  } catch (error) {
    console.error('Redis health check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: {
        connectivity: false,
        ping: false,
        read_operation: false,
        write_operation: false
      }
    }, { status: 503 })
  }
}