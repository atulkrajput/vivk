import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  verifyAdminCredentials,
  isAdminLoginBlocked,
  recordAdminLoginFailure,
  clearAdminLoginFailures,
} from '@/lib/admin'
import { ADMIN_COOKIE_NAME, adminCookieOptions, createAdminToken } from '@/lib/admin-session'
import { getClientIdentifier } from '@/lib/rate-limiting'

export const runtime = 'nodejs'

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
})

// POST /api/admin-auth/login - Admin sign-in (separate from NextAuth user login)
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 })
  }

  const { email, password } = parsed.data
  const rateKeys = [`ip:${getClientIdentifier(request)}`, `email:${email.trim().toLowerCase()}`]

  if (await isAdminLoginBlocked(rateKeys)) {
    return NextResponse.json(
      { error: 'Too many failed attempts. Try again in 15 minutes.' },
      { status: 429, headers: { 'Retry-After': '900' } }
    )
  }

  const adminEmail = await verifyAdminCredentials(email, password)
  if (!adminEmail) {
    await recordAdminLoginFailure(rateKeys)
    console.warn('Admin login failed')
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  let token: string
  try {
    token = await createAdminToken(adminEmail)
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json({ error: 'Admin login is not configured' }, { status: 500 })
  }

  await clearAdminLoginFailures(rateKeys)
  console.log('Admin login successful')

  const response = NextResponse.json({ success: true })
  response.cookies.set(ADMIN_COOKIE_NAME, token, adminCookieOptions())
  return response
}
