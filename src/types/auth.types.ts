export interface AuthResult {
  success: boolean
  user?: {
    id: string
    email: string
    subscriptionTier: 'free' | 'pro' | 'business'
  }
  error?: string
}

export interface SessionUser {
  id: string
  email: string
  subscriptionTier: 'free' | 'pro' | 'business'
  subscriptionStatus: 'active' | 'cancelled' | 'expired'
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  confirmPassword: string
}