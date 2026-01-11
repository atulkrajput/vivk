import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { z } from "zod"
import { userDb } from "@/lib/db"
import { validateAndSanitizeEmail, validatePassword, logSecureError, sanitizeInput } from "@/lib/security"

// Enhanced validation schema for registration
const registerSchema = z.object({
  email: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
  confirmPassword: z.string().min(1, "Password confirmation is required")
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Basic validation
    const validatedBody = registerSchema.parse(body)
    const { email, password, confirmPassword } = validatedBody
    
    // Validate and sanitize email using security utilities
    let sanitizedEmail: string
    try {
      sanitizedEmail = validateAndSanitizeEmail(email)
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }
    
    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.errors[0] },
        { status: 400 }
      )
    }
    
    // Check password confirmation
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords don't match" },
        { status: 400 }
      )
    }
    
    // Check if user already exists
    const existingUser = await userDb.getByEmail(sanitizedEmail)
    if (existingUser) {
      // Don't reveal that user exists for security reasons
      return NextResponse.json(
        { error: "Registration failed. Please check your information and try again." },
        { status: 400 }
      )
    }
    
    // Hash password with high salt rounds for security
    const passwordHash = await hash(password, 12)
    
    // Create user
    const user = await userDb.create({
      email: sanitizedEmail,
      password_hash: passwordHash,
      email_verified: false, // Will be verified via email
      subscription_tier: 'free',
      subscription_status: 'active'
    })
    
    if (!user) {
      logSecureError(new Error("Failed to create user"), { email: sanitizedEmail })
      return NextResponse.json(
        { error: "Failed to create account. Please try again." },
        { status: 500 }
      )
    }
    
    // TODO: Send verification email
    // For MVP, we'll skip email verification and set it to true
    await userDb.update(user.id, { email_verified: true })
    
    return NextResponse.json({
      success: true,
      message: "Account created successfully! You can now sign in.",
      user: {
        id: user.id,
        email: user.email,
        subscriptionTier: user.subscription_tier
      }
    })
    
  } catch (error) {
    logSecureError(error as Error, { endpoint: "register" })
    
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