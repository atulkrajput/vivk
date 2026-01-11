/**
 * Payment Gateway Health Check Endpoint
 * 
 * Verifies Razorpay connectivity and basic operations
 */

import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'

export async function GET(request: NextRequest) {
  try {
    // Check if this is a health check request
    const isHealthCheck = request.headers.get('x-health-check') === 'true'
    
    if (!isHealthCheck) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Razorpay credentials not configured',
        checks: {
          credentials: false,
          connectivity: false,
          api_access: false
        }
      }, { status: 503 })
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })

    const checks = {
      credentials: true,
      connectivity: false,
      api_access: false
    }

    // Test API connectivity by fetching payment methods
    try {
      // This is a simple API call that doesn't create any resources
      const response = await fetch('https://api.razorpay.com/v1/methods', {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        checks.connectivity = true
        checks.api_access = true
      } else if (response.status === 401) {
        checks.connectivity = true
        checks.api_access = false
      }
    } catch (error) {
      console.warn('Razorpay connectivity test failed:', error)
    }

    // Alternative test: Try to fetch orders (this requires valid credentials)
    if (!checks.api_access) {
      try {
        await razorpay.orders.all({ count: 1 })
        checks.connectivity = true
        checks.api_access = true
      } catch (error: any) {
        checks.connectivity = true
        // If we get a 401, credentials are wrong
        // If we get other errors, API might be accessible but we don't have permissions
        if (error.statusCode !== 401) {
          checks.api_access = true
        }
      }
    }

    const isHealthy = checks.credentials && checks.connectivity && checks.api_access

    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
      summary: {
        payment_gateway: 'Razorpay',
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'test'
      }
    }, { 
      status: isHealthy ? 200 : 503 
    })

  } catch (error) {
    console.error('Payment gateway health check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: {
        credentials: false,
        connectivity: false,
        api_access: false
      }
    }, { status: 503 })
  }
}