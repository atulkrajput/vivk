// Admin session token: a signed JWT in its own cookie, independent of NextAuth.
// Edge-safe (only uses jose) so middleware can verify it too.

import { SignJWT, jwtVerify } from 'jose'

export const ADMIN_COOKIE_NAME = 'vivk_admin_session'
export const ADMIN_SESSION_MAX_AGE = 8 * 60 * 60 // 8 hours

const ISSUER = 'vivk-admin'
const AUDIENCE = 'vivk-admin-panel'

export interface AdminSession {
  email: string
}

function getSecret(): Uint8Array | null {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim()
  // Refuse weak or shared secrets: an admin token must never be forgeable with the user-auth secret
  if (!secret || secret.length < 32 || secret === process.env.NEXTAUTH_SECRET?.trim()) return null
  return new TextEncoder().encode(secret)
}

export async function createAdminToken(email: string): Promise<string> {
  const secret = getSecret()
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is missing, shorter than 32 chars, or equal to NEXTAUTH_SECRET')

  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(email)
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_MAX_AGE}s`)
    .sign(secret)
}

export async function verifyAdminToken(token: string | undefined | null): Promise<AdminSession | null> {
  if (!token) return null
  const secret = getSecret()
  if (!secret) return null

  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
    })
    // A token for an email that is no longer the configured admin is not valid
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
    return typeof payload.email === 'string' && payload.email === adminEmail ? { email: payload.email } : null
  } catch {
    return null
  }
}

export function adminCookieOptions(maxAge = ADMIN_SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge,
  }
}
