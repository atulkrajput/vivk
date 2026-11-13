import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getInvoiceForUser } from '@/lib/invoice-access'

// GET /api/payments/[id]/receipt - Invoice for a completed payment (the printable page is /invoice/[id])
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentId } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invoice = await getInvoiceForUser(paymentId, session.user.id)
    if (!invoice) {
      return NextResponse.json({ error: 'Receipt not available for this payment' }, { status: 404 })
    }

    return NextResponse.json({
      invoice: {
        invoiceNumber: invoice.invoice_number,
        type: invoice.gstin ? 'tax_invoice' : 'receipt',
        planName: invoice.plan_name,
        originalAmount: invoice.original_amount,
        discountAmount: invoice.discount_amount,
        discountCode: invoice.discount_code,
        taxableAmount: invoice.taxable_amount,
        gstAmount: invoice.gst_amount,
        totalAmount: invoice.total_amount,
        periodStart: invoice.period_start,
        periodEnd: invoice.period_end,
        issuedAt: invoice.created_at,
      },
      viewUrl: `/invoice/${paymentId}`,
    })
  } catch (error) {
    console.error('Error generating receipt:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
