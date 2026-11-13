// Find (or issue, for payments completed before invoices existed) the invoice for a user's payment
import { paymentDb } from './db'
import { paymentService } from './payments'
import { getInvoiceByPaymentId, issueInvoice, type Invoice } from './invoices'

export async function getInvoiceForUser(paymentId: string, userId: string): Promise<Invoice | null> {
  const payments = await paymentDb.getByUserId(userId)
  const payment = payments.find((p) => p.id === paymentId)
  if (!payment || payment.status !== 'completed') return null

  const existing = await getInvoiceByPaymentId(payment.id)
  if (existing) return existing

  const params = await paymentService.invoiceParamsForPayment(payment)
  return params ? issueInvoice(params) : null
}
