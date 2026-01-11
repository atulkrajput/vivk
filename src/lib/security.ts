// Security utilities for input validation, sanitization, and protection

import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

// Input validation schemas
export const securitySchemas = {
  // Email validation
  email: z.string()
    .email('Invalid email format')
    .min(5, 'Email must be at least 5 characters')
    .max(254, 'Email must not exceed 254 characters')
    .refine(email => !email.includes('<script'), 'Invalid email format'),

  // Password validation
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  // User input validation (messages, titles, etc.)
  userInput: z.string()
    .min(1, 'Input cannot be empty')
    .max(10000, 'Input must not exceed 10,000 characters')
    .refine(input => !containsMaliciousContent(input), 'Input contains potentially harmful content'),

  // Conversation title validation
  conversationTitle: z.string()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title must not exceed 200 characters')
    .refine(title => !containsMaliciousContent(title), 'Title contains potentially harmful content'),

  // Search query validation
  searchQuery: z.string()
    .max(500, 'Search query must not exceed 500 characters')
    .refine(query => !containsMaliciousContent(query), 'Search query contains potentially harmful content'),

  // UUID validation
  uuid: z.string().uuid('Invalid ID format'),

  // Pagination validation
  pagination: z.object({
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0)
  }),

  // Amount validation (for payments)
  amount: z.number()
    .min(1, 'Amount must be positive')
    .max(1000000, 'Amount exceeds maximum limit') // ₹10,000 max
}

// Check for malicious content patterns
function containsMaliciousContent(input: string): boolean {
  const maliciousPatterns = [
    // XSS patterns
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<link/gi,
    /<meta/gi,
    
    // SQL injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /('|(\\')|(;)|(--)|(\|)|(\*)|(%)|(\+))/gi,
    
    // Command injection patterns
    /(\b(eval|exec|system|shell_exec|passthru|file_get_contents)\b)/gi,
    /(&&|\|\|)/gi,
    
    // Path traversal patterns
    /\.\.\//gi,
    /\.\.\\/gi,
  ]

  return maliciousPatterns.some(pattern => pattern.test(input))
}

// Sanitize HTML content (server-safe version)
export function sanitizeHtml(input: string): string {
  // Remove HTML tags and potentially dangerous content
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
}

// Sanitize user input for database storage
export function sanitizeInput(input: string): string {
  // Remove null bytes and control characters
  let sanitized = input.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  
  // Sanitize HTML
  sanitized = sanitizeHtml(sanitized)
  
  // Trim whitespace
  sanitized = sanitized.trim()
  
  return sanitized
}

// Validate and sanitize email
export function validateAndSanitizeEmail(email: string): string {
  const sanitized = sanitizeInput(email.toLowerCase())
  const result = securitySchemas.email.safeParse(sanitized)
  
  if (!result.success) {
    throw new Error(`Invalid email: ${result.error.errors[0].message}`)
  }
  
  return result.data
}

// Validate password strength
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const result = securitySchemas.password.safeParse(password)
  
  if (result.success) {
    return { isValid: true, errors: [] }
  }
  
  return {
    isValid: false,
    errors: result.error.errors.map(err => err.message)
  }
}

// Validate and sanitize user input
export function validateAndSanitizeUserInput(input: string): string {
  const sanitized = sanitizeInput(input)
  const result = securitySchemas.userInput.safeParse(sanitized)
  
  if (!result.success) {
    throw new Error(`Invalid input: ${result.error.errors[0].message}`)
  }
  
  return result.data
}

// Rate limiting configuration
export const rateLimitConfig = {
  // General API rate limit
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Authentication rate limit (stricter)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 login attempts per windowMs
    message: 'Too many login attempts from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Chat/AI rate limit
  chat: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each user to 10 messages per minute
    message: 'Too many messages, please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Payment rate limit
  payment: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // limit each user to 10 payment attempts per hour
    message: 'Too many payment attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  }
}

// Security headers configuration
export const securityHeaders = {
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.anthropic.com https://api.razorpay.com",
    "frame-src 'self' https://api.razorpay.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; '),
  
  // Other security headers
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
}

// Apply security headers to response
export function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  return response
}

// Validate request origin (CSRF protection)
export function validateRequestOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const host = request.headers.get('host')
  
  // Allow same-origin requests
  if (origin && host) {
    const originUrl = new URL(origin)
    return originUrl.host === host
  }
  
  // Check referer as fallback
  if (referer && host) {
    const refererUrl = new URL(referer)
    return refererUrl.host === host
  }
  
  // Allow requests without origin/referer for API calls from server
  return true
}

// Generate secure random token
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}

// Hash sensitive data (for logging)
export function hashSensitiveData(data: string): string {
  // Simple hash for logging purposes (not cryptographic)
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16)
}

// Validate file upload (if needed in future)
export function validateFileUpload(file: File): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    errors.push('File size must not exceed 10MB')
  }
  
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    errors.push('File type not allowed')
  }
  
  // Check file name
  if (containsMaliciousContent(file.name)) {
    errors.push('File name contains invalid characters')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Error logging without sensitive data
export function logSecureError(error: Error, context: Record<string, any> = {}): void {
  const sanitizedContext = Object.entries(context).reduce((acc, [key, value]) => {
    // Hash sensitive fields
    if (['password', 'token', 'secret', 'key'].some(sensitive => key.toLowerCase().includes(sensitive))) {
      acc[key] = hashSensitiveData(String(value))
    } else if (typeof value === 'string' && value.length > 100) {
      // Truncate long strings
      acc[key] = value.substring(0, 100) + '...'
    } else {
      acc[key] = value
    }
    return acc
  }, {} as Record<string, any>)
  
  console.error('Security Error:', {
    message: error.message,
    stack: error.stack,
    context: sanitizedContext,
    timestamp: new Date().toISOString()
  })
}