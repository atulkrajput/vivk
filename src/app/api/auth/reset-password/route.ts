import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { userDb } from "@/lib/db"
import { nanoid } from "nanoid"

// Validation schema for password reset request
const resetRequestSchema = z.object({
  email: z.string().email("Invalid email address")
})

// In-memory store for reset tokens (in production, use Redis or database)
const resetTokens = new Map<string, { userId: string, expires: Date }>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const { email } = resetRequestSchema.parse(body)
    
    // Check if user exists
    const user = await userDb.getByEmail(email)
    if (!user) {
      // Don't reveal if email exists or not for security
      return NextResponse.json({
        success: true,
        message: "If an account with this email exists, you will receive a password reset link."
      })
    }
    
    // Generate reset token
    const resetToken = nanoid(32)
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    
    // Store token (in production, store in database or Redis)
    resetTokens.set(resetToken, {
      userId: user.id,
      expires
    })
    
    // TODO: Send reset email with token
    // For MVP, we'll log the reset link
    const resetLink = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`
    console.log(`Password reset link for ${email}: ${resetLink}`)
    
    return NextResponse.json({
      success: true,
      message: "If an account with this email exists, you will receive a password reset link.",
      // For development only - remove in production
      resetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined
    })
    
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