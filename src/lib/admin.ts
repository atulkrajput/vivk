import { auth } from '@/lib/auth'

/**
 * List of admin email addresses or domains.
 * Users whose email matches one of these patterns get admin access.
 */
const ADMIN_EMAILS = [
  'admin@vivk.in',
  'atul@vivk.in',
]

const ADMIN_DOMAIN = '@vivk.in'

/**
 * Check if an email has admin privileges.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return email.endsWith(ADMIN_DOMAIN) || ADMIN_EMAILS.includes(email.toLowerCase())
}

/**
 * Server-side admin auth check. Returns the session if admin, throws otherwise.
 */
export async function requireAdmin() {
  const session = await auth()
  
  if (!session?.user?.email) {
    throw new Error('Authentication required')
  }
  
  if (!isAdminEmail(session.user.email)) {
    throw new Error('Admin access required')
  }
  
  return session
}
