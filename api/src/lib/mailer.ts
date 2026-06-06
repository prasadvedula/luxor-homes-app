import nodemailer from 'nodemailer'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function createTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
}

export async function sendMaintenanceReminder(opts: {
  to: string
  name: string
  flat: string
  amount: number
  month: number
  year: number
  type: 'monthly' | 'overdue'
}) {
  const transport = createTransport()
  if (!transport) {
    console.log(`[REMINDER] Email not configured — would send to ${opts.to} (${opts.name}, Flat ${opts.flat})`)
    return
  }

  const monthLabel = `${MONTHS[opts.month - 1]} ${opts.year}`
  const subject = opts.type === 'overdue'
    ? `🔴 Overdue: Luxor Homes Maintenance — ${monthLabel}`
    : `📋 Reminder: Luxor Homes Maintenance Due — ${monthLabel}`

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#050D1A;color:#EEF2FF;border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#C9A84C,#E8C55A);padding:24px;text-align:center">
      <h1 style="margin:0;color:#050D1A;font-size:20px">Luxor Homes</h1>
      <p style="margin:4px 0 0;color:#050D1A;font-size:13px;opacity:.8">Society Management</p>
    </div>
    <div style="padding:28px">
      <p style="font-size:16px">Dear <strong>${opts.name}</strong>,</p>
      ${opts.type === 'overdue'
        ? `<p style="color:#f87171;font-size:15px">⚠️ Your maintenance payment for <strong>${monthLabel}</strong> is <strong>overdue</strong>.</p>`
        : `<p style="font-size:15px">This is a friendly reminder that your maintenance payment for <strong>${monthLabel}</strong> is due.</p>`
      }
      <div style="background:#0B1628;border:1px solid rgba(201,168,76,.2);border-radius:10px;padding:20px;margin:20px 0">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="color:#7B8FAD;padding:6px 0">Flat</td><td style="text-align:right;color:#E8C55A;font-weight:700">${opts.flat}</td></tr>
          <tr><td style="color:#7B8FAD;padding:6px 0">Month</td><td style="text-align:right">${monthLabel}</td></tr>
          <tr><td style="color:#7B8FAD;padding:6px 0">Amount</td><td style="text-align:right;color:#4ade80;font-size:18px;font-weight:700">₹${opts.amount.toLocaleString('en-IN')}</td></tr>
          <tr><td style="color:#7B8FAD;padding:6px 0">Due Date</td><td style="text-align:right">${opts.month < 10 ? '0' + opts.month : opts.month}/05/${opts.year}</td></tr>
        </table>
      </div>
      <div style="text-align:center;margin:24px 0">
        <a href="https://luxor-homes-api-production.up.railway.app/payments"
           style="background:linear-gradient(135deg,#C9A84C,#E8C55A);color:#050D1A;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block">
          Pay Now via App
        </a>
      </div>
      <p style="font-size:13px;color:#7B8FAD">Open the Luxor Homes app → Payments to complete your payment securely via Razorpay.</p>
    </div>
    <div style="padding:16px 28px;border-top:1px solid rgba(201,168,76,.1);font-size:12px;color:#3A4E6A;text-align:center">
      Luxor Homes Residents Society · Do not reply to this email
    </div>
  </div>`

  await transport.sendMail({
    from: process.env.SMTP_FROM || `"Luxor Homes" <${process.env.SMTP_USER}>`,
    to: opts.to,
    subject,
    html,
  })

  console.log(`[REMINDER] Sent ${opts.type} reminder to ${opts.to} (${opts.name}, Flat ${opts.flat})`)
}
