/** @jest-environment node */
// Cron routes must be reachable without a user session (Vercel Cron, LALogix "Sync now");
// other API routes still require one.
jest.mock('@/lib/admin-session', () => ({ ADMIN_COOKIE_NAME: 'admin', verifyAdminToken: async () => null }))

import { NextRequest } from 'next/server'
import { middleware } from '../../middleware'

const call = (path: string, headers: Record<string, string> = {}) =>
  middleware(new NextRequest(`https://www.vivk.in${path}`, { headers: { 'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 250)}`, ...headers } }))

describe('middleware and /api/cron', () => {
  it('lets cron routes through without a session (they check CRON_SECRET themselves)', async () => {
    for (const path of ['/api/cron/lalogix-sync', '/api/cron/daily-reset']) {
      const res = await call(path, { authorization: 'Bearer anything' })
      expect(res.status).toBe(200)
      expect(res.headers.get('x-middleware-next')).toBe('1')
    }
  })

  it('still requires a session for other API routes', async () => {
    const res = await call('/api/user/profile')
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Authentication required', code: 'UNAUTHORIZED' })
  })

  it('does not open look-alike paths', async () => {
    expect((await call('/api/cronjobs')).status).toBe(401)
  })
})
