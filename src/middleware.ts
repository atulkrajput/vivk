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

  // Public routes - no auth needed
  const publicRoutes = ['/', '/landing', '/login', '/register', '/reset-password', '/maintenance']
  const publicApiRoutes = ['/api/auth', '/api/health', '/api/debug', '/api/payments/webhook']

  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))
  const isPublicApiRoute = publicApiRoutes.some(route => pathname.startsWith(route))
  const isStaticAsset = pathname.startsWith('/_next') || pathname.includes('.')

  // Skip middleware for static assets
  if (isStaticAsset) return NextResponse.next()

  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    const limit = pathname.startsWith('/api/auth/') ? 10 : 60
    const window = pathname.startsWith('/api/auth/') ? 60000 : 60000

    if (!checkRateLimit(`${clientIP}:${pathname.split('/').slice(0, 3).join('/')}`, limit, window)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }
  }

  // Allow public routes
  if (isPublicRoute || isPublicApiRoute) return NextResponse.next()

  // For protected routes, check for session token
  const sessionToken = request.cookies.get('next-auth.session-token')?.value ||
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