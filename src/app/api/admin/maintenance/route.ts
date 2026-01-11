import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { setMaintenanceMode, isMaintenanceMode, getMaintenanceMessage } from '@/lib/error-handling'
import { createErrorResponse, VivkError, ErrorCode, ErrorSeverity } from '@/lib/error-handling'
import { z } from 'zod'

// Validation schema for maintenance mode settings
const maintenanceSchema = z.object({
  enabled: z.boolean(),
  message: z.string().optional(),
  estimatedTime: z.string().optional()
})

// GET /api/admin/maintenance - Get maintenance mode status
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    // For MVP, we'll use a simple admin check
    // In production, you'd have proper admin role checking
    if (!session?.user?.email?.endsWith('@vivk.in')) {
      throw new VivkError(
        ErrorCode.UNAUTHORIZED,
        'Admin access required',
        'You do not have permission to access this resource.',
        ErrorSeverity.MEDIUM
      )
    }

    return NextResponse.json({
      enabled: isMaintenanceMode(),
      message: getMaintenanceMessage(),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return createErrorResponse(error as Error, { endpoint: 'admin-maintenance-get' })
  }
}

// POST /api/admin/maintenance - Set maintenance mode
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    // Admin access check
    if (!session?.user?.email?.endsWith('@vivk.in')) {
      throw new VivkError(
        ErrorCode.UNAUTHORIZED,
        'Admin access required',
        'You do not have permission to access this resource.',
        ErrorSeverity.MEDIUM
      )
    }

    const body = await request.json()
    const { enabled, message, estimatedTime } = maintenanceSchema.parse(body)

    // Set maintenance mode
    setMaintenanceMode(enabled, message)

    // Log the change
    console.log('Maintenance mode changed:', {
      enabled,
      message,
      estimatedTime,
      changedBy: session.user.email,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      enabled,
      message: message || getMaintenanceMessage(),
      estimatedTime,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return createErrorResponse(error as Error, { endpoint: 'admin-maintenance-post' })
  }
}