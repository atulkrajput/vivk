import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory rate limiting for Edge Runtime
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(identifier: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)

  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= limit) return false
  record.count++
  return true
}

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') || 'unknown'
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const clientIP = getClientIP(request)

  // Skip static assets
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next()
  }

  // Public routes - no auth or rate limiting needed
  const isPublicPage = ['/', '/landing', '/login', '/register', '/reset-password', '/maintenance']
    .some(route => pathname === route)
  const isAuthApi = pathname.startsWith('/api/auth')
  const isPublicApi = pathname.startsWith('/api/health') || pathname.startsWith('/api/debug') || pathname.startsWith('/api/payments/webhook') || pathname.startsWith('/api/plans')

  // No rate limiting on auth API routes (NextAuth needs multiple calls)
  // Only rate limit non-auth API routes
  if (pathname.startsWith('/api/') && !isAuthApi && !isPublicApi) {
    if (!checkRateLimit(`${clientIP}:api`, 100, 60000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }
  }

  // Allow all public routes and auth API
  if (isPublicPage || isAuthApi || isPublicApi) {
    return NextResponse.next()
  }

  // Check for session token (NextAuth v5/Auth.js uses 'authjs.' prefix)
  const sessionToken = request.cookies.get('authjs.session-token')?.value ||
    request.cookies.get('__Secure-authjs.session-token')?.value ||
    request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value

  if (!sessionToken) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}