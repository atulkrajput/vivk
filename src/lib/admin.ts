import { cookies } from 'next/headers'
import { compare } from 'bcryptjs'
import { redis } from '@/lib/redis'
import { ADMIN_COOKIE_NAME, verifyAdminToken, type AdminSession } from '@/lib/admin-session'

/**
 * Admin auth is fully separate from user (NextAuth) auth: admins sign in at /admin/login
 * with credentials from env and get their own signed cookie. A user session never grants
 * admin access, and an admin session is never seen by NextAuth.
 *
 * Env:
 *   ADMIN_EMAIL            - admin login email
 *   ADMIN_PASSWORD_HASH    - bcrypt hash, raw ($2a$...) or base64-encoded (see scripts/hash-admin-password.js)
 *   ADMIN_SESSION_SECRET   - 32+ char secret for signing the admin cookie, distinct from NEXTAUTH_SECRET
 */

// Dummy hash so a wrong email takes as long as a wrong password
const DUMMY_HASH = '$2a$12$Gp1Y/04IcgkygdvzdTiraeahvw6P0R6LyaU9zrQ.bI7tENYqyNnGi'

function getAdminPasswordHash(): string | null {
  const raw = process.env.ADMIN_PASSWORD_HASH?.trim()
  if (!raw) return null
  if (raw.startsWith('$2')) return raw
  // Base64 form avoids `$` being expanded by .env loaders
  const decoded = Buffer.from(raw, 'base64').toString('utf8').trim()
  return decoded.startsWith('$2') ? decoded : null
}

/**
 * Check admin credentials. Returns the canonical admin email on success.
 */
export async function verifyAdminCredentials(email: string, password: string): Promise<string | null> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const hash = getAdminPasswordHash()
  if (!adminEmail || !hash) {
    console.error('Admin login attempted but ADMIN_EMAIL / ADMIN_PASSWORD_HASH are not configured')
    return null
  }

  const emailMatches = email.trim().toLowerCase() === adminEmail
  const passwordMatches = await compare(password, emailMatches ? hash : DUMMY_HASH)
  return emailMatches && passwordMatches ? adminEmail : null
}

/**
 * Current admin session from the admin cookie, or null.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies()
  return verifyAdminToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value)
}

/**
 * Server-side admin auth check. Returns the admin session, throws otherwise.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession()
  if (!session) {
    throw new Error('Admin access required')
  }
  return session
}


// ---- Login rate limiting: failed attempts per key, Redis when configured, else per-instance memory ----

const LOGIN_MAX_FAILURES = 5
const LOGIN_WINDOW_SECONDS = 15 * 60

const memoryFailures = new Map<string, { count: number; resetAt: number }>()

function failureKey(key: string) {
  return `admin_login_fail:${key}`
}

export async function isAdminLoginBlocked(keys: string[]): Promise<boolean> {
  for (const key of keys) {
    if ((await getFailureCount(key)) >= LOGIN_MAX_FAILURES) return true
  }
  return false
}

async function getFailureCount(key: string): Promise<number> {
  if (redis) {
    try {
      return Number(await redis.get(failureKey(key))) || 0
    } catch (error) {
      console.error('Admin rate limit read error:', error)
    }
  }
  const record = memoryFailures.get(key)
  if (!record || Date.now() > record.resetAt) return 0
  return record.count
}

export async function recordAdminLoginFailure(keys: string[]): Promise<void> {
  for (const key of keys) {
    if (redis) {
      try {
        const count = await redis.incr(failureKey(key))
        if (count === 1) await redis.expire(failureKey(key), LOGIN_WINDOW_SECONDS)
        continue
      } catch (error) {
        console.error('Admin rate limit write error:', error)
      }
    }
    const now = Date.now()
    const record = memoryFailures.get(key)
    if (!record || now > record.resetAt) {
      memoryFailures.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_SECONDS * 1000 })
    } else {
      record.count++
    }
  }
}

export async function clearAdminLoginFailures(keys: string[]): Promise<void> {
  for (const key of keys) {
    memoryFailures.delete(key)
    if (redis) {
      try {
        await redis.del(failureKey(key))
      } catch (error) {
        console.error('Admin rate limit clear error:', error)
      }
    }
  }
}
