import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin'

// Admin-only: reports which env vars are set, never any part of their values
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 })
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
      length: value?.length || 0
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