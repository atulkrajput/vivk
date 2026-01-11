import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      emailVerified: boolean
      subscriptionTier: 'free' | 'pro' | 'business'
      subscriptionStatus: 'active' | 'cancelled' | 'expired' | 'pending'
    }
  }

  interface User {
    id: string
    email: string
    emailVerified: boolean
    subscriptionTier: 'free' | 'pro' | 'business'
    subscriptionStatus: 'active' | 'cancelled' | 'expired' | 'pending'
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    subscriptionTier: 'free' | 'pro' | 'business'
    subscriptionStatus: 'active' | 'cancelled' | 'expired' | 'pending'
  }
}