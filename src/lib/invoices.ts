// Invoices for paid subscriptions: one per completed payment, numbered consecutively per
// Indian financial year (April-March), with the GST-inclusive price split into base + GST.
//
// Seller details come from env so they can be changed without a deploy of code:
//   INVOICE_BUSINESS_NAME     legal name shown on the invoice (default "VIVK")
//   INVOICE_BUSINESS_ADDRESS  registered address (lines separated by "|")
//   INVOICE_GSTIN             when set, the document is a "Tax Invoice" with GST shown;
//                             when empty, it is a plain "Receipt" with no GST line
//   INVOICE_PREFIX            invoice number prefix (default "VIVK")
//   INVOICE_SUPPORT_EMAIL     contact shown on the invoice (default support@vivk.in)

import crypto from 'crypto'
import { rawQuery, withTransaction } from './db'
import { SUBSCRIPTION_PLANS, type SubscriptionTier } from './subscriptions'

export const GST_RATE_PERCENT = 18
// SAC for "online information and database access or retrieval services"
export const SAC_CODE = '998431'

export interface InvoiceSettings {
  businessName: string
  addressLines: string[]
  gstin: string | null
  prefix: string
  supportEmail: string
}

export interface Invoice {
  id: string
  payment_id: string
  user_id: string
  invoice_number: string
  order_id: string
  subscription_tier: SubscriptionTier
  plan_name: string
  original_amount: number // paise, list price before discount
  discount_amount: number // paise
  discount_code: string | null
  total_amount: number // paise, what was paid (GST inclusive)
  taxable_amount: number // paise
  gst_amount: number // paise; 0 on a receipt
  gstin: string | null // seller GSTIN at the time of issue
  customer_name: string
  customer_email: string
  period_start: string
  period_end: string
  emailed_at: string | null
  created_at: string
}

export function getInvoiceSettings(): InvoiceSettings {
  const gstin = process.env.INVOICE_GSTIN?.trim().toUpperCase() || null
  return {
    businessName: process.env.INVOICE_BUSINESS_NAME?.trim() || 'VIVK',
    addressLines: (process.env.INVOICE_BUSINESS_ADDRESS || '').split('|').map((l) => l.trim()).filter(Boolean),
    gstin,
    prefix: (process.env.INVOICE_PREFIX?.trim() || 'VIVK').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'VIVK',
    supportEmail: process.env.INVOICE_SUPPORT_EMAIL?.trim() || 'support@vivk.in',
  }
}

/** Split a GST-inclusive amount into taxable value and GST (paise) */
export function splitGst(totalPaise: number, gstRegistered: boolean): { taxable: number; gst: number } {
  if (!gstRegistered) return { taxable: totalPaise, gst: 0 }
  const taxable = Math.round((totalPaise * 100) / (100 + GST_RATE_PERCENT))
  return { taxable, gst: totalPaise - taxable }
}

/** Indian financial year label for a date, e.g. 2026-11-13 -> "26-27" */
export function financialYear(date: Date): string {
  // FY follows IST; shift UTC by +5:30 before reading the month
  const ist = new Date(date.getTime() + 330 * 60_000)
  const startYear = ist.getUTCMonth() >= 3 ? ist.getUTCFullYear() : ist.getUTCFullYear() - 1
  const yy = (n: number) => String(n % 100).padStart(2, '0')
  return `${yy(startYear)}-${yy(startYear + 1)}`
}

/** GST rules cap invoice numbers at 16 characters, e.g. VIVK/26-27/00001 */
export function formatInvoiceNumber(prefix: string, fy: string, seq: number): string {
  const digits = Math.max(1, 16 - prefix.length - fy.length - 2)
  return `${prefix}/${fy}/${String(seq).padStart(Math.min(digits, 5), '0')}`
}

let tablesReady: Promise<void> | null = null

export function ensureInvoiceTables(): Promise<void> {
  if (!tablesReady) {
    tablesReady = (async () => {
      await rawQuery(`
        CREATE TABLE IF NOT EXISTS invoice_counters (
          series VARCHAR(20) NOT NULL PRIMARY KEY COMMENT 'prefix/financial year',
          last_seq INT NOT NULL DEFAULT 0
        ) ENGINE=InnoDB
      `)
      await rawQuery(`
        CREATE TABLE IF NOT EXISTS invoices (
          id CHAR(36) NOT NULL PRIMARY KEY,
          payment_id CHAR(36) NOT NULL,
          user_id CHAR(36) NOT NULL,
          invoice_number VARCHAR(20) NOT NULL,
          order_id VARCHAR(255) NOT NULL,
          subscription_tier VARCHAR(20) NOT NULL,
          plan_name VARCHAR(50) NOT NULL,
          original_amount INT NOT NULL,
          discount_amount INT NOT NULL DEFAULT 0,
          discount_code VARCHAR(40) NULL,
          total_amount INT NOT NULL,
          taxable_amount INT NOT NULL,
          gst_amount INT NOT NULL,
          gstin VARCHAR(15) NULL,
          customer_name VARCHAR(255) NOT NULL,
          customer_email VARCHAR(255) NOT NULL,
          period_start DATETIME NOT NULL,
          period_end DATETIME NOT NULL,
          emailed_at DATETIME NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY idx_invoices_payment (payment_id),
          UNIQUE KEY idx_invoices_number (invoice_number),
          INDEX idx_invoices_user (user_id)
        ) ENGINE=InnoDB
      `)
    })().catch((error) => {
      tablesReady = null
      throw error
    })
  }
  return tablesReady
}

export interface IssueInvoiceParams {
  paymentId: string
  userId: string
  orderId: string
  tier: SubscriptionTier
  totalAmount: number // paise actually paid
  originalAmount?: number // paise before discount
  discountAmount?: number
  discountCode?: string | null
  periodStart: Date
  periodEnd: Date
}

export async function getInvoiceByPaymentId(paymentId: string): Promise<Invoice | null> {
  await ensureInvoiceTables()
  const [row] = await rawQuery<Invoice>('SELECT * FROM invoices WHERE payment_id = ?', [paymentId])
  return row || null
}

/**
 * Issue the invoice for a completed payment. Safe to call more than once (verify + webhook):
 * a payment only ever gets one invoice and one number.
 */
export async function issueInvoice(params: IssueInvoiceParams): Promise<Invoice> {
  const existing = await getInvoiceByPaymentId(params.paymentId)
  if (existing) return existing

  const settings = getInvoiceSettings()
  const fy = financialYear(new Date())
  const series = `${settings.prefix}/${fy}`
  const { taxable, gst } = splitGst(params.totalAmount, !!settings.gstin)
  const discountAmount = Math.max(0, params.discountAmount || 0)
  const originalAmount = params.originalAmount && params.originalAmount >= params.totalAmount
    ? params.originalAmount
    : params.totalAmount + discountAmount

  return withTransaction(async (q) => {
    // The counter row lock serialises invoice creation, so the re-check below is race-free
    // and numbers stay consecutive without gaps
    await q('INSERT INTO invoice_counters (series, last_seq) VALUES (?, 0) ON DUPLICATE KEY UPDATE series = series', [series])
    const [counter] = await q<{ last_seq: number }>('SELECT last_seq FROM invoice_counters WHERE series = ? FOR UPDATE', [series])

    const [again] = await q<Invoice>('SELECT * FROM invoices WHERE payment_id = ?', [params.paymentId])
    if (again) return again

    const [user] = await q<{ email: string; full_name: string }>('SELECT email, full_name FROM users WHERE id = ?', [params.userId])
    if (!user) throw new Error(`Cannot invoice payment ${params.paymentId}: user ${params.userId} not found`)

    const seq = Number(counter?.last_seq || 0) + 1
    await q('UPDATE invoice_counters SET last_seq = ? WHERE series = ?', [seq, series])

    const id = crypto.randomUUID()
    await q(
      `INSERT INTO invoices
         (id, payment_id, user_id, invoice_number, order_id, subscription_tier, plan_name, original_amount, discount_amount,
          discount_code, total_amount, taxable_amount, gst_amount, gstin, customer_name, customer_email, period_start, period_end)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, params.paymentId, params.userId, formatInvoiceNumber(settings.prefix, fy, seq), params.orderId, params.tier,
        SUBSCRIPTION_PLANS[params.tier]?.name || params.tier, originalAmount, discountAmount, params.discountCode || null,
        params.totalAmount, taxable, gst, settings.gstin, user.full_name || user.email, user.email,
        params.periodStart, params.periodEnd]
    )
    const [created] = await q<Invoice>('SELECT * FROM invoices WHERE id = ?', [id])
    return created
  })
}

/** Mark the confirmation email as being sent; false when another call already sent it */
export async function claimInvoiceEmail(invoiceId: string): Promise<boolean> {
  // For an UPDATE, mysql2 returns a result header rather than rows
  const result = (await rawQuery('UPDATE invoices SET emailed_at = NOW() WHERE id = ? AND emailed_at IS NULL', [invoiceId])) as unknown as { affectedRows: number }
  return result.affectedRows > 0
}

/** Give the email back so the next verify/webhook call retries it */
export async function releaseInvoiceEmail(invoiceId: string): Promise<void> {
  await rawQuery('UPDATE invoices SET emailed_at = NULL WHERE id = ?', [invoiceId])
}

export function invoiceUrl(paymentId: string): string {
  const base = (process.env.NEXTAUTH_URL || 'https://www.vivk.in').replace(/\/$/, '')
  return `${base}/invoice/${paymentId}`
}

export function formatRupees(paise: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(paise / 100)
}
