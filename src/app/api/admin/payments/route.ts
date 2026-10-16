import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'
import { rawQuery } from '@/lib/db'

const STATUSES = ['pending', 'completed', 'failed', 'refunded']
const PAGE_SIZE = 25

// GET /api/admin/payments - All payment transactions, with optional status filter and search
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const search = (searchParams.get('search') || '').trim()
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)

    const conditions: string[] = []
    const params: any[] = []
    if (STATUSES.includes(status)) {
      conditions.push('p.status = ?')
      params.push(status)
    }
    if (search) {
      // razorpay_payment_id holds the Razorpay order ID
      conditions.push('(u.email LIKE ? OR u.full_name LIKE ? OR p.razorpay_payment_id LIKE ?)')
      const like = `%${search}%`
      params.push(like, like, like)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const countRows = await rawQuery(
      `SELECT COUNT(*) as total FROM payments p LEFT JOIN users u ON u.id = p.user_id ${where}`,
      params
    )
    const total = Number(countRows?.[0]?.total || 0)

    // LIMIT/OFFSET are integers we computed, so they are inlined rather than bound
    const transactions = await rawQuery(
      `SELECT p.id, p.razorpay_payment_id as order_id, p.amount, p.currency, p.status, p.created_at,
              u.id as user_id, u.email, u.full_name
       FROM payments p
       LEFT JOIN users u ON u.id = p.user_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
      params
    )

    const summaryRows = await rawQuery(`
      SELECT status, COUNT(*) as count, COALESCE(SUM(amount), 0) as amount
      FROM payments
      GROUP BY status
    `)
    const summary = STATUSES.reduce((acc, s) => {
      const row = summaryRows?.find((r: any) => r.status === s)
      acc[s] = { count: Number(row?.count || 0), amount: Number(row?.amount || 0) }
      return acc
    }, {} as Record<string, { count: number; amount: number }>)

    return NextResponse.json({
      transactions: transactions || [],
      summary,
      pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) },
    })
  } catch (error) {
    console.error('Admin payments error:', error)
    return NextResponse.json({ error: 'Failed to load transactions' }, { status: 500 })
  }
}
