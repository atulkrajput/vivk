import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { z } from "zod"
import { userDb } from "@/lib/db"

// Validation schema for password update
const updatePasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

// Import the reset tokens from the reset-password route
// In production, this would be stored in database or Redis
const resetTokens = new Map<string, { userId: string, expires: Date }>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const { token, password } = updatePasswordSchema.parse(body)
    
    // Verify token
    const tokenData = resetTokens.get(token)
    if (!tokenData || tokenData.expires < new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      )
    }
    
    // Hash new password
    const passwordHash = await hash(password, 12)
    
    // Update user password
    const updatedUser = await userDb.update(tokenData.userId, {
      password_hash: passwordHash
    })
    
    if (!updatedUser) {
      return NextResponse.json(
        { error: "Failed to update password. Please try again." },
        { status: 500 }
      )
    }
    
    // Remove used token
    resetTokens.delete(token)
    
    return NextResponse.json({
      success: true,
      message: "Password updated successfully! You can now sign in with your new password."
    })
    
  } catch (error) {
    console.error("Password update error:", error)
    
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