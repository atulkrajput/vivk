/**
 * Database Health Check Endpoint
 * 
 * Verifies database connectivity and basic operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Check if this is a health check request
    const isHealthCheck = request.headers.get('x-health-check') === 'true'
    
    if (!isHealthCheck) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Test basic database connectivity
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (error) {
      throw error
    }

    // Test write operation (create a health check record)
    const { error: insertError } = await supabase
      .from('system_logs')
      .insert({
        event_type: 'health_check',
        message: 'Database health check successful',
        metadata: {
          timestamp: new Date().toISOString(),
          check_type: 'database'
        }
      })

    if (insertError) {
      console.warn('Health check log insertion failed:', insertError)
      // Don't fail the health check for logging issues
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        connectivity: true,
        read_operation: true,
        write_operation: !insertError
      }
    })

  } catch (error) {
    console.error('Database health check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: {
        connectivity: false,
        read_operation: false,
        write_operation: false
      }
    }, { status: 503 })
  }
}