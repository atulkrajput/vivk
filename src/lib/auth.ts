import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { userDb } from "./db"
import { z } from "zod"

// Validation schemas
const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters")
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          // Validate input
          const { email, password } = signInSchema.parse(credentials)
          
          // Get user from database
          const user = await userDb.getByEmail(email)
          if (!user) {
            console.log('Auth: user not found for email')
            return null
          }
          
          // Verify password
          const isValidPassword = await compare(password, user.password_hash)
          if (!isValidPassword) {
            console.log('Auth: invalid password')
            return null
          }
          
          // Check if email is verified (MySQL returns 0/1 for TINYINT)
          const isVerified = user.email_verified === true || user.email_verified === 1 || user.email_verified as any === '1'
          if (!isVerified) {
            console.log('Auth: email not verified')
            throw new Error("Please verify your email before signing in")
          }
          
          console.log('Auth: login successful for user', user.id)
          
          // Return user object for session
          return {
            id: user.id,
            email: user.email,
            emailVerified: true,
            subscriptionTier: user.subscription_tier,
            subscriptionStatus: user.subscription_status
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      }
    })
  ],
  
  pages: {
    signIn: "/login",
    error: "/login"
  },
  
  callbacks: {
    async jwt({ token, user }) {
      // Add user info to JWT token
      if (user) {
        token.id = user.id
        token.subscriptionTier = user.subscriptionTier
        token.subscriptionStatus = user.subscriptionStatus
      }
      return token
    },
    
    async session({ session, token }) {
      // Add user info to session
      if (token) {
        session.user.id = token.id as string
        session.user.subscriptionTier = token.subscriptionTier as 'free' | 'pro' | 'business'
        session.user.subscriptionStatus = token.subscriptionStatus as 'active' | 'cancelled' | 'expired'
      }
      return session
    },
    
    async redirect({ url, baseUrl }) {
      // Redirect to dashboard after successful login
      if (url.startsWith("/")) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return `${baseUrl}/app`
    }
  },
  
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  secret: process.env.NEXTAUTH_SECRET,
})

// Helper function to get current session
export async function getCurrentUser() {
  const session = await auth()
  return session?.user || null
}

// Helper function to require authentication
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Authentication required")
  }
  return user
}