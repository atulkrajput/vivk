import { Resend } from 'resend'
import { getInvoiceSettings, formatRupees, invoiceUrl, GST_RATE_PERCENT, type Invoice } from './invoices'

// Created on first send: the constructor throws without RESEND_API_KEY, and payments import
// this module, so a missing key must not break checkout
let resendClient: Resend | null = null
const resend = {
  emails: {
    send: (...args: Parameters<Resend['emails']['send']>) => {
      resendClient ??= new Resend(process.env.RESEND_API_KEY)
      return resendClient.emails.send(...args)
    },
  },
}

const FROM_EMAIL = 'VIVK <noreply@email.vivk.in>'
const BRAND_COLOR = '#2563eb'

// ─── Welcome Email ───────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Welcome to VIVK — India\'s Smartest AI Assistant',
      html: welcomeTemplate(name),
    })

    if (error) {
      console.error('Failed to send welcome email:', error)
      return false
    }

    console.log('Welcome email sent:', data?.id)
    return true
  } catch (err) {
    console.error('Welcome email error:', err)
    return false
  }
}

// ─── Password Reset Email ────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, name: string, resetLink: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Reset your VIVK password',
      html: resetPasswordTemplate(name, resetLink),
    })

    if (error) {
      console.error('Failed to send reset email:', error)
      return false
    }

    console.log('Reset email sent:', data?.id)
    return true
  } catch (err) {
    console.error('Reset email error:', err)
    return false
  }
}

// ─── Payment Confirmation + Invoice ──────────────────────────────

export async function sendPaymentConfirmationEmail(invoice: Invoice) {
  try {
    const settings = getInvoiceSettings()
    const docName = invoice.gstin ? 'Tax Invoice' : 'Receipt'
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: invoice.customer_email,
      subject: `Payment confirmed: VIVK ${invoice.plan_name} (${docName} ${invoice.invoice_number})`,
      html: paymentConfirmationTemplate(invoice, settings),
    })

    if (error) {
      console.error('Failed to send payment confirmation email:', error)
      return false
    }

    console.log('Payment confirmation email sent:', data?.id)
    return true
  } catch (err) {
    console.error('Payment confirmation email error:', err)
    return false
  }
}

// ─── Email Templates ─────────────────────────────────────────────

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function formatDateIN(value: string | Date) {
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
}

function paymentConfirmationTemplate(invoice: Invoice, settings: ReturnType<typeof getInvoiceSettings>) {
  const firstName = escapeHtml(invoice.customer_name.split(' ')[0] || 'there')
  const docName = invoice.gstin ? 'Tax Invoice' : 'Receipt'
  const link = invoiceUrl(invoice.payment_id)
  const row = (label: string, value: string, strong = false) => `
    <tr>
      <td style="padding:6px 0;color:#6b7280;font-size:14px;">${label}</td>
      <td style="padding:6px 0;color:#111827;font-size:14px;text-align:right;${strong ? 'font-weight:700;' : ''}">${value}</td>
    </tr>`

  return baseLayout(`
    <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:600;">Payment received, thank you! ✅</h2>
    <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.6;">
      Hi ${firstName}, your <strong>VIVK ${escapeHtml(invoice.plan_name)}</strong> plan is now active until
      <strong>${formatDateIN(invoice.period_end)}</strong>.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:#f9fafb;border-radius:8px;border:1px solid #f3f4f6;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 4px;color:#111827;font-size:14px;font-weight:600;">${docName} ${escapeHtml(invoice.invoice_number)}</p>
          <p style="margin:0 0 12px;color:#9ca3af;font-size:12px;">Issued ${formatDateIN(invoice.created_at)} · Order ${escapeHtml(invoice.order_id)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${row(`${escapeHtml(invoice.plan_name)} plan (${formatDateIN(invoice.period_start)} – ${formatDateIN(invoice.period_end)})`, formatRupees(invoice.original_amount))}
            ${invoice.discount_amount > 0 ? row(`Discount${invoice.discount_code ? ` (${escapeHtml(invoice.discount_code)})` : ''}`, `− ${formatRupees(invoice.discount_amount)}`) : ''}
            ${invoice.gstin ? row('Taxable value', formatRupees(invoice.taxable_amount)) : ''}
            ${invoice.gstin ? row(`GST @ ${GST_RATE_PERCENT}% (included)`, formatRupees(invoice.gst_amount)) : ''}
            <tr><td colspan="2" style="border-top:1px solid #e5e7eb;padding-top:6px;"></td></tr>
            ${row('Total paid', formatRupees(invoice.total_amount), true)}
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
      <tr>
        <td style="background-color:${BRAND_COLOR};border-radius:8px;">
          <a href="${link}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
            View / Download ${docName}
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
      Sold by ${escapeHtml(settings.businessName)}${settings.gstin ? ` · GSTIN ${escapeHtml(settings.gstin)}` : ''}.
      Questions about this payment? Write to ${escapeHtml(settings.supportEmail)}.
    </p>
  `)
}

function baseLayout(content: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND_COLOR},#1d4ed8);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:1px;">VIVK</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:12px;">India's Smartest AI Assistant</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #eaeaea;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 VIVK. Made with ❤️ in India.</p>
              <p style="margin:8px 0 0;color:#9ca3af;font-size:11px;">
                You received this email because you have an account on vivk.in
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function welcomeTemplate(name: string) {
  const firstName = name.split(' ')[0]
  return baseLayout(`
    <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:600;">Welcome aboard, ${firstName}! 🎉</h2>
    <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.6;">
      Thanks for joining VIVK. You now have access to India's smartest AI assistant — built to help you work faster, create better content, and automate everyday tasks.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background-color:#f9fafb;border-radius:8px;border:1px solid #f3f4f6;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 12px;color:#111827;font-size:14px;font-weight:600;">Here's what you can do:</p>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="padding:4px 0;color:#4b5563;font-size:14px;">✍️ &nbsp;Create content — blogs, emails, social posts</td></tr>
            <tr><td style="padding:4px 0;color:#4b5563;font-size:14px;">💻 &nbsp;Get coding help — debug, explain, write code</td></tr>
            <tr><td style="padding:4px 0;color:#4b5563;font-size:14px;">💼 &nbsp;Automate tasks — reports, contracts, analysis</td></tr>
            <tr><td style="padding:4px 0;color:#4b5563;font-size:14px;">📚 &nbsp;Learn anything — research, study, explore</td></tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.6;">
      Your free plan includes <strong>20 messages per day</strong>. Need more? Upgrade to Pro for unlimited messages at just ₹999/month.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        <td style="background-color:${BRAND_COLOR};border-radius:8px;">
          <a href="${process.env.NEXTAUTH_URL || 'https://vivk.in'}/chat" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
            Start Chatting →
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;text-align:center;">
      Questions? Just reply to this email — we're happy to help.
    </p>
  `)
}

function resetPasswordTemplate(name: string, resetLink: string) {
  const firstName = name.split(' ')[0] || 'there'
  return baseLayout(`
    <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:600;">Reset your password</h2>
    <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.6;">
      Hi ${firstName}, we received a request to reset your VIVK account password. Click the button below to set a new one.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
      <tr>
        <td style="background-color:${BRAND_COLOR};border-radius:8px;">
          <a href="${resetLink}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
            Reset Password
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 12px;color:#4b5563;font-size:14px;line-height:1.6;">
      This link will expire in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email — your password won't change.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;background-color:#fef3c7;border-radius:8px;border:1px solid #fde68a;">
      <tr>
        <td style="padding:14px 18px;">
          <p style="margin:0;color:#92400e;font-size:13px;">
            ⚠️ Never share this link with anyone. VIVK will never ask for your password via email.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${resetLink}" style="color:${BRAND_COLOR};word-break:break-all;font-size:12px;">${resetLink}</a>
    </p>
  `)
}
