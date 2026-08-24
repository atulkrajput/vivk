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
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      params
    ) as any[]
    const total = countResult?.[0]?.total || 0

    // Get users with message count
    const [users] = await db.query(
      `SELECT u.id, u.email, u.full_name, u.phone, u.subscription_tier, u.subscription_status, u.created_at,
              (SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.user_id = u.id) as message_count
       FROM users u ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ) as any[]

    return NextResponse.json({
      users: users || [],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 })
  }
}
