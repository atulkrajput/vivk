import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Payment & Refund Policy — VIVK',
  description: 'VIVK Payment and Refund Policy. Understand our billing, cancellation, and refund procedures.',
}

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-vivk-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 vivk-glass border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center">
              <Image src="/vivk_logo.png" alt="VIVK" width={247} height={85} className="h-[85px] w-auto" priority />
            </Link>
            <Link href="/" className="text-sm font-medium text-slate-600 hover:text-vivk-navy transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="vivk-card p-8 md:p-12">
          <h1 className="text-3xl font-bold text-vivk-navy mb-2">Payment & Refund Policy</h1>
          <p className="text-sm text-slate-500 mb-8">Last updated: August 24, 2026</p>

          <div className="prose prose-slate max-w-none space-y-8 text-[15px] leading-relaxed text-slate-700">
            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">1. Overview</h2>
              <p>
                This Payment and Refund Policy outlines the terms related to payments, billing cycles, cancellations, and refunds for VIVK subscription plans. By subscribing to any paid plan, you agree to the terms described below.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">2. Subscription Plans & Pricing</h2>
              <p>VIVK offers the following subscription tiers:</p>
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-vivk-navy">Plan</th>
                      <th className="text-left px-4 py-3 font-semibold text-vivk-navy">Price</th>
                      <th className="text-left px-4 py-3 font-semibold text-vivk-navy">Billing Cycle</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-slate-100">
                      <td className="px-4 py-3">Free</td>
                      <td className="px-4 py-3">&#8377;0</td>
                      <td className="px-4 py-3">N/A</td>
                    </tr>
                    <tr className="border-t border-slate-100">
                      <td className="px-4 py-3">Pro</td>
                      <td className="px-4 py-3">&#8377;999/month</td>
                      <td className="px-4 py-3">Monthly</td>
                    </tr>
                    <tr className="border-t border-slate-100">
                      <td className="px-4 py-3">Business</td>
                      <td className="px-4 py-3">&#8377;4,999/month</td>
                      <td className="px-4 py-3">Monthly</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3">
                All prices are in Indian Rupees (INR) and inclusive of applicable taxes. We reserve the right to modify pricing with at least 30 days&apos; advance notice to active subscribers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">3. Payment Methods</h2>
              <p>Payments are processed securely through Razorpay. We accept:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>UPI (Google Pay, PhonePe, Paytm, etc.)</li>
                <li>Credit Cards (Visa, Mastercard, RuPay)</li>
                <li>Debit Cards</li>
                <li>Net Banking (all major Indian banks)</li>
                <li>Mobile Wallets</li>
              </ul>
              <p className="mt-3">
                We do not store your card details on our servers. All payment information is handled directly by Razorpay in compliance with PCI-DSS standards.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">4. Billing Cycle</h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Paid subscriptions are billed on a monthly recurring basis from the date of initial purchase.</li>
                <li>Your subscription will automatically renew at the end of each billing period unless cancelled.</li>
                <li>You will receive a payment confirmation via email for each successful transaction.</li>
                <li>Failed payment attempts may result in temporary suspension of premium features until payment is resolved.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">5. Free Trial</h2>
              <p>
                New Pro plan subscribers may be eligible for a 7-day free trial. During the trial period:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>You will have full access to Pro features.</li>
                <li>No payment will be charged during the trial period.</li>
                <li>If you do not cancel before the trial ends, your subscription will convert to a paid plan and your selected payment method will be charged.</li>
                <li>Free trials are limited to one per user/account.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">6. Cancellation</h2>
              <p>You may cancel your subscription at any time:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Through your account settings in the Dashboard &gt; Billing section.</li>
                <li>By contacting our support team at support@vivk.in.</li>
              </ul>
              <p className="mt-3">Upon cancellation:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>You will retain access to premium features until the end of your current billing period.</li>
                <li>Your account will automatically downgrade to the Free plan after the billing period expires.</li>
                <li>No further charges will be made to your payment method.</li>
                <li>Your conversation history and data will be retained according to the Free plan limits (7-day history).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">7. Refund Policy</h2>
              <h3 className="text-base font-semibold text-vivk-navy mt-4 mb-2">7.1 Eligibility</h3>
              <p>Refunds are available under the following conditions:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Within 7 days of payment:</strong> Full refund if you are unsatisfied with the Service and have not exceeded 50% of your plan&apos;s usage for that billing cycle.</li>
                <li><strong>Service unavailability:</strong> If the Service experiences extended downtime (more than 48 continuous hours) during your billing period, you may request a pro-rated refund for the affected period.</li>
                <li><strong>Duplicate charges:</strong> If you are charged multiple times for the same billing period due to a technical error, the duplicate amount will be refunded in full.</li>
              </ul>

              <h3 className="text-base font-semibold text-vivk-navy mt-4 mb-2">7.2 Non-Refundable Situations</h3>
              <p>Refunds will not be provided in the following cases:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Requests made after 7 days from the payment date.</li>
                <li>Accounts terminated due to violation of Terms of Service.</li>
                <li>Partial month usage after the 7-day refund window.</li>
                <li>Dissatisfaction with AI-generated output quality (as AI outputs vary and are provided &quot;as is&quot;).</li>
                <li>Change of mind after extensive usage of the Service.</li>
              </ul>

              <h3 className="text-base font-semibold text-vivk-navy mt-4 mb-2">7.3 How to Request a Refund</h3>
              <p>To request a refund:</p>
              <ol className="list-decimal pl-5 space-y-1.5">
                <li>Email us at <strong>support@vivk.in</strong> with the subject line &quot;Refund Request.&quot;</li>
                <li>Include your registered email address, transaction ID, and reason for the refund.</li>
                <li>Our team will review your request within 3-5 business days.</li>
              </ol>

              <h3 className="text-base font-semibold text-vivk-navy mt-4 mb-2">7.4 Refund Processing</h3>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Approved refunds will be processed to the original payment method.</li>
                <li>Refunds typically take 5-10 business days to reflect in your account, depending on your bank or payment provider.</li>
                <li>You will receive an email confirmation once the refund has been initiated.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">8. Plan Upgrades & Downgrades</h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Upgrades:</strong> When upgrading from Free to Pro or Pro to Business, you will be charged immediately for the new plan. Access to upgraded features is granted instantly.</li>
                <li><strong>Downgrades:</strong> When downgrading, you will retain your current plan features until the end of the billing period, after which the lower plan takes effect.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">9. Failed Payments</h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>If a recurring payment fails, we will attempt to charge your payment method up to 3 times over the following 7 days.</li>
                <li>You will be notified via email about the failed payment and asked to update your payment information.</li>
                <li>If payment cannot be collected after all retry attempts, your subscription will be cancelled and your account will revert to the Free plan.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">10. Disputes</h2>
              <p>
                If you believe a charge is incorrect or unauthorized, please contact us at support@vivk.in within 30 days of the transaction. We will investigate and resolve the issue promptly.
              </p>
              <p className="mt-3">
                We encourage you to reach out to us before initiating a chargeback with your bank, as we are committed to resolving any billing concerns directly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">11. Contact Us</h2>
              <p>
                For any payment or refund-related queries, please contact us at:
              </p>
              <p className="mt-2">
                <strong>Email:</strong> support@vivk.in<br />
                <strong>Website:</strong> https://www.vivk.in<br />
                <strong>Response time:</strong> Within 24-48 hours on business days
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-500">
          <p>&copy; 2026 VIVK. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-vivk-navy transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-vivk-navy transition-colors">Terms of Service</Link>
            <Link href="/refund-policy" className="text-vivk-blue font-medium">Refund Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
