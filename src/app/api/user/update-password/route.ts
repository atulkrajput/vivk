import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { userDb } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { validatePassword, logSecureError } from '@/lib/security'

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
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      )
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.errors[0] },
        { status: 400 }
      )
    }

    // Get current user
    const user = await userDb.getById(session.user.id)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!isCurrentPasswordValid) {
      logSecureError(new Error('Invalid current password attempt'), { 
        userId: session.user.id 
      })
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password_hash)
    if (isSamePassword) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      )
    }

    // Hash new password with high salt rounds
    const saltRounds = 12
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds)

    // Update password
    const updatedUser = await userDb.update(session.user.id, {
      password_hash: newPasswordHash
    })

    if (!updatedUser) {
      logSecureError(new Error('Failed to update password'), { 
        userId: session.user.id 
      })
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    })

  } catch (error) {
    logSecureError(error as Error, { endpoint: 'update-password' })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}