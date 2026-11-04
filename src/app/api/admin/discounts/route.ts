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

type CodeFields = {
  discountType: 'percent' | 'flat'
  discountValue: number
  applicableTier: 'all' | 'pro' | 'business'
  maxUses: number | null
  maxUsesPerUser: number
  validFrom: Date | null
  validUntil: Date | null
  description: string | null
}

// Validate the editable fields of a code; returns an error message or the cleaned values
function validateFields(body: any): { error: string } | { fields: CodeFields } {
  const discountType = body.discountType
  if (!['percent', 'flat'].includes(discountType)) {
    return { error: 'Discount type must be percent or flat' }
  }

  const value = Number(body.discountValue)
  let discountValue: number
  if (discountType === 'percent') {
    if (!Number.isInteger(value) || value < 1 || value > 100) {
      return { error: 'Percent discount must be a whole number from 1 to 100' }
    }
    discountValue = value
  } else {
    // Flat amounts come in as rupees and are stored in paise
    if (!(value > 0)) {
      return { error: 'Flat discount must be more than ₹0' }
    }
    discountValue = Math.round(value * 100)
  }

  const applicableTier = body.applicableTier || 'all'
  if (!['all', 'pro', 'business'].includes(applicableTier)) {
    return { error: 'Invalid plan' }
  }

  let maxUses: number | null = null
  if (body.maxUses !== undefined && body.maxUses !== null && body.maxUses !== '') {
    maxUses = Number(body.maxUses)
    if (!Number.isInteger(maxUses) || maxUses < 1) {
      return { error: 'Number of uses must be a whole number of at least 1' }
    }
  }
  const maxUsesPerUser = body.maxUsesPerUser === undefined || body.maxUsesPerUser === '' ? 1 : Number(body.maxUsesPerUser)
  if (!Number.isInteger(maxUsesPerUser) || maxUsesPerUser < 1) {
    return { error: 'Uses per user must be a whole number of at least 1' }
  }
  if (maxUses !== null && maxUsesPerUser > maxUses) {
    return { error: 'Uses per user cannot be more than total uses' }
  }

  const validFrom = parseDate(body.validFrom)
  const validUntil = parseDate(body.validUntil)
  if (validFrom === 'invalid' || validUntil === 'invalid') {
    return { error: 'Invalid date' }
  }
  if (validFrom && validUntil && validUntil <= validFrom) {
    return { error: 'Expiry must be after the start date' }
  }

  const description = body.description ? String(body.description).slice(0, 255) : null
  return { fields: { discountType, discountValue, applicableTier, maxUses, maxUsesPerUser, validFrom, validUntil, description } }
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
    const validated = validateFields(body)
    if ('error' in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }
    const { discountType, discountValue, applicableTier, maxUses, maxUsesPerUser, validFrom, validUntil, description } = validated.fields

    const code = body.code ? normalizeCode(body.code) : generateCode(body.prefix ?? 'VIVK')
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
      return NextResponse.json({ error: 'Code must be 3-40 letters, numbers, - or _' }, { status: 400 })
    }

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

// PATCH /api/admin/discounts - Enable/disable a code ({ id, isActive }) or edit it ({ id, ...fields })
export async function PATCH(request: NextRequest) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 })
    }
    await ensureDiscountTables()

    const body = await request.json()
    const { id, isActive } = body
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    if (body.discountType === undefined) {
      if (typeof isActive !== 'boolean') {
        return NextResponse.json({ error: 'isActive is required' }, { status: 400 })
      }
      await rawQuery('UPDATE discount_codes SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id])
      return NextResponse.json({ success: true })
    }

    const validated = validateFields(body)
    if ('error' in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }
    const f = validated.fields

    const [existing] = await rawQuery<{ discount_type: string; discount_value: number; used: number }>(
      `SELECT d.discount_type, d.discount_value,
              (SELECT COUNT(*) FROM discount_redemptions r WHERE r.discount_code_id = d.id AND r.status = 'completed') as used
       FROM discount_codes d WHERE d.id = ?`,
      [id]
    )
    if (!existing) {
      return NextResponse.json({ error: 'Discount code not found' }, { status: 404 })
    }
    const used = Number(existing.used || 0)
    // Keep what earlier buyers got consistent with the code's history
    if (used > 0 && (f.discountType !== existing.discount_type || f.discountValue !== Number(existing.discount_value))) {
      return NextResponse.json({ error: 'This code has been used, so its discount can no longer change. Create a new code instead.' }, { status: 409 })
    }
    if (f.maxUses !== null && f.maxUses < used) {
      return NextResponse.json({ error: `This code has already been used ${used} times; total uses cannot be lower than that` }, { status: 400 })
    }

    await rawQuery(
      `UPDATE discount_codes SET description = ?, discount_type = ?, discount_value = ?, applicable_tier = ?,
         max_uses = ?, max_uses_per_user = ?, valid_from = ?, valid_until = ?
       WHERE id = ?`,
      [f.description, f.discountType, f.discountValue, f.applicableTier, f.maxUses, f.maxUsesPerUser, f.validFrom, f.validUntil, id]
    )
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
