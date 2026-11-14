// Sends VIVK's GST invoices to LALogix (lalogix.com), the company's billing hub, so every
// product's invoices land in one consolidated GST return. VIVK keeps issuing and emailing its
// own invoices; this only reports them.
//
//   LALOGIX_API_KEY      product key from LALogix → Billing → Products → VIVK.in → Connect
//   LALOGIX_INGEST_URL   defaults to https://lalogix.com/api/ingest/v1
//
// LALogix is idempotent by external_id (the VIVK invoice id), so sending an invoice twice is
// harmless. Each invoice is sent right after it is issued; anything that fails (LALogix down,
// a validation error) stays unsynced and is retried by /api/cron/lalogix-sync.
// Receipts issued without a GSTIN are not tax invoices and are not sent.

import { rawQuery } from './db'
import { SAC_CODE, GST_RATE_PERCENT, ensureInvoiceTables, type Invoice } from './invoices'

const DEFAULT_URL = 'https://lalogix.com/api/ingest/v1'
const TIMEOUT_MS = 5000

export type SyncResult = 'synced' | 'skipped' | 'failed'

export function lalogixConfig(): { url: string; key: string } | null {
  const key = process.env.LALOGIX_API_KEY?.trim()
  if (!key) return null
  const url = (process.env.LALOGIX_INGEST_URL?.trim() || DEFAULT_URL).replace(/\/$/, '')
  return { url, key }
}

/** YYYY-MM-DD in India time, the date printed on the invoice */
export function istDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

const shortDate = (value: string | Date) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })

/**
 * The LALogix ingest payload for one invoice. Amounts are rupees; the line carries the
 * taxable value VIVK already split out of the GST-inclusive price, and `total` is exactly what
 * the customer paid, so LALogix records the same figures as the invoice the customer received.
 * VIVK has no customer address, so LALogix applies the supplier's state as place of supply.
 */
export function lalogixPayload(invoice: Invoice) {
  const rupees = (paise: number) => Math.round(Number(paise)) / 100
  const date = istDate(invoice.created_at)
  const discount = Number(invoice.discount_amount) > 0 && invoice.discount_code ? `, discount code ${invoice.discount_code}` : ''

  return {
    external_id: invoice.id,
    number: invoice.invoice_number,
    date,
    customer: {
      name: invoice.customer_name,
      email: invoice.customer_email,
      country: 'India',
    },
    items: [{
      description: `VIVK ${invoice.plan_name} plan, ${shortDate(invoice.period_start)} to ${shortDate(invoice.period_end)}${discount}`,
      sac: SAC_CODE,
      quantity: 1,
      unit: 'NOS',
      rate: rupees(invoice.taxable_amount),
      gst_rate: GST_RATE_PERCENT,
    }],
    total: rupees(invoice.total_amount),
    payment: {
      date,
      amount: rupees(invoice.total_amount),
      method: 'other',
      reference: invoice.order_id,
    },
  }
}

let columnReady: Promise<void> | null = null

/** Adds invoices.lalogix_synced_at on databases created before the sync existed */
export function ensureSyncColumn(): Promise<void> {
  if (!columnReady) {
    columnReady = (async () => {
      await ensureInvoiceTables()
      const rows = await rawQuery<{ n: number }>(
        `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'lalogix_synced_at'`
      )
      if (!Number(rows[0]?.n)) {
        await rawQuery('ALTER TABLE invoices ADD COLUMN lalogix_synced_at DATETIME NULL, ADD INDEX idx_invoices_lalogix (lalogix_synced_at)')
      }
    })().catch((error) => {
      columnReady = null
      throw error
    })
  }
  return columnReady
}

/** Send one invoice to LALogix and mark it synced. Never throws. */
export async function syncInvoiceToLalogix(invoice: Invoice): Promise<SyncResult> {
  const config = lalogixConfig()
  if (!config) return 'skipped'
  if (!invoice.gstin) return 'skipped' // a Receipt, not a tax invoice

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${config.url}/invoices`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(lalogixPayload(invoice)),
      signal: controller.signal,
    })
    if (res.status !== 200 && res.status !== 201) {
      const body = await res.json().catch(() => ({}))
      console.error(`LALogix rejected invoice ${invoice.invoice_number} (${res.status}): ${body?.error || 'no details'}`)
      return 'failed'
    }
    await ensureSyncColumn()
    await rawQuery('UPDATE invoices SET lalogix_synced_at = NOW() WHERE id = ?', [invoice.id])
    return 'synced'
  } catch (error) {
    console.error(`Could not send invoice ${invoice.invoice_number} to LALogix:`, error)
    return 'failed'
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Send every tax invoice not yet synced, oldest first, within a time budget (Vercel functions
 * run for at most 30s). Used by the cron job to retry failures and to back-fill.
 */
export async function syncPendingInvoices(options: { limit?: number; budgetMs?: number } = {}) {
  const result = { synced: 0, failed: 0, remaining: 0, configured: !!lalogixConfig() }
  if (!result.configured) return result

  await ensureSyncColumn()
  const limit = Math.max(1, Math.min(options.limit ?? 200, 1000))
  const deadline = Date.now() + (options.budgetMs ?? 20000)
  const pending = await rawQuery<Invoice>(
    `SELECT * FROM invoices WHERE gstin IS NOT NULL AND lalogix_synced_at IS NULL ORDER BY created_at, invoice_number LIMIT ${limit}`
  )

  for (const invoice of pending) {
    if (Date.now() > deadline) break
    const outcome = await syncInvoiceToLalogix(invoice)
    if (outcome === 'synced') result.synced++
    else result.failed++
  }
  const [left] = await rawQuery<{ n: number }>('SELECT COUNT(*) AS n FROM invoices WHERE gstin IS NOT NULL AND lalogix_synced_at IS NULL')
  result.remaining = Number(left?.n || 0)
  return result
}
