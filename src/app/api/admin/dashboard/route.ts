import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Fetch metrics from database
    const [usersResult] = await db.query('SELECT COUNT(*) as total FROM users') as any[]
    const totalUsers = usersResult?.[0]?.total || 0

    const [newTodayResult] = await db.query(
      'SELECT COUNT(*) as total FROM users WHERE DATE(created_at) = CURDATE()'
    ) as any[]
    const newUsersToday = newTodayResult?.[0]?.total || 0

    const [subsResult] = await db.query(
      "SELECT COUNT(*) as total FROM users WHERE subscription_tier IN ('pro', 'business') AND subscription_status = 'active'"
    ) as any[]
    const activeSubscriptions = subsResult?.[0]?.total || 0

    const [messagesResult] = await db.query('SELECT COUNT(*) as total FROM messages') as any[]
    const totalMessages = messagesResult?.[0]?.total || 0

    const [messagesTodayResult] = await db.query(
      'SELECT COUNT(*) as total FROM messages WHERE DATE(created_at) = CURDATE()'
    ) as any[]
    const messagesToday = messagesTodayResult?.[0]?.total || 0

    const [tokensResult] = await db.query(
      'SELECT COALESCE(SUM(tokens_used), 0) as total FROM usage_logs'
    ) as any[]
    const aiTokensUsed = tokensResult?.[0]?.total || 0

    // Calculate monthly revenue (Pro = 999, Business = 4999)
    const [revenueResult] = await db.query(`
      SELECT 
        SUM(CASE WHEN subscription_tier = 'pro' THEN 999 WHEN subscription_tier = 'business' THEN 4999 ELSE 0 END) as revenue
      FROM users 
      WHERE subscription_tier IN ('pro', 'business') AND subscription_status = 'active'
    `) as any[]
    const monthlyRevenue = revenueResult?.[0]?.revenue || 0

    return NextResponse.json({
      metrics: {
        totalUsers,
        newUsersToday,
        activeSubscriptions,
        monthlyRevenue,
        totalMessages,
        messagesToday,
        errorRate: 0.12, // Placeholder - would come from error tracking
        aiTokensUsed,
      }
    })
  } catch (error) {
    console.error('Admin dashboard error:', error)
    return NextResponse.json({ error: 'Failed to load metrics' }, { status: 500 })
  }
}
