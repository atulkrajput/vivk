/** @jest-environment node */
// LALogix sync: payload mapping, skip rules, success/failure handling and the pending sweep.
// The database is mocked; fetch is stubbed.

const rawQuery = jest.fn()
jest.mock('../db', () => ({ rawQuery: (...args: any[]) => rawQuery(...args) }))
jest.mock('../invoices', () => ({
  SAC_CODE: '998431',
  GST_RATE_PERCENT: 18,
  ensureInvoiceTables: jest.fn(async () => undefined),
}))

import { lalogixPayload, syncInvoiceToLalogix, syncPendingInvoices, istDate } from '../lalogix'
import type { Invoice } from '../invoices'

const invoice = (over: Partial<Invoice> = {}): Invoice => ({
  id: '11111111-2222-3333-4444-555555555555',
  payment_id: 'pay-row-1',
  user_id: 'user-1',
  invoice_number: 'VIVK/26-27/00001',
  order_id: 'order_ABC123',
  subscription_tier: 'pro' as any,
  plan_name: 'Pro',
  original_amount: 119900,
  discount_amount: 20000,
  discount_code: 'WELCOME200',
  total_amount: 99900,
  taxable_amount: 84661,
  gst_amount: 15239,
  gstin: '27AAPFU0939F1ZV',
  customer_name: 'Priya Sharma',
  customer_email: 'priya@example.com',
  period_start: '2026-11-12T19:00:00.000Z',
  period_end: '2026-12-12T19:00:00.000Z',
  emailed_at: null,
  created_at: '2026-11-12T19:30:00.000Z', // 13 Nov 01:00 IST
  ...over,
})

const okResponse = (status = 201, body: any = { outcome: 'created' }) =>
  ({ status, json: async () => body }) as unknown as Response

beforeEach(() => {
  rawQuery.mockReset()
  rawQuery.mockImplementation(async (sql: string) => (sql.includes('information_schema') || sql.includes('COUNT(*)') ? [{ n: 1 }] : []))
  process.env.LALOGIX_API_KEY = 'lxk_test'
  delete process.env.LALOGIX_INGEST_URL
  global.fetch = jest.fn(async () => okResponse()) as any
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

describe('lalogixPayload', () => {
  it('reports the invoice exactly as issued, dated in India time', () => {
    const p = lalogixPayload(invoice())
    expect(p.external_id).toBe('11111111-2222-3333-4444-555555555555')
    expect(p.number).toBe('VIVK/26-27/00001')
    expect(p.date).toBe('2026-11-13')
    expect(p.customer).toEqual({ name: 'Priya Sharma', email: 'priya@example.com', country: 'India' })
    expect(p.items).toHaveLength(1)
    expect(p.items[0]).toMatchObject({ sac: '998431', quantity: 1, rate: 846.61, gst_rate: 18 })
    expect(p.items[0].description).toContain('VIVK Pro plan')
    expect(p.items[0].description).toContain('discount code WELCOME200')
    expect(p.total).toBe(999)
    expect(p.payment).toEqual({ date: '2026-11-13', amount: 999, method: 'other', reference: 'order_ABC123' })
  })

  it('istDate converts UTC timestamps to the Indian calendar date', () => {
    expect(istDate('2026-03-31T18:29:59.000Z')).toBe('2026-03-31')
    expect(istDate('2026-03-31T18:30:00.000Z')).toBe('2026-04-01')
  })
})

describe('syncInvoiceToLalogix', () => {
  it('posts to LALogix with the product key and marks the invoice synced', async () => {
    await expect(syncInvoiceToLalogix(invoice())).resolves.toBe('synced')
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe('https://lalogix.com/api/ingest/v1/invoices')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer lxk_test')
    expect(JSON.parse(init.body).number).toBe('VIVK/26-27/00001')
    expect(rawQuery).toHaveBeenCalledWith('UPDATE invoices SET lalogix_synced_at = NOW() WHERE id = ?', ['11111111-2222-3333-4444-555555555555'])
  })

  it('treats "unchanged" (already in LALogix) as synced and honours a custom URL', async () => {
    process.env.LALOGIX_INGEST_URL = 'http://localhost:8000/api/ingest/v1/'
    global.fetch = jest.fn(async () => okResponse(200, { outcome: 'unchanged' })) as any
    await expect(syncInvoiceToLalogix(invoice())).resolves.toBe('synced')
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('http://localhost:8000/api/ingest/v1/invoices')
  })

  it('skips receipts (no GSTIN) and does nothing without a key', async () => {
    await expect(syncInvoiceToLalogix(invoice({ gstin: null }))).resolves.toBe('skipped')
    delete process.env.LALOGIX_API_KEY
    await expect(syncInvoiceToLalogix(invoice())).resolves.toBe('skipped')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('leaves the invoice unsynced when LALogix rejects it or is unreachable, without throwing', async () => {
    global.fetch = jest.fn(async () => okResponse(422, { error: 'total does not match' })) as any
    await expect(syncInvoiceToLalogix(invoice())).resolves.toBe('failed')
    global.fetch = jest.fn(async () => { throw new Error('ECONNREFUSED') }) as any
    await expect(syncInvoiceToLalogix(invoice())).resolves.toBe('failed')
    expect(rawQuery).not.toHaveBeenCalledWith(expect.stringContaining('UPDATE invoices SET lalogix_synced_at'), expect.anything())
  })
})

describe('syncPendingInvoices', () => {
  it('sends unsynced tax invoices oldest first and reports what is left', async () => {
    const pending = [invoice({ id: 'a', invoice_number: 'VIVK/26-27/00001' }), invoice({ id: 'b', invoice_number: 'VIVK/26-27/00002' })]
    rawQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('information_schema')) return [{ n: 0 }]
      if (sql.startsWith('SELECT * FROM invoices')) return pending
      if (sql.includes('COUNT(*) AS n FROM invoices')) return [{ n: 1 }]
      return []
    })
    global.fetch = jest.fn()
      .mockResolvedValueOnce(okResponse(201))
      .mockResolvedValueOnce(okResponse(422, { error: 'bad' })) as any

    // Fresh module: the "column exists" check is cached per process.
    let fresh!: typeof import('../lalogix')
    jest.isolateModules(() => { fresh = require('../lalogix') })
    const result = await fresh.syncPendingInvoices()
    expect(result).toEqual({ synced: 1, failed: 1, remaining: 1, configured: true })
    // Adds the tracking column on first use
    expect(rawQuery).toHaveBeenCalledWith(expect.stringContaining('ALTER TABLE invoices ADD COLUMN lalogix_synced_at'))
    expect(rawQuery.mock.calls.find(([sql]) => sql.startsWith('SELECT * FROM invoices'))[0]).toContain('gstin IS NOT NULL AND lalogix_synced_at IS NULL ORDER BY created_at')
  })

  it('does nothing when LALogix is not configured', async () => {
    delete process.env.LALOGIX_API_KEY
    await expect(syncPendingInvoices()).resolves.toEqual({ synced: 0, failed: 0, remaining: 0, configured: false })
    expect(rawQuery).not.toHaveBeenCalled()
  })
})
