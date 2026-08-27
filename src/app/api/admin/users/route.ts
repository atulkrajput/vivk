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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const tier = searchParams.get('tier') || ''
    const offset = (page - 1) * limit

    let whereClause = 'WHERE 1=1'
    const params: any[] = []

    if (search) {
      whereClause += ' AND (u.email LIKE ? OR u.full_name LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    if (tier && tier !== 'all') {
      whereClause += ' AND u.subscription_tier = ?'
      params.push(tier)
    }

    // Get total count
    const countRows = await rawQuery(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      params
    )
    const total = Number(countRows?.[0]?.total || 0)

    // Get users with message count, chat session (conversation) count, and tokens consumed.
    // Note: LIMIT/OFFSET are inlined as integers because mysql2 prepared
    // statements can reject them as bound params in some MySQL versions.
    const safeLimit = Math.max(1, Math.min(limit, 100))
    const safeOffset = Math.max(0, offset)

    const users = await rawQuery(
      `SELECT u.id, u.email, u.full_name, u.phone, u.subscription_tier, u.subscription_status, u.created_at,
              (SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.user_id = u.id) as message_count,
              (SELECT COUNT(*) FROM conversations c WHERE c.user_id = u.id) as session_count,
              (SELECT COALESCE(SUM(ul.tokens_used), 0) FROM usage_logs ul WHERE ul.user_id = u.id) as tokens_used
       FROM users u ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    )

    // Normalize numeric fields (MySQL may return strings/BigInt for aggregates)
    const normalizedUsers = (users || []).map((u: any) => ({
      ...u,
      message_count: Number(u.message_count || 0),
      session_count: Number(u.session_count || 0),
      tokens_used: Number(u.tokens_used || 0),
    }))

    return NextResponse.json({
      users: normalizedUsers,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 })
  }
}
