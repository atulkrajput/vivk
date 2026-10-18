/** @jest-environment node */
// Discount code limits, reservations and late-payment refunds against a real MySQL database.
// Skipped unless DISCOUNT_TEST_DATABASE_URL points at a throwaway database whose name contains
// "test"; it drops and recreates its tables. Razorpay is mocked.
//
//   mysql -uroot -e "CREATE DATABASE vivk_discount_test"
//   DISCOUNT_TEST_DATABASE_URL=mysql://root@localhost:3306/vivk_discount_test npx jest discounts.mysql
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const TEST_DB_URL = process.env.DISCOUNT_TEST_DATABASE_URL || ''
const enabled = /test/i.test(TEST_DB_URL.split('/').pop() || '')
if (enabled) process.env.DATABASE_URL = TEST_DB_URL

const orders: Record<string, any> = {}
const pays: Record<string, any> = {}
const refunds: any[] = []
const razorpay = {
  orders: {
    create: jest.fn(async (o: any) => {
      const id = 'order_' + crypto.randomBytes(6).toString('hex')
      orders[id] = { ...o, id, status: 'created', created_at: 1 }
      return orders[id]
    }),
    fetch: jest.fn(async (id: string) => orders[id]),
  },
  payments: {
    fetch: jest.fn(async (id: string) => pays[id]),
    refund: jest.fn(async (id: string, p: any) => {
      refunds.push({ id, ...p })
      pays[id].amount_refunded = (pays[id].amount_refunded || 0) + p.amount
      return {}
    }),
  },
}
jest.mock('razorpay', () => jest.fn().mockImplementation(() => razorpay))

// Imported after DATABASE_URL is set
const { rawQuery } = require('@/lib/db') as typeof import('@/lib/db')
const { discountService, ensureDiscountTables } = require('@/lib/discounts') as typeof import('@/lib/discounts')
const { paymentService, webhookService, DiscountLimitRefundError } = require('@/lib/payments') as typeof import('@/lib/payments')
const { paymentDb } = require('@/lib/db') as typeof import('@/lib/db')

const A = '11111111-1111-1111-1111-111111111111'
const B = '22222222-2222-2222-2222-222222222222'
const C = '33333333-3333-3333-3333-333333333333'

async function mk(code: string, extra: Record<string, any> = {}) {
  const row = { discount_type: 'percent', discount_value: 20, applicable_tier: 'all', max_uses: null, max_uses_per_user: 1, ...extra }
  await rawQuery(
    `INSERT INTO discount_codes (id, code, discount_type, discount_value, applicable_tier, max_uses, max_uses_per_user)
     VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
    [code, row.discount_type, row.discount_value, row.applicable_tier, row.max_uses, row.max_uses_per_user]
  )
}

// Mirrors /api/payments/create-order, then gives the order a Razorpay payment to refund
async function checkout(code: string, user: string, tier: 'pro' | 'business' = 'pro') {
  const d = await discountService.reserve(code, user, tier)
  const order = await paymentService.createPaymentOrder(user, d.finalAmount, 'INR', 'r', tier, {
    discount_code: d.code.code,
    discount_amount: String(d.discountAmount),
    original_amount: String(d.originalAmount),
  })
  await discountService.attachOrder(d.reservationId, order.id)
  const payId = 'pay_' + order.id
  pays[payId] = { id: payId, amount: d.finalAmount, amount_refunded: 0 }
  return { d, order, payId }
}

const lapse = (reservationId: string) =>
  rawQuery('UPDATE discount_redemptions SET expires_at = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE id = ?', [reservationId])
const captured = (orderId: string, payId: string) =>
  webhookService.processWebhook({ event: 'payment.captured', payload: { payment: { entity: { id: payId, order_id: orderId } } } } as any)
const verify = (user: string, orderId: string, payId: string, tier: 'pro' | 'business' = 'pro') =>
  paymentService.handlePaymentSuccess(user, payId, orderId,
    crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!).update(orderId + '|' + payId).digest('hex'), tier)
const usedCount = async (code: string) =>
  Number((await rawQuery<any>('SELECT used_count FROM discount_codes WHERE code = ?', [code]))[0].used_count)
const tierOf = async (user: string) =>
  (await rawQuery<any>('SELECT subscription_tier FROM users WHERE id = ?', [user]))[0].subscription_tier
const payStatus = async (orderId: string) =>
  (await rawQuery<any>('SELECT status FROM payments WHERE razorpay_payment_id = ?', [orderId]))[0]?.status
const refundsFor = (payId: string) => refunds.filter((r) => r.id === payId)

async function resetSchema(legacyDiscountTables = false) {
  for (const t of ['discount_redemptions', 'discount_codes', 'payments', 'subscriptions', 'usage_logs', 'messages', 'conversations', 'users', 'plans']) {
    await rawQuery(`DROP TABLE IF EXISTS ${t}`)
  }
  // ensureDiscountTables only runs once per process, so the current discount tables come from the SQL file
  const files = legacyDiscountTables ? ['001_initial_schema.sql'] : ['001_initial_schema.sql', '004_discount_codes.sql']
  const schema = files.map((f) => fs.readFileSync(path.join(process.cwd(), 'sql', f), 'utf8')).join(';\n')
  for (const stmt of schema.split(';').map((s) => s.trim()).filter((s) => s && /^(CREATE TABLE|INSERT)/i.test(s.replace(/^--.*$/gm, '').trim()))) {
    await rawQuery(stmt)
  }
  await rawQuery("INSERT INTO users (id, email, password_hash) VALUES (?, 'a@test.local', 'x'), (?, 'b@test.local', 'x'), (?, 'c@test.local', 'x')", [A, B, C])
  if (legacyDiscountTables) {
    // Table shapes from the first version of this feature
    await rawQuery(`CREATE TABLE discount_codes (id CHAR(36) NOT NULL PRIMARY KEY, code VARCHAR(40) NOT NULL, description VARCHAR(255) NULL,
      discount_type ENUM('percent','flat') NOT NULL, discount_value INT NOT NULL, applicable_tier ENUM('all','pro','business') NOT NULL DEFAULT 'all',
      max_uses INT NULL, max_uses_per_user INT NOT NULL DEFAULT 1, used_count INT NOT NULL DEFAULT 0, valid_from DATETIME NULL, valid_until DATETIME NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, UNIQUE KEY idx_discount_codes_code (code)) ENGINE=InnoDB`)
    await rawQuery(`CREATE TABLE discount_redemptions (id CHAR(36) NOT NULL PRIMARY KEY, discount_code_id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL,
      order_id VARCHAR(255) NOT NULL, subscription_tier VARCHAR(20) NOT NULL, original_amount INT NOT NULL, discount_amount INT NOT NULL,
      final_amount INT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY idx_discount_redemptions_order (order_id),
      FOREIGN KEY (discount_code_id) REFERENCES discount_codes(id) ON DELETE CASCADE) ENGINE=InnoDB`)
  }
}

const describeDb = enabled ? describe : describe.skip

describeDb('discount codes (MySQL)', () => {
  jest.setTimeout(30000)

  describe('migration', () => {
    test('tables from the first version are upgraded and keep their paid redemptions', async () => {
      await resetSchema(true)
      await mk('LEGACY', { max_uses: 1 })
      await rawQuery(
        "INSERT INTO discount_redemptions SELECT UUID(), id, ?, 'order_legacy', 'pro', 99900, 19980, 79920, NOW() FROM discount_codes WHERE code = 'LEGACY'",
        [C]
      )
      await ensureDiscountTables()
      const [row] = await rawQuery<any>("SELECT status, expires_at FROM discount_redemptions WHERE order_id = 'order_legacy'")
      expect(row).toEqual({ status: 'completed', expires_at: null })
      const [col] = await rawQuery<any>(
        "SELECT COLUMN_TYPE as type FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'discount_redemptions' AND COLUMN_NAME = 'status'"
      )
      expect(col.type).toContain('rejected')
      await expect(discountService.apply('LEGACY', A, 'pro')).rejects.toThrow(/usage limit/)
    })
  })

  describe('limits and payments', () => {
    beforeAll(async () => {
      await resetSchema()
      await ensureDiscountTables()
    })
    beforeEach(async () => {
      await rawQuery("UPDATE users SET subscription_tier = 'free'")
      razorpay.payments.refund.mockClear()
    })

    test('validation rules', async () => {
      await mk('PCT20')
      await mk('BIZ200', { discount_type: 'flat', discount_value: 20000, applicable_tier: 'business' })
      await rawQuery("INSERT INTO discount_codes (id, code, discount_type, discount_value, valid_until) VALUES (UUID(), 'OLD', 'percent', 10, DATE_SUB(NOW(), INTERVAL 1 DAY))")
      await rawQuery("INSERT INTO discount_codes (id, code, discount_type, discount_value, valid_from) VALUES (UUID(), 'SOON', 'percent', 10, DATE_ADD(NOW(), INTERVAL 1 DAY))")
      await rawQuery("INSERT INTO discount_codes (id, code, discount_type, discount_value, is_active) VALUES (UUID(), 'OFF', 'percent', 10, 0)")
      await rawQuery("INSERT INTO discount_codes (id, code, discount_type, discount_value) VALUES (UUID(), 'ALLOFF', 'percent', 100)")

      expect((await discountService.apply(' pct20 ', A, 'pro')).finalAmount).toBe(79920)
      expect((await discountService.apply('BIZ200', A, 'business')).finalAmount).toBe(479900)
      expect((await discountService.apply('ALLOFF', A, 'pro')).finalAmount).toBe(100) // Razorpay's ₹1 minimum
      await expect(discountService.apply('BIZ200', A, 'pro')).rejects.toThrow(/only valid for the Business/)
      await expect(discountService.apply('OLD', A, 'pro')).rejects.toThrow(/expired/)
      await expect(discountService.apply('SOON', A, 'pro')).rejects.toThrow(/not active yet/)
      await expect(discountService.apply('OFF', A, 'pro')).rejects.toThrow(/Invalid/)
      await expect(discountService.apply('NOPE', A, 'pro')).rejects.toThrow(/Invalid/)
    })

    test('concurrent checkouts cannot take more than the last use', async () => {
      await mk('LAST1', { max_uses: 1 })
      const results = await Promise.allSettled([A, B, C].map((u) => discountService.reserve('LAST1', u, 'pro')))
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    })

    test('one user cannot hold two checkouts on a once-per-user code', async () => {
      await mk('ONCE')
      const results = await Promise.allSettled([discountService.reserve('ONCE', A, 'pro'), discountService.reserve('ONCE', A, 'pro')])
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
      expect(await discountService.apply('ONCE', B, 'pro')).toBeTruthy()
    })

    test('released and lapsed reservations give the use back', async () => {
      await mk('REL', { max_uses: 1 })
      const r = await discountService.reserve('REL', A, 'pro')
      await expect(discountService.apply('REL', B, 'pro')).rejects.toThrow(/usage limit/)
      await discountService.release(r.reservationId)
      const r2 = await discountService.reserve('REL', B, 'pro')
      await lapse(r2.reservationId)
      expect(await discountService.apply('REL', C, 'pro')).toBeTruthy()
    })

    test('a paid checkout is counted once across verify and webhook', async () => {
      await mk('PAY', { max_uses: 1 })
      const a = await checkout('PAY', A)
      expect(await verify(A, a.order.id, a.payId)).toBe(true)
      expect(await captured(a.order.id, a.payId)).toBe(true)
      expect(await captured(a.order.id, a.payId)).toBe(true)
      expect(await usedCount('PAY')).toBe(1)
      expect(await tierOf(A)).toBe('pro')
      expect(await payStatus(a.order.id)).toBe('completed')
    })

    test('late payment after its use went to another checkout is refunded (total limit)', async () => {
      await mk('RACE', { max_uses: 1 })
      const a = await checkout('RACE', A)
      await lapse(a.d.reservationId)
      const b = await checkout('RACE', B)
      expect(await captured(b.order.id, b.payId)).toBe(true)

      expect(await captured(a.order.id, a.payId)).toBe(true)
      expect(await tierOf(A)).toBe('free')
      expect(await payStatus(a.order.id)).toBe('refunded')
      expect(refundsFor(a.payId)).toEqual([{ id: a.payId, amount: a.d.finalAmount, notes: { reason: 'discount_limit_reached' } }])
      expect(await usedCount('RACE')).toBe(1)

      // Redelivery and a late verify neither refund twice nor upgrade
      expect(await captured(a.order.id, a.payId)).toBe(true)
      await expect(verify(A, a.order.id, a.payId)).rejects.toThrow(DiscountLimitRefundError)
      expect(refundsFor(a.payId)).toHaveLength(1)
      expect(await tierOf(A)).toBe('free')
    })

    test('late payment that would exceed the per-user limit is refunded', async () => {
      await mk('MINE')
      const first = await checkout('MINE', A)
      await lapse(first.d.reservationId)
      const second = await checkout('MINE', A)
      expect(await captured(second.order.id, second.payId)).toBe(true)
      await expect(verify(A, first.order.id, first.payId)).rejects.toThrow(DiscountLimitRefundError)
      expect(await usedCount('MINE')).toBe(1)
      expect(await payStatus(first.order.id)).toBe('refunded')
    })

    test('late payment is honoured while the use is still free', async () => {
      await mk('FREE', { max_uses: 1 })
      const a = await checkout('FREE', A)
      await lapse(a.d.reservationId)
      expect(await captured(a.order.id, a.payId)).toBe(true)
      expect(await tierOf(A)).toBe('pro')
      expect(refundsFor(a.payId)).toHaveLength(0)
      await expect(discountService.apply('FREE', B, 'pro')).rejects.toThrow(/usage limit/)
    })

    test('a failed refund is retried by the next webhook delivery', async () => {
      await mk('RFAIL', { max_uses: 1 })
      const a = await checkout('RFAIL', A)
      await lapse(a.d.reservationId)
      const b = await checkout('RFAIL', B)
      await captured(b.order.id, b.payId)

      razorpay.payments.refund.mockRejectedValueOnce(new Error('gateway down'))
      expect(await captured(a.order.id, a.payId)).toBe(false)
      expect(await payStatus(a.order.id)).toBe('pending')
      expect(await captured(a.order.id, a.payId)).toBe(true)
      expect(await payStatus(a.order.id)).toBe('refunded')
      expect(await tierOf(A)).toBe('free')
    })

    test('a rejected order stays rejected after the competing reservation lapses', async () => {
      await mk('STICKY', { max_uses: 1 })
      const a = await checkout('STICKY', A)
      await lapse(a.d.reservationId)
      // B holds the last use with a live, unpaid reservation
      const b = await checkout('STICKY', B)

      // A pays late: Razorpay refunds, but recording "refunded" locally fails
      // (updateStatus swallows database errors and returns null)
      const spy = jest.spyOn(paymentDb, 'updateStatus').mockResolvedValueOnce(null)
      await captured(a.order.id, a.payId)
      spy.mockRestore()
      expect(refundsFor(a.payId)).toHaveLength(1)
      expect(await payStatus(a.order.id)).toBe('pending')

      // B never pays, so the use would now be free
      await lapse(b.d.reservationId)

      // Razorpay retries A's webhook: still no upgrade and no second refund
      expect(await captured(a.order.id, a.payId)).toBe(true)
      expect(await tierOf(A)).toBe('free')
      expect(await payStatus(a.order.id)).toBe('refunded')
      expect(refundsFor(a.payId)).toHaveLength(1)
      expect(await usedCount('STICKY')).toBe(0)
      expect(await discountService.apply('STICKY', C, 'pro')).toBeTruthy()
    })

    test('a failed redemption write leaves the payment pending for the retry', async () => {
      await mk('FAIL')
      const c = await checkout('FAIL', C, 'business')
      const spy = jest.spyOn(discountService, 'recordRedemption').mockRejectedValueOnce(new Error('db down'))
      expect(await captured(c.order.id, c.payId)).toBe(false)
      expect(await payStatus(c.order.id)).toBe('pending')
      expect(await tierOf(C)).toBe('free')
      spy.mockRestore()
      expect(await captured(c.order.id, c.payId)).toBe(true)
      expect(await tierOf(C)).toBe('business')
      expect(await usedCount('FAIL')).toBe(1)
    })

    test('a tampered amount does not upgrade', async () => {
      const o = await paymentService.createPaymentOrder(B, 100, 'INR', 'r', 'business')
      expect(await webhookService.handlePaymentCaptured(o.id, 'pay_x')).toBe(true)
      expect(await tierOf(B)).toBe('free')
    })
  })
})

if (!enabled) {
  test.skip('discount MySQL tests need DISCOUNT_TEST_DATABASE_URL', () => {})
}
