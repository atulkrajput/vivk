import { NextRequest, NextResponse } from 'next/server'
import { syncPendingInvoices } from '@/lib/lalogix'

// GET /api/cron/lalogix-sync — send tax invoices that are not yet in LALogix (retries
// failures and back-fills invoices issued before the sync existed). Run daily by Vercel Cron,
// which sends "Authorization: Bearer $CRON_SECRET"; can also be called by hand with that header.
// Safe to repeat: LALogix ignores invoices it already has.
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await syncPendingInvoices({ budgetMs: 20000 })
    if (!result.configured) {
      return NextResponse.json({ ...result, message: 'LALOGIX_API_KEY is not set; nothing sent.' })
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('LALogix sync failed:', error)
    return NextResponse.json({ error: 'LALogix sync failed' }, { status: 500 })
  }
}
