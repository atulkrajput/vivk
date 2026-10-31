import { NextResponse } from 'next/server'
import { ADMIN_COOKIE_NAME, adminCookieOptions } from '@/lib/admin-session'

// POST /api/admin-auth/logout - Clear the admin session cookie (user session is untouched)
export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(ADMIN_COOKIE_NAME, '', adminCookieOptions(0))
  return response
}
