import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Only allow in development or with special header
  const isDev = process.env.NODE_ENV === 'development'
  const debugHeader = request.headers.get('x-debug-key')
  
  if (!isDev && debugHeader !== 'vivk-debug-2026') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  const envVars = [
    'NODE_ENV',
    'DATABASE_URL',
    'DB_HOST',
    'DB_USER',
    'DB_NAME',
    'DB_PORT',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'ANTHROPIC_API_KEY',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET'
  ]

  const envStatus = envVars.reduce((acc, varName) => {
    const value = process.env[varName]
    acc[varName] = {
      exists: !!value,
      isPlaceholder: value?.includes('placeholder') || false,
      length: value?.length || 0,
      preview: value ? value.substring(0, 10) + '...' : 'undefined'
    }
    return acc
  }, {} as Record<string, any>)

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    variables: envStatus,
    summary: {
      total: envVars.length,
      configured: Object.values(envStatus).filter(v => v.exists && !v.isPlaceholder).length,
      placeholders: Object.values(envStatus).filter(v => v.isPlaceholder).length,
      missing: Object.values(envStatus).filter(v => !v.exists).length
    }
  })
}