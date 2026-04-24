import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { userDb } from "@/lib/db"
import { sendPasswordResetEmail } from "@/lib/email"
import { nanoid } from "nanoid"

const resetRequestSchema = z.object({
  email: z.string().email("Invalid email address")
})

// In-memory store for reset tokens
// Exported so update-password route can access it
export const resetTokens = new Map<string, { userId: string, expires: Date }>()

// Clean up expired tokens periodically
function cleanExpiredTokens() {
  const now = new Date()
  for (const [token, data] of resetTokens.entries()) {
    if (data.expires < now) resetTokens.delete(token)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = resetRequestSchema.parse(body)
    
    // Always return success to not reveal if email exists
    const successResponse = {
      success: true,
      message: "If an account with this email exists, you will receive a password reset link."
    }

    const user = await userDb.getByEmail(email)
    if (!user) {
      return NextResponse.json(successResponse)
    }

    // Clean old tokens
    cleanExpiredTokens()

    // Generate reset token
    const resetToken = nanoid(32)
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    resetTokens.set(resetToken, { userId: user.id, expires })

    const resetLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
    
    // Send the reset email
    const emailSent = await sendPasswordResetEmail(
      email,
      user.full_name || email.split('@')[0],
      resetLink
    )

    if (!emailSent) {
      console.error('Failed to send reset email to:', email.substring(0, 3) + '***')
    }

    // In development, also log the link
    if (process.env.NODE_ENV === 'development') {
      console.log(`Password reset link for ${email}: ${resetLink}`)
    }

    return NextResponse.json(successResponse)
    
  } catch (error) {
    console.error("Password reset request error:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    )
  }
}

// Verify reset token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    
    if (!token) {
      return NextResponse.json(
        { error: "Reset token is required" },
        { status: 400 }
      )
    }
    
    const tokenData = resetTokens.get(token)
    if (!tokenData || tokenData.expires < new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: "Valid reset token"
    })
    
  } catch (error) {
    console.error("Token verification error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
