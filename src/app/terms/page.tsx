import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — VIVK',
  description: 'VIVK Terms of Service. Read the terms and conditions for using the VIVK AI workspace platform.',
}

export default function TermsOfServicePage() {
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
          <h1 className="text-3xl font-bold text-vivk-navy mb-2">Terms of Service</h1>
          <p className="text-sm text-slate-500 mb-8">Last updated: August 24, 2026</p>

          <div className="prose prose-slate max-w-none space-y-8 text-[15px] leading-relaxed text-slate-700">
            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing or using VIVK (&quot;the Service&quot;), operated by VIVK (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not access or use the Service.
              </p>
              <p>
                We reserve the right to update these Terms at any time. We will notify you of material changes by posting the revised Terms on this page. Your continued use of the Service after changes are posted constitutes your acceptance of the updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">2. Description of Service</h2>
              <p>
                VIVK is an AI-powered workspace platform that provides conversational AI assistance for writing, research, coding, business automation, and everyday productivity. The Service is accessible at vivk.in and related domains.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">3. Account Registration</h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>You must provide accurate, complete, and current information when creating an account.</li>
                <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
                <li>You are responsible for all activities that occur under your account.</li>
                <li>You must be at least 13 years old to create an account.</li>
                <li>One person may not maintain more than one free account.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">4. Subscription Plans and Payments</h2>
              <h3 className="text-base font-semibold text-vivk-navy mt-4 mb-2">4.1 Plans</h3>
              <p>VIVK offers the following subscription tiers:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Free:</strong> 20 queries per day, basic AI model, 7-day chat history</li>
                <li><strong>Pro (&#8377;999/month):</strong> Unlimited queries, advanced AI model, unlimited history, priority support</li>
                <li><strong>Business (&#8377;4,999/month):</strong> All Pro features plus team collaboration, API access, custom integrations, dedicated support</li>
              </ul>

              <h3 className="text-base font-semibold text-vivk-navy mt-4 mb-2">4.2 Billing</h3>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Paid subscriptions are billed monthly through Razorpay.</li>
                <li>Prices are in Indian Rupees (INR) and include applicable taxes.</li>
                <li>We reserve the right to change pricing with 30 days&apos; notice.</li>
              </ul>

              <h3 className="text-base font-semibold text-vivk-navy mt-4 mb-2">4.3 Cancellation and Refunds</h3>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>You may cancel your subscription at any time through your account settings.</li>
                <li>Upon cancellation, you retain access until the end of your current billing period.</li>
                <li>Refunds are provided at our discretion and only for unused portions of the current billing period if requested within 7 days of payment.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">5. Acceptable Use</h2>
              <p>You agree not to use the Service to:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Violate any applicable law or regulation</li>
                <li>Generate harmful, abusive, threatening, or harassing content</li>
                <li>Generate content that infringes on intellectual property rights</li>
                <li>Attempt to reverse-engineer, decompile, or extract AI model weights</li>
                <li>Use automated tools to scrape or bulk-access the Service</li>
                <li>Circumvent rate limits or usage restrictions</li>
                <li>Impersonate others or misrepresent your affiliation</li>
                <li>Distribute malware or engage in phishing</li>
                <li>Generate content involving the exploitation of minors</li>
                <li>Use the Service for spam or unsolicited bulk communications</li>
              </ul>
              <p>
                We reserve the right to suspend or terminate accounts that violate these terms without notice or refund.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">6. Intellectual Property</h2>
              <h3 className="text-base font-semibold text-vivk-navy mt-4 mb-2">6.1 Your Content</h3>
              <p>
                You retain ownership of the content you input into the Service. You grant us a limited license to process your content solely for the purpose of providing the Service.
              </p>

              <h3 className="text-base font-semibold text-vivk-navy mt-4 mb-2">6.2 AI-Generated Output</h3>
              <p>
                To the extent permitted by law, you own the output generated by the AI in response to your inputs. However, similar outputs may be generated for other users based on similar inputs. We make no guarantee of uniqueness.
              </p>

              <h3 className="text-base font-semibold text-vivk-navy mt-4 mb-2">6.3 Our Property</h3>
              <p>
                The Service, including its design, branding, code, and documentation, is the property of VIVK and protected by intellectual property laws. You may not copy, modify, or distribute any part of the Service without our written permission.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">7. Disclaimers</h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>The Service is provided &quot;as is&quot; without warranties of any kind, express or implied.</li>
                <li>AI-generated content may contain errors, inaccuracies, or biases. You are responsible for verifying important information.</li>
                <li>We do not guarantee uninterrupted or error-free operation of the Service.</li>
                <li>We do not guarantee that AI outputs will be suitable for any particular purpose.</li>
                <li>The Service is not a substitute for professional advice (legal, medical, financial, etc.).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">8. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, VIVK shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities, arising from your use of the Service.
              </p>
              <p>
                Our total liability for any claims arising from the Service shall not exceed the amount you paid to us in the 12 months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">9. Account Termination</h2>
              <p>
                We may suspend or terminate your account if you violate these Terms or if required by law. You may delete your account at any time through your account settings. Upon deletion:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Your personal data will be deleted within 30 days</li>
                <li>Conversation history will be permanently removed</li>
                <li>Active subscriptions will be cancelled with no refund for the remaining period</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">10. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts in India.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">11. Severability</h2>
              <p>
                If any provision of these Terms is found to be unenforceable, the remaining provisions shall remain in full force and effect.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">12. Contact</h2>
              <p>
                For questions about these Terms of Service, please contact us at:
              </p>
              <p className="mt-2">
                <strong>Email:</strong> support@vivk.in<br />
                <strong>Website:</strong> https://www.vivk.in
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
            <Link href="/terms" className="text-vivk-blue font-medium">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
