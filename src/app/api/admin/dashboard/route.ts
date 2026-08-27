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

    // Fetch metrics from database
    const usersRows = await rawQuery('SELECT COUNT(*) as total FROM users')
    const totalUsers = usersRows?.[0]?.total || 0

    const newTodayRows = await rawQuery(
      'SELECT COUNT(*) as total FROM users WHERE DATE(created_at) = CURDATE()'
    )
    const newUsersToday = newTodayRows?.[0]?.total || 0

    const subsRows = await rawQuery(
      "SELECT COUNT(*) as total FROM users WHERE subscription_tier IN ('pro', 'business') AND subscription_status = 'active'"
    )
    const activeSubscriptions = subsRows?.[0]?.total || 0

    const messagesRows = await rawQuery('SELECT COUNT(*) as total FROM messages')
    const totalMessages = messagesRows?.[0]?.total || 0

    const messagesTodayRows = await rawQuery(
      'SELECT COUNT(*) as total FROM messages WHERE DATE(created_at) = CURDATE()'
    )
    const messagesToday = messagesTodayRows?.[0]?.total || 0

    const tokensRows = await rawQuery(
      'SELECT COALESCE(SUM(tokens_used), 0) as total FROM usage_logs'
    )
    const aiTokensUsed = Number(tokensRows?.[0]?.total || 0)

    // Calculate monthly revenue (Pro = 999, Business = 4999)
    const revenueRows = await rawQuery(`
      SELECT 
        COALESCE(SUM(CASE WHEN subscription_tier = 'pro' THEN 999 WHEN subscription_tier = 'business' THEN 4999 ELSE 0 END), 0) as revenue
      FROM users 
      WHERE subscription_tier IN ('pro', 'business') AND subscription_status = 'active'
    `)
    const monthlyRevenue = Number(revenueRows?.[0]?.revenue || 0)

    return NextResponse.json({
      metrics: {
        totalUsers,
        newUsersToday,
        activeSubscriptions,
        monthlyRevenue,
        totalMessages,
        messagesToday,
        errorRate: 0,
        aiTokensUsed,
      }
    })
  } catch (error) {
    console.error('Admin dashboard error:', error)
    return NextResponse.json({ error: 'Failed to load metrics' }, { status: 500 })
  }
}
