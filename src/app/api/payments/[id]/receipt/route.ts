import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { paymentDb } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentId } = await params
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // paymentId is already extracted from params above

    // Get payment and verify ownership
    const payments = await paymentDb.getByUserId(session.user.id)
    const payment = payments.find(p => p.id === paymentId)

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    if (payment.status.toLowerCase() !== 'success' && payment.status.toLowerCase() !== 'captured') {
      return NextResponse.json(
        { error: 'Receipt not available for this payment' },
        { status: 400 }
      )
    }

    // Generate receipt data (in a real app, you might use a PDF library)
    const receiptData = {
      receiptId: `VIVK-${payment.id.slice(-8).toUpperCase()}`,
      paymentId: payment.id,
      razorpayPaymentId: payment.razorpay_payment_id,
      amount: payment.amount,
      amountDisplay: `₹${(payment.amount / 100).toLocaleString('en-IN')}`, // Convert paise to rupees
      status: payment.status,
      createdAt: payment.created_at,
      description: 'VIVK Subscription',
      customerEmail: session.user.email,
      companyName: 'VIVK Technologies',
      companyAddress: 'India',
      taxAmount: Math.round(payment.amount * 0.18), // 18% GST
      baseAmount: Math.round(payment.amount * 0.82)
    }

    // For now, return JSON receipt data
    // In production, you would generate a PDF using libraries like puppeteer or jsPDF
    return NextResponse.json({
      receipt: receiptData,
      downloadUrl: `/api/payments/${paymentId}/receipt/pdf` // Future PDF endpoint
    })

  } catch (error) {
    console.error('Error generating receipt:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}