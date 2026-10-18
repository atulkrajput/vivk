// Discount codes: admin-created coupons (flat ₹ or %) with a validity window and a use limit
import crypto from 'crypto'
import { rawQuery, withTransaction, type TxQuery } from './db'
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

// How long an unpaid checkout holds a use of a limited code
export const RESERVATION_MINUTES = 30
// Razorpay Checkout closes this long before the reservation lapses, so a normal checkout
// is always paid inside its reservation
export const CHECKOUT_TIMEOUT_SECONDS = (RESERVATION_MINUTES - 5) * 60

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
          order_id VARCHAR(255) NULL,
          status ENUM('pending', 'completed', 'rejected') NOT NULL DEFAULT 'pending',
          expires_at DATETIME NULL COMMENT 'When a pending reservation stops holding a use',
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
      // Bring tables from earlier versions of this feature up to date
      const columns = await rawQuery<{ name: string; type: string }>(
        `SELECT COLUMN_NAME as name, COLUMN_TYPE as type FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'discount_redemptions'`
      )
      const status = columns.find((c) => c.name === 'status')
      if (!status) {
        // Created before reservations existed: every row is a paid redemption
        await rawQuery(`
          ALTER TABLE discount_redemptions
            MODIFY order_id VARCHAR(255) NULL,
            ADD COLUMN status ENUM('pending', 'completed', 'rejected') NOT NULL DEFAULT 'completed' AFTER order_id,
            ADD COLUMN expires_at DATETIME NULL AFTER status
        `)
      } else if (!String(status.type).includes('rejected')) {
        await rawQuery(
          "ALTER TABLE discount_redemptions MODIFY status ENUM('pending', 'completed', 'rejected') NOT NULL DEFAULT 'pending'"
        )
      }
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

// A use counts once paid, or while its checkout reservation is still live
const HOLDS_USE = "(status = 'completed' OR expires_at > NOW())"

async function checkCode(q: TxQuery, code: DiscountCode | null, userId: string, tier: SubscriptionTier): Promise<AppliedDiscount> {
  const plan = SUBSCRIPTION_PLANS[tier]
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

  const [uses] = await q<{ total: number; mine: number }>(
    `SELECT COUNT(*) as total, COALESCE(SUM(user_id = ?), 0) as mine
     FROM discount_redemptions WHERE discount_code_id = ? AND ${HOLDS_USE}`,
    [userId, code.id]
  )
  if (code.max_uses !== null && Number(uses?.total || 0) >= code.max_uses) {
    throw new DiscountError('This discount code has reached its usage limit')
  }
  if (Number(uses?.mine || 0) >= code.max_uses_per_user) {
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
}

export const discountService = {
  async getByCode(code: string): Promise<DiscountCode | null> {
    await ensureDiscountTables()
    const rows = await rawQuery<DiscountCode>('SELECT * FROM discount_codes WHERE code = ?', [normalizeCode(code)])
    return rows[0] || null
  },

  // Preview a code for this user and plan; throws DiscountError with a user-facing message
  async apply(rawCode: string, userId: string, tier: SubscriptionTier): Promise<AppliedDiscount> {
    return checkCode(rawQuery, await this.getByCode(rawCode), userId, tier)
  },

  // Check a code and hold one use for this checkout. The code row is locked, so concurrent
  // checkouts cannot both take the last use, or the same user's last use.
  async reserve(rawCode: string, userId: string, tier: SubscriptionTier): Promise<AppliedDiscount & { reservationId: string }> {
    await ensureDiscountTables()
    return withTransaction(async (q) => {
      const [code] = await q<DiscountCode>('SELECT * FROM discount_codes WHERE code = ? FOR UPDATE', [normalizeCode(rawCode)])
      const applied = await checkCode(q, code || null, userId, tier)
      const reservationId = crypto.randomUUID()
      await q(
        `INSERT INTO discount_redemptions
           (id, discount_code_id, user_id, status, expires_at, subscription_tier, original_amount, discount_amount, final_amount)
         VALUES (?, ?, ?, 'pending', DATE_ADD(NOW(), INTERVAL ${RESERVATION_MINUTES} MINUTE), ?, ?, ?, ?)`,
        [reservationId, applied.code.id, userId, tier, applied.originalAmount, applied.discountAmount, applied.finalAmount]
      )
      return { ...applied, reservationId }
    })
  },

  async attachOrder(reservationId: string, orderId: string): Promise<void> {
    await rawQuery('UPDATE discount_redemptions SET order_id = ? WHERE id = ?', [orderId, reservationId])
  },

  // Give the use back when no order could be created for the reservation
  async release(reservationId: string): Promise<void> {
    await rawQuery("DELETE FROM discount_redemptions WHERE id = ? AND status = 'pending'", [reservationId])
  },

  // Turn a paid order's reservation into a redemption. Safe to repeat (verify + webhook).
  // Returns false when the order's reservation lapsed and its use has since gone to other
  // checkouts: honouring it would exceed a limit, so the caller refunds the payment instead.
  // That decision is stored as a 'rejected' row before the refund is attempted, so a retry
  // after a failed refund or status write continues the refund instead of re-checking room.
  // Throws on database errors so the caller does not mark the payment completed.
  async recordRedemption(params: {
    code: string
    userId: string
    orderId: string
    tier: SubscriptionTier
    originalAmount: number
    discountAmount: number
    finalAmount: number
  }): Promise<boolean> {
    await ensureDiscountTables()
    return withTransaction(async (q) => {
      const [code] = await q<DiscountCode>('SELECT * FROM discount_codes WHERE code = ? FOR UPDATE', [normalizeCode(params.code)])
      if (!code) {
        // Only never-redeemed codes can be deleted, so there is no limit left to protect
        console.error(`Discount code ${params.code} on order ${params.orderId} no longer exists; not recording`)
        return true
      }

      const [existing] = await q<{ id: string; status: string; live: number }>(
        'SELECT id, status, (expires_at > NOW()) as live FROM discount_redemptions WHERE order_id = ?',
        [params.orderId]
      )
      if (existing?.status === 'completed') {
        return true
      }
      if (existing?.status === 'rejected') {
        return false
      }

      // A live reservation already holds this use. Otherwise (lapsed, or never linked to the
      // order) the use is only free if every other holder still leaves room for it.
      if (!(existing && Number(existing.live))) {
        const [uses] = await q<{ total: number; mine: number }>(
          `SELECT COUNT(*) as total, COALESCE(SUM(user_id = ?), 0) as mine
           FROM discount_redemptions WHERE discount_code_id = ? AND id <> ? AND ${HOLDS_USE}`,
          [params.userId, code.id, existing?.id || '']
        )
        const overTotal = code.max_uses !== null && Number(uses?.total || 0) >= code.max_uses
        const overUser = Number(uses?.mine || 0) >= code.max_uses_per_user
        if (overTotal || overUser) {
          // A rejected row holds no use (it never matches HOLDS_USE)
          if (existing) {
            await q("UPDATE discount_redemptions SET status = 'rejected', expires_at = NULL WHERE id = ?", [existing.id])
          } else {
            await q(
              `INSERT INTO discount_redemptions
                 (id, discount_code_id, user_id, order_id, status, subscription_tier, original_amount, discount_amount, final_amount)
               VALUES (?, ?, ?, ?, 'rejected', ?, ?, ?, ?)`,
              [crypto.randomUUID(), code.id, params.userId, params.orderId, params.tier,
                params.originalAmount, params.discountAmount, params.finalAmount]
            )
          }
          return false
        }
      }

      if (existing) {
        await q(
          `UPDATE discount_redemptions SET status = 'completed', expires_at = NULL, final_amount = ? WHERE id = ?`,
          [params.finalAmount, existing.id]
        )
      } else {
        await q(
          `INSERT INTO discount_redemptions
             (id, discount_code_id, user_id, order_id, status, subscription_tier, original_amount, discount_amount, final_amount)
           VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?)`,
          [crypto.randomUUID(), code.id, params.userId, params.orderId, params.tier,
            params.originalAmount, params.discountAmount, params.finalAmount]
        )
      }
      await q('UPDATE discount_codes SET used_count = used_count + 1 WHERE id = ?', [code.id])
      return true
    })
  },
}
