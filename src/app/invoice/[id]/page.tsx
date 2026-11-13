import { notFound, redirect } from 'next/navigation'
import Image from 'next/image'
import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { getInvoiceForUser } from '@/lib/invoice-access'
import { getInvoiceSettings, formatRupees, GST_RATE_PERCENT, SAC_CODE } from '@/lib/invoices'
import { PrintButton } from './PrintButton'

export const metadata: Metadata = { title: 'Invoice — VIVK', robots: { index: false } }

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/invoice/${id}`)}`)
  }

  const invoice = await getInvoiceForUser(id, session.user.id).catch((error) => {
    console.error('Invoice page error:', error)
    return null
  })
  if (!invoice) notFound()

  const settings = getInvoiceSettings()
  const isTaxInvoice = !!invoice.gstin
  const docName = isTaxInvoice ? 'Tax Invoice' : 'Receipt'

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 print:bg-white print:p-0">
      <div className="max-w-3xl mx-auto mb-4 flex justify-end gap-2 print:hidden">
        <PrintButton />
      </div>

      <article className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8 sm:p-10 print:shadow-none print:border-0 print:rounded-none">
        <header className="flex flex-wrap items-start justify-between gap-6 pb-6 border-b border-slate-200">
          <div>
            <Image src="/vivk_logo.png" alt="VIVK" width={124} height={43} className="h-[40px] w-auto" />
            <p className="mt-3 text-sm font-semibold text-slate-900">{settings.businessName}</p>
            {settings.addressLines.map((line) => (
              <p key={line} className="text-xs text-slate-600">{line}</p>
            ))}
            {invoice.gstin && <p className="text-xs text-slate-600 mt-1">GSTIN: <span className="font-mono">{invoice.gstin}</span></p>}
            <p className="text-xs text-slate-600">{settings.supportEmail}</p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-slate-900">{docName}</h1>
            <p className="mt-2 text-sm text-slate-600">No. <span className="font-mono font-semibold text-slate-900">{invoice.invoice_number}</span></p>
            <p className="text-sm text-slate-600">Date: {formatDate(invoice.created_at)}</p>
            <p className="text-xs text-slate-500 mt-1">Order: <span className="font-mono">{invoice.order_id}</span></p>
          </div>
        </header>

        <section className="py-6 border-b border-slate-200">
          <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Billed to</p>
          <p className="text-sm font-semibold text-slate-900">{invoice.customer_name}</p>
          <p className="text-sm text-slate-600">{invoice.customer_email}</p>
        </section>

        <section className="py-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                <th className="py-2 font-medium">Description</th>
                {isTaxInvoice && <th className="py-2 font-medium">SAC</th>}
                <th className="py-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-3">
                  <p className="font-medium text-slate-900">VIVK {invoice.plan_name} plan — 1 month</p>
                  <p className="text-xs text-slate-500">{formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}</p>
                </td>
                {isTaxInvoice && <td className="py-3 font-mono text-slate-600">{SAC_CODE}</td>}
                <td className="py-3 text-right text-slate-900">{formatRupees(invoice.original_amount)}</td>
              </tr>
              {invoice.discount_amount > 0 && (
                <tr className="border-b border-slate-100">
                  <td className="py-3 text-slate-600" colSpan={isTaxInvoice ? 2 : 1}>
                    Discount{invoice.discount_code ? <> (<span className="font-mono">{invoice.discount_code}</span>)</> : null}
                  </td>
                  <td className="py-3 text-right text-slate-600">− {formatRupees(invoice.discount_amount)}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-4 ml-auto max-w-xs space-y-1.5 text-sm">
            {isTaxInvoice && (
              <>
                <div className="flex justify-between text-slate-600"><span>Taxable value</span><span>{formatRupees(invoice.taxable_amount)}</span></div>
                <div className="flex justify-between text-slate-600"><span>GST @ {GST_RATE_PERCENT}%</span><span>{formatRupees(invoice.gst_amount)}</span></div>
              </>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-200 text-base font-bold text-slate-900">
              <span>Total paid</span><span>{formatRupees(invoice.total_amount)}</span>
            </div>
            <p className="text-xs text-slate-500 text-right">Paid online via Razorpay</p>
          </div>
        </section>

        <footer className="pt-6 border-t border-slate-200 text-xs text-slate-500 space-y-1">
          {isTaxInvoice
            ? <p>Prices are inclusive of GST. This is a computer-generated invoice and does not need a signature.</p>
            : <p>This is a computer-generated receipt and does not need a signature.</p>}
          <p>Questions about this payment? Write to {settings.supportEmail}.</p>
        </footer>
      </article>
    </div>
  )
}
