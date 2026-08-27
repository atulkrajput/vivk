import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'
import { rawQuery } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const tierCounts = await rawQuery(`
      SELECT subscription_tier, COUNT(*) as count 
      FROM users 
      GROUP BY subscription_tier
    `)

    const freeUsers = Number(tierCounts?.find((r: any) => r.subscription_tier === 'free')?.count || 0)
    const proUsers = Number(tierCounts?.find((r: any) => r.subscription_tier === 'pro')?.count || 0)
    const businessUsers = Number(tierCounts?.find((r: any) => r.subscription_tier === 'business')?.count || 0)
    const totalActive = proUsers + businessUsers
    const monthlyRevenue = (proUsers * 999) + (businessUsers * 4999)

    const recentSubs = await rawQuery(`
      SELECT u.id, u.email, u.full_name, u.subscription_tier as tier, u.subscription_status as status, 
             u.created_at, u.subscription_expires_at as expires_at
      FROM users u
      WHERE u.subscription_tier IN ('pro', 'business')
      ORDER BY u.updated_at DESC
      LIMIT 20
    `)

    return NextResponse.json({
      totalActive,
      proUsers,
      businessUsers,
      freeUsers,
      monthlyRevenue,
      recentSubscriptions: recentSubs || [],
    })
  } catch (error) {
    console.error('Admin subscriptions error:', error)
    return NextResponse.json({ error: 'Failed to load subscription data' }, { status: 500 })
  }
}
