import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { z } from "zod"
import { userDb, validateEnvironment } from "@/lib/db"

// Enhanced validation schema for registration
const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  confirmPassword: z.string().min(1, "Password confirmation is required")
})

export async function POST(request: NextRequest) {
  try {
    // Check if environment is properly configured
    const envCheck = validateEnvironment()
    if (!envCheck.isValid) {
      console.error('Environment variables not configured:', envCheck.missingVars)
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again later." },
        { status: 503 }
      )
    }

    const body = await request.json()
    
    // Basic validation
    const validatedBody = registerSchema.parse(body)
    const { email, password, confirmPassword } = validatedBody
    
    // Check password confirmation
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords don't match" },
        { status: 400 }
      )
    }
    
    // Basic email sanitization
    const sanitizedEmail = email.toLowerCase().trim()
    
    // Check if user already exists
    try {
      const existingUser = await userDb.getByEmail(sanitizedEmail)
      if (existingUser) {
        return NextResponse.json(
          { error: "An account with this email already exists." },
          { status: 400 }
        )
      }
    } catch (dbError) {
      console.error('Database error during user check:', dbError)
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again later." },
        { status: 503 }
      )
    }
    
    // Hash password
    const passwordHash = await hash(password, 12)
    
    // Create user
    try {
      const user = await userDb.create({
        email: sanitizedEmail,
        password_hash: passwordHash,
        email_verified: true, // For MVP, skip email verification
        subscription_tier: 'free',
        subscription_status: 'active'
      })
      
      if (!user) {
        throw new Error('Failed to create user')
      }
      
      return NextResponse.json({
        success: true,
        message: "Account created successfully! You can now sign in.",
        user: {
          id: user.id,
          email: user.email,
          subscriptionTier: user.subscription_tier
        }
      })
    } catch (dbError) {
      console.error('Database error during user creation:', dbError)
      return NextResponse.json(
        { error: "Failed to create account. Please try again later." },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('Registration error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    )
  }
}