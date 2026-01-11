import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { applySecurityHeaders, validateRequestOrigin, logSecureError } from '@/lib/security'
import { isMaintenanceMode, getMaintenanceMessage } from '@/lib/error-handling'
import { 
  rateLimitMiddleware, 
  getClientIdentifier, 
  getUserIdentifier,
  type RateLimitType 
} from '@/lib/rate-limiting'

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limiting function (fallback for when Redis is unavailable)
function checkRateLimit(identifier: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const key = identifier
  const record = rateLimitStore.get(key)
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (record.count >= limit) {
    return false
  }
  
  record.count++
  return true
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const clientIP = getClientIdentifier(request)
  
  try {
    // Check maintenance mode first (except for health check and admin endpoints)
    if (isMaintenanceMode() && 
        !pathname.startsWith('/api/health') && 
        !pathname.startsWith('/api/admin/maintenance')) {
      
      // For API routes, return JSON error
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          {
            error: getMaintenanceMessage(),
            code: 'MAINTENANCE_MODE',
            retryable: true,
            timestamp: new Date().toISOString()
          },
          { status: 503 }
        )
      }
      
      // For web routes, redirect to maintenance page
      const maintenanceUrl = new URL('/maintenance', request.url)
      return NextResponse.redirect(maintenanceUrl)
    }

    // Create response with security headers
    let response = NextResponse.next()
    response = applySecurityHeaders(response)
    
    // Validate request origin for state-changing operations
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      if (!validateRequestOrigin(request)) {
        logSecureError(new Error('Invalid request origin'), {
          method: request.method,
          pathname,
          origin: request.headers.get('origin'),
          referer: request.headers.get('referer')
        })
        return new NextResponse('Forbidden', { status: 403 })
      }
    }
    
    // Public routes that don't require authentication
    const publicRoutes = [
      '/',
      '/landing',
      '/auth/login',
      '/auth/register',
      '/auth/reset-password',
      '/auth/error',
      '/maintenance'
    ]
    
    // API routes that don't require authentication
    const publicApiRoutes = [
      '/api/auth',
      '/api/health',
      '/api/payments/webhook' // Webhook needs special handling
    ]
    
    // Check if route is public
    const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route))
    const isPublicApiRoute = publicApiRoutes.some(route => pathname.startsWith(route))
    
    // Apply Redis-based rate limiting based on route type
    let rateLimitResponse: NextResponse | null = null
    
    if (pathname.startsWith('/api/auth/')) {
      // Stricter rate limiting for auth endpoints
      rateLimitResponse = await rateLimitMiddleware(request, clientIP, 'AUTH')
    } else if (pathname.startsWith('/api/payments/')) {
      // Rate limiting for payment endpoints
      rateLimitResponse = await rateLimitMiddleware(request, clientIP, 'PAYMENT')
    } else if (pathname.startsWith('/api/admin/')) {
      // Rate limiting for admin endpoints
      rateLimitResponse = await rateLimitMiddleware(request, clientIP, 'ADMIN')
    } else if (pathname.startsWith('/api/')) {
      // General API rate limiting
      rateLimitResponse = await rateLimitMiddleware(request, clientIP, 'API')
    }
    
    // If rate limit exceeded, return the rate limit response
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    
    // Allow public routes
    if (isPublicRoute || isPublicApiRoute) {
      return response
    }
    
    // Check authentication for protected routes
    const session = await auth()
    
    // Redirect to login if not authenticated
    if (!session?.user) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          {
            error: 'Please sign in to access this resource.',
            code: 'UNAUTHORIZED',
            retryable: false,
            action: 'Sign in to your account',
            timestamp: new Date().toISOString()
          },
          { status: 401 }
        )
      }
      
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
    
    // Additional user-specific rate limiting for authenticated users
    if (session.user.id) {
      const userIdentifier = getUserIdentifier(session.user.id)
      
      if (pathname.startsWith('/api/chat/')) {
        // Chat-specific rate limiting based on subscription tier
        const rateLimitType: RateLimitType = session.user.subscriptionTier === 'free' ? 'CHAT_FREE' : 'CHAT_PRO'
        const chatRateLimitResponse = await rateLimitMiddleware(request, userIdentifier, rateLimitType)
        
        if (chatRateLimitResponse) {
          return chatRateLimitResponse
        }
      } else if (pathname.startsWith('/api/user/') || pathname.startsWith('/api/subscriptions/')) {
        // User API rate limiting
        const userApiRateLimitResponse = await rateLimitMiddleware(request, userIdentifier, 'USER_API')
        
        if (userApiRateLimitResponse) {
          return userApiRateLimitResponse
        }
      }
    }
    
    return response
    
  } catch (error) {
    logSecureError(error as Error, { pathname, method: request.method, clientIP })
    
    // Return appropriate error response
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        {
          error: 'Internal server error. Please try again.',
          code: 'INTERNAL_SERVER_ERROR',
          retryable: true,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }
    
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}