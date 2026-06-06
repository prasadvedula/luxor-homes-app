'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import {
  CreditCard, CheckCircle, Clock, AlertTriangle, XCircle,
  IndianRupee, Copy, Check, Smartphone, ExternalLink, Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useApi } from '@/lib/use-api'
import Script from 'next/script'
import QRCode from 'qrcode'

type Payment = {
  id: string | null
  ownerId: string
  flatLabel: string
  residentName: string
  amount: number
  month: number
  year: number
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'WAIVED'
  paidAt: string | null
  method: string | null
  utrNumber: string | null
  razorpayOrderId: string | null
  createdAt: string | null
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const statusConfig = {
  PAID:    { label: 'Paid',    color: '#4ade80', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.3)',   Icon: CheckCircle  },
  PENDING: { label: 'Due',     color: '#facc15', bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.25)',  Icon: Clock         },
  OVERDUE: { label: 'Overdue', color: '#f87171', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)',   Icon: AlertTriangle },
  WAIVED:  { label: 'Waived',  color: '#94a3b8', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.25)', Icon: XCircle     },
}

// ── UPI helpers ───────────────────────────────────────────────────────────────
const UPI_ID   = process.env.NEXT_PUBLIC_UPI_ID   ?? ''
const UPI_NAME = process.env.NEXT_PUBLIC_UPI_NAME ?? 'Luxor Homes'

function buildUpiLink(amount: number, month: number, year: number, flat: string) {
  const note = encodeURIComponent(`Maintenance ${MONTHS[month - 1].slice(0, 3)} ${year} Flat ${flat}`)
  return `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${amount}&cu=INR&tn=${note}`
}

// Android intent URL — reliably opens installed UPI apps
function buildAndroidIntent(upiLink: string) {
  return `intent://${upiLink.replace('upi://', '')}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`
}

export default function PaymentsPage() {
  const { data: session } = useSession()
  const api = useApi()
  const [current, setCurrent]     = useState<Payment | null>(null)
  const [history, setHistory]     = useState<Payment[]>([])
  const [defaultAmount, setDefaultAmount] = useState(2500)
  const [pageLoading, setPageLoading]     = useState(true)
  const [payMode, setPayMode]     = useState<'upi' | 'razorpay'>('upi')
  const [rzpReady, setRzpReady]   = useState(false)
  const [paying, setPaying]       = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [utr, setUtr]             = useState('')
  const [utrStep, setUtrStep]     = useState(false)  // show UTR input after scanning
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied]       = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')
  const rzpConfigured = !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID

  const now      = new Date()
  const curMonth = now.getMonth() + 1
  const curYear  = now.getFullYear()

  const load = useCallback(async () => {
    setPageLoading(true)
    const [ensureRes, histRes] = await Promise.all([
      api('/payments/ensure-current', { method: 'POST' }),
      api('/payments/my'),
    ])
    if (ensureRes.ok) setCurrent(await ensureRes.json())
    if (histRes.ok) {
      const { payments, defaultAmount: da } = await histRes.json()
      setHistory(payments)
      if (da) setDefaultAmount(da)
    }
    setPageLoading(false)
  }, [api])

  useEffect(() => { load() }, [load])

  // Build QR code whenever current payment changes
  useEffect(() => {
    if (!current || current.status === 'PAID' || current.status === 'WAIVED') return
    if (!UPI_ID) return
    const link = buildUpiLink(current.amount, current.month, current.year, current.flatLabel)
    QRCode.toDataURL(link, { width: 240, margin: 2, color: { dark: '#050D1A', light: '#EEF2FF' } })
      .then(setQrDataUrl)
      .catch(() => {})
  }, [current])

  function copyUpiId() {
    navigator.clipboard?.writeText(UPI_ID)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function openUpiApp() {
    if (!current) return
    const link = buildUpiLink(current.amount, current.month, current.year, current.flatLabel)
    // Try direct UPI scheme first; Android fallback to intent
    window.location.href = link
    setTimeout(() => { setUtrStep(true) }, 2000)
  }

  async function submitUtr() {
    if (!utr.trim() || utr.trim().length < 6) { setError('Enter a valid UTR / transaction reference'); return }
    setSubmitting(true); setError('')
    const res = await api('/payments/submit-utr', { method: 'POST', body: JSON.stringify({ utrNumber: utr.trim() }) })
    setSubmitting(false)
    if (res.ok) {
      setSuccess('Transaction reference submitted! Admin will verify and confirm your payment.')
      setUtrStep(false); setUtr('')
      load()
    } else {
      const e = await res.json().catch(() => ({}))
      setError(e.error || 'Failed to submit. Please try again.')
    }
  }

  // Razorpay flow
  async function handleRazorpay() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any).Razorpay) { setError('Payment gateway loading…'); return }
    setPaying(true); setError('')
    const orderRes = await api('/payments/create-order', { method: 'POST' })
    if (!orderRes.ok) {
      const e = await orderRes.json().catch(() => ({}))
      setError(e.error || 'Failed to initiate payment')
      setPaying(false); return
    }
    const { orderId, amount, currency, keyId, prefill } = await orderRes.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rzp = new (window as any).Razorpay({
      key: keyId, amount, currency,
      name: 'Luxor Homes',
      description: `Maintenance — ${MONTHS[curMonth - 1]} ${curYear}`,
      order_id: orderId, prefill,
      theme: { color: '#C9A84C' },
      handler: async (response: Record<string, string>) => {
        const verRes = await api('/payments/verify', { method: 'POST', body: JSON.stringify(response) })
        if (verRes.ok) { setSuccess('Payment successful!'); load() }
        else setError('Payment confirmed by gateway but record update failed. Contact admin.')
        setPaying(false)
      },
      modal: { ondismiss: () => setPaying(false) },
    })
    rzp.open()
  }

  const cfg = current ? statusConfig[current.status] : null
  const canPay = current && (current.status === 'PENDING' || current.status === 'OVERDUE')
  const pendingUtr = current && current.utrNumber && current.status !== 'PAID'

  return (
    <>
      {rzpConfigured && <Script src="https://checkout.razorpay.com/v1/checkout.js" onReady={() => setRzpReady(true)} />}

      <div className="space-y-6">
        {/* Header */}
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: '#C9A84C', letterSpacing: '0.08em' }}>PAYMENTS</p>
          <h1 className="font-display text-3xl font-bold text-white flex items-center gap-3">
            <CreditCard className="w-7 h-7" style={{ color: '#C9A84C' }} />
            Maintenance
          </h1>
          <p className="text-sm mt-1" style={{ color: '#7B8FAD' }}>Monthly society maintenance payments</p>
        </div>

        {pageLoading ? (
          [1, 2].map(i => <div key={i} className="skeleton" style={{ height: i === 1 ? 220 : 80, borderRadius: 14, animationDelay: `${i * 0.1}s` }} />)
        ) : current && cfg ? (
          <>
            {/* Status card */}
            <div className="glass p-6" style={{ borderColor: cfg.border, background: cfg.bg }}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-bold mb-1" style={{ color: '#7B8FAD', letterSpacing: '0.08em' }}>
                    {MONTHS[curMonth - 1].toUpperCase()} {curYear}
                  </p>
                  <div className="flex items-center gap-2">
                    <cfg.Icon className="w-5 h-5" style={{ color: cfg.color }} />
                    <p className="text-lg font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end" style={{ color: cfg.color }}>
                    <IndianRupee className="w-5 h-5" />
                    <span className="font-display text-3xl font-bold">{defaultAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: '#7B8FAD' }}>Due: {MONTHS[curMonth - 1].slice(0, 3)} 5, {curYear}</p>
                </div>
              </div>

              {/* Paid */}
              {current.status === 'PAID' && (
                <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)' }}>
                  <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#4ade80' }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#4ade80' }}>Payment received — thank you!</p>
                    {current.paidAt && <p className="text-xs mt-0.5" style={{ color: '#4A5E7A' }}>
                      {format(new Date(current.paidAt), 'dd MMM yyyy, hh:mm a')} · via {current.method}
                    </p>}
                  </div>
                </div>
              )}

              {/* Waived */}
              {current.status === 'WAIVED' && (
                <p className="text-sm" style={{ color: '#94a3b8' }}>Payment waived by admin for this month.</p>
              )}

              {/* UTR pending verification */}
              {pendingUtr && (
                <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)' }}>
                  <Clock className="w-4 h-4 flex-shrink-0" style={{ color: '#facc15' }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#facc15' }}>Payment pending admin verification</p>
                    <p className="text-xs mt-0.5" style={{ color: '#7B8FAD' }}>UTR: {current.utrNumber}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Payment options */}
            {canPay && !pendingUtr && (
              <div className="glass p-5 space-y-5">
                {/* Mode tabs */}
                {rzpConfigured && (
                  <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'rgba(7,16,30,0.6)', border: '1px solid rgba(201,168,76,0.1)' }}>
                    {(['upi', 'razorpay'] as const).map(m => (
                      <button key={m} onClick={() => setPayMode(m)}
                        className="flex-1 py-2 rounded-md text-xs font-semibold transition-all capitalize"
                        style={payMode === m ? { background: 'rgba(201,168,76,0.15)', color: '#E8C55A', border: '1px solid rgba(201,168,76,0.25)' } : { color: '#7B8FAD' }}>
                        {m === 'upi' ? 'UPI / QR Code' : 'Cards / Net Banking'}
                      </button>
                    ))}
                  </div>
                )}

                {/* Error / success */}
                {error && <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>{error}</div>}
                {success && <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}>{success}</div>}

                {/* ── UPI payment ── */}
                {payMode === 'upi' && (
                  <div className="space-y-4">
                    {!UPI_ID ? (
                      <p className="text-sm text-center" style={{ color: '#f87171' }}>
                        UPI ID not configured. Contact admin.
                      </p>
                    ) : utrStep ? (
                      // UTR entry step
                      <div className="space-y-3 animate-scale-in">
                        <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                          <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#4ade80' }} />
                          <p className="text-sm" style={{ color: '#4ade80' }}>Payment sent? Enter the 12-digit UTR from your UPI app.</p>
                        </div>
                        <div>
                          <label className="lux-label">Transaction Reference (UTR)</label>
                          <input
                            className="lux-input"
                            placeholder="e.g. 405612345678"
                            value={utr}
                            onChange={e => setUtr(e.target.value)}
                            maxLength={30}
                          />
                          <p className="text-xs mt-1.5" style={{ color: '#4A5E7A' }}>
                            Find UTR in your UPI app → Transaction History → tap the payment
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={submitUtr} disabled={submitting} className="btn-gold flex-1 justify-center">
                            {submitting ? <><span className="spinner spinner-sm" /> Submitting…</> : <><Send className="w-4 h-4" /> Submit Reference</>}
                          </button>
                          <button onClick={() => setUtrStep(false)} className="btn-ghost">Back</button>
                        </div>
                      </div>
                    ) : (
                      // QR + pay buttons
                      <div className="space-y-4">
                        {/* UPI ID display */}
                        <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(7,16,30,0.8)', border: '1px solid rgba(201,168,76,0.2)' }}>
                          <div>
                            <p className="text-xs mb-0.5" style={{ color: '#7B8FAD' }}>Pay to UPI ID</p>
                            <p className="font-mono font-bold text-white">{UPI_ID}</p>
                            <p className="text-xs mt-0.5" style={{ color: '#7B8FAD' }}>{UPI_NAME}</p>
                          </div>
                          <button onClick={copyUpiId} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={{ background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(201,168,76,0.1)', color: copied ? '#4ade80' : '#C9A84C', border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(201,168,76,0.2)'}` }}>
                            {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                          </button>
                        </div>

                        {/* Amount reminder */}
                        <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}>
                          <p className="text-sm" style={{ color: '#7B8FAD' }}>Amount to pay</p>
                          <div className="flex items-center gap-1" style={{ color: '#E8C55A' }}>
                            <IndianRupee className="w-4 h-4" />
                            <span className="font-display font-bold text-lg">{current.amount.toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        {/* QR code */}
                        {qrDataUrl && (
                          <div className="flex flex-col items-center gap-2">
                            <p className="text-xs" style={{ color: '#7B8FAD' }}>Scan with any UPI app</p>
                            <div className="p-3 rounded-2xl" style={{ background: '#EEF2FF' }}>
                              <img src={qrDataUrl} alt="UPI QR Code" width={220} height={220} />
                            </div>
                            <p className="text-xs text-center" style={{ color: '#4A5E7A' }}>
                              GPay · PhonePe · Paytm · BHIM · Any UPI App
                            </p>
                          </div>
                        )}

                        {/* Open UPI app button (mobile) */}
                        <button onClick={openUpiApp} className="btn-gold w-full justify-center py-3">
                          <Smartphone className="w-4 h-4" /> Open UPI App to Pay
                        </button>

                        {/* Already paid? Enter UTR */}
                        <button onClick={() => setUtrStep(true)}
                          className="w-full text-center text-sm py-2 rounded-xl transition-all"
                          style={{ color: '#C9A84C', border: '1px dashed rgba(201,168,76,0.3)' }}>
                          Already paid? Enter transaction reference →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Razorpay ── */}
                {payMode === 'razorpay' && rzpConfigured && (
                  <div className="space-y-3">
                    <p className="text-xs" style={{ color: '#7B8FAD' }}>Pay securely via Razorpay — UPI, Debit/Credit Cards, Net Banking, Wallets</p>
                    <button onClick={handleRazorpay} disabled={paying || !rzpReady} className="btn-gold w-full justify-center py-3.5 text-base">
                      {paying ? <><span className="spinner spinner-sm" /> Processing…</> : <><IndianRupee className="w-4 h-4" /> Pay ₹{defaultAmount.toLocaleString('en-IN')} via Razorpay</>}
                    </button>
                    <p className="text-xs text-center" style={{ color: '#3A4E6A' }}>256-bit SSL secured · PCI-DSS compliant</p>
                  </div>
                )}
              </div>
            )}

            {/* Already submitted UTR but want to resubmit */}
            {canPay && pendingUtr && !utrStep && (
              <button onClick={() => { setUtrStep(true); setSuccess('') }} className="btn-ghost w-full justify-center">
                Update Transaction Reference
              </button>
            )}
          </>
        ) : null}

        {/* Payment history */}
        {!pageLoading && history.length > 0 && (
          <div>
            <p className="text-xs font-bold mb-4" style={{ color: '#4A5E7A', letterSpacing: '0.08em' }}>PAYMENT HISTORY</p>
            <div className="space-y-2">
              {history.map((p, i) => {
                const s = statusConfig[p.status]
                return (
                  <div key={`${p.month}-${p.year}`}
                    className="glass p-4 flex items-center justify-between gap-4 animate-fade-up"
                    style={{ animationDelay: `${i * 0.04}s` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                        <s.Icon className="w-4 h-4" style={{ color: s.color }} />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{MONTHS[p.month - 1]} {p.year}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#7B8FAD' }}>
                          {p.paidAt ? `Paid ${format(new Date(p.paidAt), 'dd MMM')} · ${p.method}` :
                           p.utrNumber ? `UTR submitted · awaiting verification` : s.label}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold" style={{ color: s.color }}>₹{p.amount.toLocaleString('en-IN')}</p>
                      <span className={cn('badge text-xs', {
                        'badge-green': p.status === 'PAID',
                        'badge-yellow': p.status === 'PENDING',
                        'badge-red': p.status === 'OVERDUE',
                        'badge-gray': p.status === 'WAIVED',
                      })}>{s.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
