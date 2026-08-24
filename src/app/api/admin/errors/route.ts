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

    // Get usage logs for the last 14 days
    const [usageRows] = await db.query(`
      SELECT 
        date,
        SUM(message_count) as totalMessages,
        SUM(tokens_used) as totalTokens,
        COUNT(DISTINCT user_id) as uniqueUsers
      FROM usage_logs
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
      GROUP BY date
      ORDER BY date DESC
    `) as any[]

    const usageLogs = (usageRows || []).map((row: any) => ({
      date: row.date,
      totalMessages: row.totalMessages || 0,
      totalTokens: row.totalTokens || 0,
      uniqueUsers: row.uniqueUsers || 0,
      errors: 0, // Would come from error tracking table if implemented
    }))

    // For errors, we'd normally have an error_logs table.
    // For now, return empty array (errors can be tracked via application logs)
    const errors: any[] = []

    return NextResponse.json({ errors, usageLogs })
  } catch (error) {
    console.error('Admin errors GET error:', error)
    return NextResponse.json({ errors: [], usageLogs: [] })
  }
}
