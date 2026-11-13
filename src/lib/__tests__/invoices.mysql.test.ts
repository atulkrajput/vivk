/** @jest-environment node */
// Invoices and payment confirmation emails against a real MySQL database.
// Skipped unless INVOICE_TEST_DATABASE_URL points at a throwaway database whose name contains
// "test"; it drops and recreates its tables. Razorpay and the email sender are mocked.
//
//   mysql -uroot -e "CREATE DATABASE vivk_invoice_test"
//   INVOICE_TEST_DATABASE_URL=mysql://root@localhost:3306/vivk_invoice_test npx jest invoices.mysql
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const TEST_DB_URL = process.env.INVOICE_TEST_DATABASE_URL || ''
const enabled = /test/i.test(TEST_DB_URL.split('/').pop() || '')
if (enabled) process.env.DATABASE_URL = TEST_DB_URL
process.env.RAZORPAY_KEY_ID = 'rzp_test_x'
process.env.RAZORPAY_KEY_SECRET = 'test-secret'

const orders: Record<string, any> = {}
const razorpay = {
  orders: {
    create: jest.fn(async (o: any) => {
      const id = 'order_' + crypto.randomBytes(6).toString('hex')
      orders[id] = { ...o, id, status: 'created', created_at: 1 }
      return orders[id]
    }),
    fetch: jest.fn(async (id: string) => orders[id]),
  },
  payments: { fetch: jest.fn(), refund: jest.fn() },
}
jest.mock('razorpay', () => jest.fn().mockImplementation(() => razorpay))

const sent: any[] = []
let failNextEmail = false
jest.mock('@/lib/email', () => ({
  sendPaymentConfirmationEmail: jest.fn(async (invoice: any) => {
    if (failNextEmail) { failNextEmail = false; return false }
    sent.push(invoice)
    return true
  }),
}))

// Imported after DATABASE_URL is set
const { rawQuery } = require('@/lib/db') as typeof import('@/lib/db')
const { paymentService, webhookService } = require('@/lib/payments') as typeof import('@/lib/payments')
const { issueInvoice, ensureInvoiceTables, splitGst, financialYear, formatInvoiceNumber } = require('@/lib/invoices') as typeof import('@/lib/invoices')
const { getInvoiceForUser } = require('@/lib/invoice-access') as typeof import('@/lib/invoice-access')

const A = '11111111-1111-1111-1111-111111111111'
const B = '22222222-2222-2222-2222-222222222222'

async function resetSchema() {
  for (const t of ['discount_redemptions', 'discount_codes', 'payments', 'subscriptions', 'usage_logs', 'messages', 'conversations', 'users', 'plans']) {
    await rawQuery(`DROP TABLE IF EXISTS ${t}`)
  }
  const schema = fs.readFileSync(path.join(process.cwd(), 'sql', '001_initial_schema.sql'), 'utf8')
  for (const stmt of schema.split(';').map((s) => s.trim()).filter((s) => s && /^(CREATE TABLE|INSERT)/i.test(s.replace(/^--.*$/gm, '').trim()))) {
    await rawQuery(stmt)
  }
  // ensureInvoiceTables only creates tables once per process, so empty them instead of dropping
  await ensureInvoiceTables()
  await rawQuery('DELETE FROM invoices')
  await rawQuery('DELETE FROM invoice_counters')
  await rawQuery("INSERT INTO users (id, email, password_hash, full_name) VALUES (?, 'a@test.local', 'x', 'Asha Rao'), (?, 'b@test.local', 'x', 'Bilal Khan')", [A, B])
  sent.length = 0
}

async function paidOrder(user: string, amount = 99900, notes: Record<string, string> = {}) {
  const order = await paymentService.createPaymentOrder(user, amount, 'INR', 'r', 'pro', notes)
  return { orderId: order.id, payId: 'pay_' + order.id }
}
const verify = (user: string, orderId: string, payId: string) =>
  paymentService.handlePaymentSuccess(user, payId, orderId,
    crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!).update(orderId + '|' + payId).digest('hex'), 'pro')
const captured = (orderId: string, payId: string) =>
  webhookService.processWebhook({ event: 'payment.captured', payload: { payment: { entity: { id: payId, order_id: orderId } } } } as any)
const invoicesFor = (user: string) => rawQuery<any>('SELECT * FROM invoices WHERE user_id = ? ORDER BY invoice_number', [user])

describe('invoice math', () => {
  test('GST is taken out of the inclusive price', () => {
    expect(splitGst(99900, true)).toEqual({ taxable: 84661, gst: 15239 })
    expect(splitGst(100, true)).toEqual({ taxable: 85, gst: 15 })
    expect(splitGst(99900, false)).toEqual({ taxable: 99900, gst: 0 })
  })

  test('financial year follows IST and turns over on 1 April', () => {
    expect(financialYear(new Date('2026-11-13T10:00:00Z'))).toBe('26-27')
    expect(financialYear(new Date('2027-03-31T18:00:00Z'))).toBe('26-27') // 31 Mar 23:30 IST
    expect(financialYear(new Date('2027-03-31T18:31:00Z'))).toBe('27-28') // 1 Apr 00:01 IST
  })

  test('invoice numbers fit the 16-character GST limit', () => {
    expect(formatInvoiceNumber('VIVK', '26-27', 1)).toBe('VIVK/26-27/00001')
    expect(formatInvoiceNumber('VIVK', '26-27', 1)).toHaveLength(16)
  })
})

const describeDb = enabled ? describe : describe.skip

describeDb('invoices and confirmation emails (MySQL)', () => {
  jest.setTimeout(30000)

  beforeEach(async () => {
    delete process.env.INVOICE_GSTIN
    await resetSchema()
  })

  test('verify then webhook issues one invoice and sends one email', async () => {
    const { orderId, payId } = await paidOrder(A)
    expect(await verify(A, orderId, payId)).toBe(true)
    expect(await captured(orderId, payId)).toBe(true)

    const rows = await invoicesFor(A)
    expect(rows).toHaveLength(1)
    expect(rows[0].invoice_number).toMatch(/^VIVK\/\d\d-\d\d\/00001$/)
    expect(rows[0].emailed_at).not.toBeNull()
    expect(sent).toHaveLength(1)
    expect(sent[0].customer_email).toBe('a@test.local')
  })

  test('a plain receipt has no GST; a GSTIN makes it a tax invoice', async () => {
    const first = await paidOrder(A)
    await verify(A, first.orderId, first.payId)
    process.env.INVOICE_GSTIN = '29ABCDE1234F1Z5'
    const second = await paidOrder(B)
    await verify(B, second.orderId, second.payId)

    const [receipt] = await invoicesFor(A)
    expect(receipt.gstin).toBeNull()
    expect(receipt.gst_amount).toBe(0)
    expect(receipt.taxable_amount).toBe(99900)

    const [taxInvoice] = await invoicesFor(B)
    expect(taxInvoice.gstin).toBe('29ABCDE1234F1Z5')
    expect(taxInvoice.taxable_amount + taxInvoice.gst_amount).toBe(99900)
    expect(taxInvoice.gst_amount).toBe(15239)
  })

  test('a discounted order shows list price, discount and amount paid', async () => {
    const { orderId, payId } = await paidOrder(A, 100, { discount_code: 'LIVETEST100', discount_amount: '99800', original_amount: '99900' })
    // The code itself isn't in this test DB; redemption skips missing codes and the upgrade goes ahead
    expect(await verify(A, orderId, payId)).toBe(true)
    const [row] = await invoicesFor(A)
    expect(row.original_amount).toBe(99900)
    expect(row.discount_amount).toBe(99800)
    expect(row.total_amount).toBe(100)
    expect(row.discount_code).toBe('LIVETEST100')
    expect(sent[0].discount_code).toBe('LIVETEST100')
  })

  test('a failed email is retried by the next webhook delivery, then not again', async () => {
    const { orderId, payId } = await paidOrder(A)
    failNextEmail = true
    await verify(A, orderId, payId)
    expect(sent).toHaveLength(0)
    expect((await invoicesFor(A))[0].emailed_at).toBeNull()

    await captured(orderId, payId)
    expect(sent).toHaveLength(1)
    await captured(orderId, payId)
    expect(sent).toHaveLength(1)
  })

  test('numbers are consecutive and a payment never gets two numbers', async () => {
    const one = await paidOrder(A)
    const two = await paidOrder(B)
    await verify(A, one.orderId, one.payId)
    await verify(B, two.orderId, two.payId)

    const [payment] = await rawQuery<any>('SELECT * FROM payments WHERE razorpay_payment_id = ?', [one.orderId])
    const params = {
      paymentId: payment.id, userId: A, orderId: one.orderId, tier: 'pro' as const, totalAmount: 99900,
      periodStart: new Date(), periodEnd: new Date(),
    }
    await Promise.all([issueInvoice(params), issueInvoice(params), issueInvoice(params)])

    const all = await rawQuery<any>('SELECT invoice_number FROM invoices ORDER BY invoice_number')
    expect(all.map((r: any) => r.invoice_number.slice(-5))).toEqual(['00001', '00002'])
  })

  test('a payment completed before invoices existed gets one on first view, without an email', async () => {
    const { orderId } = await paidOrder(A)
    // Completed directly in the DB, as payments were before this feature
    await rawQuery("UPDATE payments SET status = 'completed' WHERE razorpay_payment_id = ?", [orderId])
    const [{ id }] = await rawQuery<any>('SELECT id FROM payments WHERE razorpay_payment_id = ?', [orderId])

    const invoice = await getInvoiceForUser(id, A)
    expect(invoice?.invoice_number).toMatch(/00001$/)
    expect(sent).toHaveLength(0)
    // Another user cannot open it
    expect(await getInvoiceForUser(id, B)).toBeNull()
  })
})
