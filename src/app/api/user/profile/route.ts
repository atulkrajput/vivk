import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { userDb } from '@/lib/db'
import { UserCacheService } from '@/lib/redis'
import { 
  createErrorResponse, 
  VivkError, 
  ErrorCode, 
  ErrorSeverity,
  withRetry,
  circuitBreakers,
  handleSessionExpiration,
  handleDatabaseError
} from '@/lib/error-handling'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return handleSessionExpiration()
    }

    // Try to get user profile from cache first
    let user = await UserCacheService.getUserProfile(session.user.id)
    
    if (!user) {
      // Cache miss - get from database with circuit breaker and retry logic
      user = await circuitBreakers.database.execute(async () => {
        return await withRetry(async () => {
          const userData = await userDb.getById(session.user.id)
          
          if (!userData) {
            throw new VivkError(
              ErrorCode.RESOURCE_NOT_FOUND,
              'User not found',
              'Your account information could not be found. Please try signing in again.',
              ErrorSeverity.HIGH
            )
          }
          
          return userData
        }, 2)
      })
      
      // Cache the user profile for future requests
      await UserCacheService.cacheUserProfile(session.user.id, user)
    }

    // Return safe user data (exclude sensitive fields)
    const userProfile = {
      id: user.id,
      email: user.email,
      email_verified: user.email_verified,
      subscription_tier: user.subscription_tier,
      created_at: user.created_at,
      updated_at: user.updated_at
    }

    return NextResponse.json({
      user: userProfile
    })

  } catch (error) {
    return createErrorResponse(error as Error, { 
      endpoint: 'user-profile',
      userId: (await auth())?.user?.id 
    })
  }
}