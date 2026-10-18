// Discount codes: admin-created coupons (flat ₹ or %) with a validity window and a use limit
import crypto from 'crypto'
import { rawQuery } from './db'
import { MIN_ORDER_AMOUNT_PAISE } from './payments'
import { SUBSCRIPTION_PLANS, type SubscriptionTier } from './subscriptions'

export type DiscountType = 'percent' | 'flat'
export type DiscountTier = 'all' | 'pro' | 'business'

export interface DiscountCode {
  id: string
  code: string
  description: string | null
  discount_type: DiscountType
  discount_value: number // percent (1-100) or paise
  applicable_tier: DiscountTier
  max_uses: number | null // total redemptions allowed; null = unlimited
  max_uses_per_user: number
  used_count: number
  valid_from: string | null
  valid_until: string | null
  is_active: number
  created_at: string
}

export interface AppliedDiscount {
  code: DiscountCode
  originalAmount: number // paise
  discountAmount: number // paise
  finalAmount: number // paise
}

// Tables are created on first use so the live database needs no manual migration
// (same DDL as sql/004_discount_codes.sql)
let tablesReady: Promise<void> | null = null

export function ensureDiscountTables(): Promise<void> {
  if (!tablesReady) {
    tablesReady = (async () => {
      await rawQuery(`
        CREATE TABLE IF NOT EXISTS discount_codes (
          id CHAR(36) NOT NULL PRIMARY KEY,
          code VARCHAR(40) NOT NULL,
          description VARCHAR(255) NULL,
          discount_type ENUM('percent', 'flat') NOT NULL,
          discount_value INT NOT NULL COMMENT 'Percent (1-100) or paise',
          applicable_tier ENUM('all', 'pro', 'business') NOT NULL DEFAULT 'all',
          max_uses INT NULL COMMENT 'NULL for unlimited',
          max_uses_per_user INT NOT NULL DEFAULT 1,
          used_count INT NOT NULL DEFAULT 0,
          valid_from DATETIME NULL,
          valid_until DATETIME NULL,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY idx_discount_codes_code (code)
        ) ENGINE=InnoDB
      `)
      await rawQuery(`
        CREATE TABLE IF NOT EXISTS discount_redemptions (
          id CHAR(36) NOT NULL PRIMARY KEY,
          discount_code_id CHAR(36) NOT NULL,
          user_id CHAR(36) NOT NULL,
          order_id VARCHAR(255) NOT NULL,
          subscription_tier VARCHAR(20) NOT NULL,
          original_amount INT NOT NULL,
          discount_amount INT NOT NULL,
          final_amount INT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY idx_discount_redemptions_order (order_id),
          INDEX idx_discount_redemptions_code_user (discount_code_id, user_id),
          FOREIGN KEY (discount_code_id) REFERENCES discount_codes(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
      `)
    })().catch((error) => {
      tablesReady = null
      throw error
    })
  }
  return tablesReady
}

export function normalizeCode(code: unknown): string {
  return String(code || '').trim().toUpperCase()
}

// Readable random code, e.g. VIVK-7KQ2MX (no 0/O/1/I to avoid confusion)
export function generateCode(prefix = 'VIVK'): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.randomBytes(6)
  const suffix = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
  return prefix ? `${normalizeCode(prefix)}-${suffix}` : suffix
}

export function computeDiscountAmount(code: Pick<DiscountCode, 'discount_type' | 'discount_value'>, amount: number): number {
  const raw = code.discount_type === 'percent'
    ? Math.round((amount * code.discount_value) / 100)
    : code.discount_value
  // Razorpay cannot take an order below ₹1, so the discount never takes the price under that
  return Math.max(0, Math.min(raw, amount - MIN_ORDER_AMOUNT_PAISE))
}

export class DiscountError extends Error {}

export const discountService = {
  async getByCode(code: string): Promise<DiscountCode | null> {
    await ensureDiscountTables()
    const rows = await rawQuery<DiscountCode>('SELECT * FROM discount_codes WHERE code = ?', [normalizeCode(code)])
    return rows[0] || null
  },

  // Check a code for this user and plan; throws DiscountError with a user-facing message
  async apply(rawCode: string, userId: string, tier: SubscriptionTier): Promise<AppliedDiscount> {
    const plan = SUBSCRIPTION_PLANS[tier]
    const code = await this.getByCode(rawCode)
    if (!code || !code.is_active) {
      throw new DiscountError('Invalid discount code')
    }

    const now = Date.now()
    if (code.valid_from && new Date(code.valid_from).getTime() > now) {
      throw new DiscountError('This discount code is not active yet')
    }
    if (code.valid_until && new Date(code.valid_until).getTime() < now) {
      throw new DiscountError('This discount code has expired')
    }
    if (code.applicable_tier !== 'all' && code.applicable_tier !== tier) {
      throw new DiscountError(`This discount code is only valid for the ${SUBSCRIPTION_PLANS[code.applicable_tier].name} plan`)
    }
    if (code.max_uses !== null && code.used_count >= code.max_uses) {
      throw new DiscountError('This discount code has reached its usage limit')
    }

    const userRows = await rawQuery<{ uses: number }>(
      'SELECT COUNT(*) as uses FROM discount_redemptions WHERE discount_code_id = ? AND user_id = ?',
      [code.id, userId]
    )
    if (Number(userRows[0]?.uses || 0) >= code.max_uses_per_user) {
      throw new DiscountError('You have already used this discount code')
    }

    const discountAmount = computeDiscountAmount(code, plan.price)
    if (discountAmount <= 0) {
      throw new DiscountError('This discount code does not reduce the price of this plan')
    }

    return {
      code,
      originalAmount: plan.price,
      discountAmount,
      finalAmount: plan.price - discountAmount,
    }
  },

  // Record a paid order's discount once; the unique order_id makes verify + webhook safe to both call this
  async recordRedemption(params: {
    code: string
    userId: string
    orderId: string
    tier: SubscriptionTier
    originalAmount: number
    discountAmount: number
    finalAmount: number
  }): Promise<void> {
    const code = await this.getByCode(params.code)
    if (!code) {
      console.error(`Discount code ${params.code} on order ${params.orderId} no longer exists; not recording`)
      return
    }
    const result: any = await rawQuery(
      `INSERT IGNORE INTO discount_redemptions
         (id, discount_code_id, user_id, order_id, subscription_tier, original_amount, discount_amount, final_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), code.id, params.userId, params.orderId, params.tier,
        params.originalAmount, params.discountAmount, params.finalAmount]
    )
    if (result?.affectedRows) {
      await rawQuery('UPDATE discount_codes SET used_count = used_count + 1 WHERE id = ?', [code.id])
    }
  },
}
