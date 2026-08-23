import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — VIVK',
  description: 'VIVK Privacy Policy. Learn how we collect, use, and protect your personal information.',
}

export default function PrivacyPolicyPage() {
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
          <h1 className="text-3xl font-bold text-vivk-navy mb-2">Privacy Policy</h1>
          <p className="text-sm text-slate-500 mb-8">Last updated: August 24, 2026</p>

          <div className="prose prose-slate max-w-none space-y-8 text-[15px] leading-relaxed text-slate-700">
            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">1. Introduction</h2>
              <p>
                VIVK (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI workspace platform at vivk.in (the &quot;Service&quot;).
              </p>
              <p>
                By accessing or using the Service, you agree to this Privacy Policy. If you do not agree, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">2. Information We Collect</h2>
              <h3 className="text-base font-semibold text-vivk-navy mt-4 mb-2">2.1 Information You Provide</h3>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Account information: name, email address, phone number, and address (optional)</li>
                <li>Payment information: processed securely through Razorpay (we do not store card details)</li>
                <li>Conversations: messages and content you create using the Service</li>
                <li>Support requests: information provided when contacting support</li>
              </ul>

              <h3 className="text-base font-semibold text-vivk-navy mt-4 mb-2">2.2 Information Collected Automatically</h3>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Device information: browser type, operating system, device identifiers</li>
                <li>Usage data: pages visited, features used, session duration</li>
                <li>IP address and approximate location</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">3. How We Use Your Information</h2>
              <p>We use collected information to:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Provide, maintain, and improve the Service</li>
                <li>Process transactions and send related information</li>
                <li>Send transactional emails (account verification, password resets, billing)</li>
                <li>Respond to support requests</li>
                <li>Monitor usage patterns to improve performance and reliability</li>
                <li>Detect, prevent, and address technical issues and security threats</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">4. AI Conversations and Data</h2>
              <p>
                Your conversations with VIVK are stored to provide chat history and context features. We do not use your conversation data to train AI models. Conversations are encrypted in transit and at rest.
              </p>
              <p>
                Free tier users&apos; conversations are retained for 7 days. Pro and Business users have unlimited history retention. You can delete your conversations at any time through the application interface.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">5. Data Sharing and Disclosure</h2>
              <p>We do not sell your personal information. We may share information with:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Service providers:</strong> Third-party vendors who assist in operating the Service (hosting, payments, email delivery, AI processing)</li>
                <li><strong>AI providers:</strong> Conversation content is sent to Anthropic (Claude) for processing. Anthropic does not retain or train on this data per our agreement.</li>
                <li><strong>Legal requirements:</strong> When required by law, legal process, or to protect our rights and safety</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">6. Data Security</h2>
              <p>
                We implement industry-standard security measures including:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>HTTPS/TLS encryption for all data in transit</li>
                <li>Encrypted database storage</li>
                <li>Secure password hashing (bcrypt)</li>
                <li>Rate limiting and DDoS protection</li>
                <li>Regular security audits</li>
              </ul>
              <p>
                While we strive to protect your information, no method of electronic transmission or storage is 100% secure. We cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">7. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Delete your account and associated data</li>
                <li>Export your conversations</li>
                <li>Opt out of marketing communications</li>
              </ul>
              <p>
                To exercise these rights, use the account settings in your dashboard or contact us at support@vivk.in.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">8. Cookies</h2>
              <p>
                We use essential cookies for authentication and session management. We also use analytics cookies (Google Analytics) to understand how users interact with the Service. You can disable non-essential cookies through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">9. Children&apos;s Privacy</h2>
              <p>
                The Service is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13. If we learn that we have collected data from a child under 13, we will delete it promptly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page and updating the &quot;Last updated&quot; date. Continued use of the Service after changes constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vivk-navy mb-3">11. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy, please contact us at:
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
            <Link href="/privacy" className="text-vivk-blue font-medium">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-vivk-navy transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
