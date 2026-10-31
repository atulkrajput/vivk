import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getAdminSession } from '@/lib/admin'
import { rawQuery } from '@/lib/db'
import { ensureDiscountTables, generateCode, normalizeCode } from '@/lib/discounts'

function parseDate(value: unknown): Date | null | 'invalid' {
  if (value === undefined || value === null || value === '') return null
  const date = new Date(String(value))
  return isNaN(date.getTime()) ? 'invalid' : date
}

// GET /api/admin/discounts - All discount codes with redemption totals
export async function GET() {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 })
    }
    await ensureDiscountTables()

    const codes = await rawQuery(`
      SELECT d.*, COALESCE(SUM(r.discount_amount), 0) as total_discount, COALESCE(SUM(r.final_amount), 0) as total_revenue
      FROM discount_codes d
      LEFT JOIN discount_redemptions r ON r.discount_code_id = d.id AND r.status = 'completed'
      GROUP BY d.id
      ORDER BY d.created_at DESC
    `)
    const redemptions = await rawQuery(`
      SELECT r.id, r.order_id, r.subscription_tier, r.original_amount, r.discount_amount, r.final_amount, r.created_at,
             d.code, u.email, u.full_name
      FROM discount_redemptions r
      JOIN discount_codes d ON d.id = r.discount_code_id
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.status = 'completed'
      ORDER BY r.created_at DESC
      LIMIT 50
    `)

    return NextResponse.json({ codes, redemptions })
  } catch (error) {
    console.error('Admin discounts GET error:', error)
    return NextResponse.json({ error: 'Failed to load discount codes' }, { status: 500 })
  }
}

// POST /api/admin/discounts - Create a discount code (code is generated when left blank)
export async function POST(request: NextRequest) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 })
    }
    await ensureDiscountTables()

    const body = await request.json()
    const discountType = body.discountType
    if (!['percent', 'flat'].includes(discountType)) {
      return NextResponse.json({ error: 'Discount type must be percent or flat' }, { status: 400 })
    }

    const value = Number(body.discountValue)
    let discountValue: number
    if (discountType === 'percent') {
      if (!Number.isInteger(value) || value < 1 || value > 100) {
        return NextResponse.json({ error: 'Percent discount must be a whole number from 1 to 100' }, { status: 400 })
      }
      discountValue = value
    } else {
      // Flat amounts come in as rupees and are stored in paise
      if (!(value > 0)) {
        return NextResponse.json({ error: 'Flat discount must be more than ₹0' }, { status: 400 })
      }
      discountValue = Math.round(value * 100)
    }

    const applicableTier = body.applicableTier || 'all'
    if (!['all', 'pro', 'business'].includes(applicableTier)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    let maxUses: number | null = null
    if (body.maxUses !== undefined && body.maxUses !== null && body.maxUses !== '') {
      maxUses = Number(body.maxUses)
      if (!Number.isInteger(maxUses) || maxUses < 1) {
        return NextResponse.json({ error: 'Number of uses must be a whole number of at least 1' }, { status: 400 })
      }
    }
    const maxUsesPerUser = body.maxUsesPerUser === undefined || body.maxUsesPerUser === '' ? 1 : Number(body.maxUsesPerUser)
    if (!Number.isInteger(maxUsesPerUser) || maxUsesPerUser < 1) {
      return NextResponse.json({ error: 'Uses per user must be a whole number of at least 1' }, { status: 400 })
    }

    const validFrom = parseDate(body.validFrom)
    const validUntil = parseDate(body.validUntil)
    if (validFrom === 'invalid' || validUntil === 'invalid') {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    }
    if (validFrom && validUntil && validUntil <= validFrom) {
      return NextResponse.json({ error: 'Expiry must be after the start date' }, { status: 400 })
    }

    const code = body.code ? normalizeCode(body.code) : generateCode(body.prefix ?? 'VIVK')
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
      return NextResponse.json({ error: 'Code must be 3-40 letters, numbers, - or _' }, { status: 400 })
    }

    const description = body.description ? String(body.description).slice(0, 255) : null
    const id = crypto.randomUUID()
    try {
      await rawQuery(
        `INSERT INTO discount_codes
           (id, code, description, discount_type, discount_value, applicable_tier, max_uses, max_uses_per_user, valid_from, valid_until)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, code, description, discountType, discountValue, applicableTier, maxUses, maxUsesPerUser, validFrom, validUntil]
      )
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        return NextResponse.json({ error: `Code ${code} already exists` }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ success: true, code: { id, code } })
  } catch (error) {
    console.error('Admin discounts POST error:', error)
    return NextResponse.json({ error: 'Failed to create discount code' }, { status: 500 })
  }
}

// PATCH /api/admin/discounts - Enable or disable a code
export async function PATCH(request: NextRequest) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 })
    }
    await ensureDiscountTables()

    const { id, isActive } = await request.json()
    if (!id || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'id and isActive are required' }, { status: 400 })
    }
    await rawQuery('UPDATE discount_codes SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin discounts PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update discount code' }, { status: 500 })
  }
}

// DELETE /api/admin/discounts?id= - Delete a code that has never been redeemed
export async function DELETE(request: NextRequest) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 })
    }
    await ensureDiscountTables()

    const id = new URL(request.url).searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    // Unpaid checkout reservations don't count; they are removed with the code
    const used = await rawQuery("SELECT COUNT(*) as n FROM discount_redemptions WHERE discount_code_id = ? AND status = 'completed'", [id])
    if (Number(used[0]?.n || 0) > 0) {
      return NextResponse.json({ error: 'This code has been used; disable it instead so its history is kept' }, { status: 409 })
    }
    await rawQuery('DELETE FROM discount_codes WHERE id = ?', [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin discounts DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete discount code' }, { status: 500 })
  }
}
