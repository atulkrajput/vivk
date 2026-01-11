import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { userDb } from '@/lib/db'
import { validateAndSanitizeEmail, logSecureError } from '@/lib/security'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { newEmail } = body

    if (!newEmail || typeof newEmail !== 'string') {
      return NextResponse.json(
        { error: 'New email is required' },
        { status: 400 }
      )
    }

    // Validate and sanitize email
    let sanitizedEmail: string
    try {
      sanitizedEmail = validateAndSanitizeEmail(newEmail)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if email is already in use
    const existingUser = await userDb.getByEmail(sanitizedEmail)
    if (existingUser && existingUser.id !== session.user.id) {
      return NextResponse.json(
        { error: 'Email is already in use' },
        { status: 400 }
      )
    }

    // Update user email
    const updatedUser = await userDb.update(session.user.id, {
      email: sanitizedEmail,
      email_verified: false // Reset email verification
    })

    if (!updatedUser) {
      logSecureError(new Error('Failed to update email'), { 
        userId: session.user.id,
        newEmail: sanitizedEmail 
      })
      return NextResponse.json(
        { error: 'Failed to update email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Email updated successfully'
    })

  } catch (error) {
    logSecureError(error as Error, { endpoint: 'update-email' })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}