'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  CreditCard, CheckCircle, Clock, AlertTriangle, XCircle, CircleDollarSign,
  IndianRupee, Send,
} from 'lucide-react'
import { format } from 'date-fns'
import { useApi } from '@/lib/use-api'
import Script from 'next/script'

type Payment = {
  id: string | null
  ownerId: string
  flatLabel: string
  residentName: string
  amount: number
  paidAmount: number
  month: number
  year: number
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'WAIVED'
  paidAt: string | null
  method: string | null
  utrNumber: string | null
  razorpayOrderId: string | null
  createdAt: string | null
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const statusConfig = {
  PAID:    { label: 'Fully Paid',     color: '#4ade80', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)',   Icon: CheckCircle     },
  PARTIAL: { label: 'Partially Paid', color: '#fb923c', bg: 'rgba(251,146,60,0.08)',  border: 'rgba(251,146,60,0.25)',  Icon: CircleDollarSign },
  PENDING: { label: 'Due',            color: '#facc15', bg: 'rgba(234,179,8,0.06)',   border: 'rgba(234,179,8,0.2)',    Icon: Clock            },
  OVERDUE: { label: 'Overdue',        color: '#f87171', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)',   Icon: AlertTriangle    },
  WAIVED:  { label: 'Waived',         color: '#94a3b8', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)',  Icon: XCircle          },
}

export default function PaymentsPage() {
  useSession()
  const api = useApi()

  const [current, setCurrent]   = useState<Payment | null>(null)
  const [history, setHistory]   = useState<Payment[]>([])
  const [, setDefaultAmount] = useState(2500)
  const [pageLoading, setPageLoading] = useState(true)
  const [rzpReady, setRzpReady] = useState(false)
  const [paying, setPaying]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [utr, setUtr]           = useState('')
  const [utrStep, setUtrStep]   = useState(false)
  const [payInput, setPayInput] = useState('')   // amount resident wants to pay now
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  const now      = new Date()
  const curMonth = now.getMonth() + 1
  const curYear  = now.getFullYear()

  const load = useCallback(async () => {
    setPageLoading(true)
    const [ensureRes, histRes] = await Promise.all([
      api('/payments/ensure-current', { method: 'POST' }),
      api('/payments/my'),
    ])
    if (ensureRes.ok) {
      const p: Payment = await ensureRes.json()
      setCurrent(p)
      // Default pay input to remaining balance
      const rem = p.amount - (p.paidAmount ?? 0)
      setPayInput(String(rem > 0 ? rem : ''))
    }
    if (histRes.ok) {
      const { payments, defaultAmount: da } = await histRes.json()
      setHistory(payments)
      if (da) setDefaultAmount(da)
    }
    setPageLoading(false)
  }, [api])

  useEffect(() => { load() }, [load])

  // ── Razorpay ────────────────────────────────────────────────────────────────
  async function handleRazorpay() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any).Razorpay) { setError('Payment gateway loading…'); return }
    const amt = parseFloat(payInput)
    if (!amt || amt <= 0) { setError('Enter a valid amount to pay'); return }
    if (current && amt > current.amount - (current.paidAmount ?? 0)) {
      setError('Amount exceeds remaining balance'); return
    }
    setPaying(true); setError('')

    const orderRes = await api('/payments/create-order', {
      method: 'POST',
      body: JSON.stringify({ payAmount: amt }),
    })
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
        if (verRes.ok) {
          const { remaining } = await verRes.json()
          setSuccess(remaining > 0
            ? `₹${amt.toLocaleString('en-IN')} paid! ₹${remaining.toLocaleString('en-IN')} remaining.`
            : 'Payment complete — fully paid!')
          load()
        } else {
          setError('Payment confirmed by gateway but record update failed. Contact admin.')
        }
        setPaying(false)
      },
      modal: { ondismiss: () => setPaying(false) },
    })
    rzp.open()
  }

  // ── UTR submit ──────────────────────────────────────────────────────────────
  async function submitUtr() {
    if (!utr.trim() || utr.trim().length < 6) { setError('Enter a valid UTR / transaction reference'); return }
    const amt = parseFloat(payInput)
    setSubmitting(true); setError('')
    const res = await api('/payments/submit-utr', {
      method: 'POST',
      body: JSON.stringify({ utrNumber: utr.trim(), amountPaid: amt || undefined }),
    })
    setSubmitting(false)
    if (res.ok) {
      setSuccess('Transaction reference submitted! Admin will verify and confirm.')
      setUtrStep(false); setUtr('')
      load()
    } else {
      const e = await res.json().catch(() => ({}))
      setError(e.error || 'Failed to submit. Please try again.')
    }
  }

  const cfg       = current ? statusConfig[current.status] : null
  const remaining = current ? current.amount - (current.paidAmount ?? 0) : 0
  const paidPct   = current && current.amount > 0 ? Math.round(((current.paidAmount ?? 0) / current.amount) * 100) : 0
  const canPay    = current && (current.status === 'PENDING' || current.status === 'OVERDUE' || current.status === 'PARTIAL')
  const pendingUtr = current && current.utrNumber && current.status !== 'PAID'

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onReady={() => setRzpReady(true)} />

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
            {/* ── Status card ── */}
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
                  <p className="text-xs mb-1" style={{ color: '#7B8FAD' }}>Total due</p>
                  <div className="flex items-center gap-1 justify-end" style={{ color: '#E8C55A' }}>
                    <IndianRupee className="w-4 h-4" />
                    <span className="font-display text-2xl font-bold">{current.amount.toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: '#7B8FAD' }}>
                    Due: {MONTHS[curMonth - 1].slice(0, 3)} 5, {curYear}
                  </p>
                </div>
              </div>

              {/* Partial payment progress */}
              {(current.paidAmount ?? 0) > 0 && current.status !== 'PAID' && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1.5" style={{ color: '#7B8FAD' }}>
                    <span>Paid: <strong style={{ color: '#4ade80' }}>₹{(current.paidAmount ?? 0).toLocaleString('en-IN')}</strong></span>
                    <span>Remaining: <strong style={{ color: cfg.color }}>₹{remaining.toLocaleString('en-IN')}</strong></span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${paidPct}%`, background: 'linear-gradient(90deg,#4ade80,#22c55e)' }} />
                  </div>
                  <p className="text-xs mt-1 text-right" style={{ color: '#7B8FAD' }}>{paidPct}% paid</p>
                </div>
              )}

              {/* Fully paid */}
              {current.status === 'PAID' && (
                <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)' }}>
                  <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#4ade80' }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#4ade80' }}>Fully paid — thank you!</p>
                    {current.paidAt && (
                      <p className="text-xs mt-0.5" style={{ color: '#4A5E7A' }}>
                        {format(new Date(current.paidAt), 'dd MMM yyyy, hh:mm a')} · via {current.method}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Waived */}
              {current.status === 'WAIVED' && (
                <p className="text-sm" style={{ color: '#94a3b8' }}>Payment waived by admin for this month.</p>
              )}

              {/* UTR pending */}
              {pendingUtr && (
                <div className="flex items-center gap-2 p-3 rounded-xl mt-2" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)' }}>
                  <Clock className="w-4 h-4 flex-shrink-0" style={{ color: '#facc15' }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#facc15' }}>UTR submitted — pending verification</p>
                    <p className="text-xs mt-0.5" style={{ color: '#7B8FAD' }}>UTR: {current.utrNumber}</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Payment options ── */}
            {canPay && !pendingUtr && (
              <div className="glass p-5 space-y-5">
                <p className="text-sm font-semibold text-white">Make a Payment</p>

                {/* Amount input */}
                <div>
                  <label className="lux-label">
                    Amount to pay now
                    {remaining < current.amount && (
                      <span className="ml-2 text-xs font-normal" style={{ color: '#7B8FAD' }}>
                        (remaining: ₹{remaining.toLocaleString('en-IN')})
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: '#C9A84C' }}>₹</span>
                    <input
                      type="number"
                      className="lux-input pl-8"
                      placeholder={String(remaining)}
                      value={payInput}
                      min={1}
                      max={remaining}
                      onChange={e => setPayInput(e.target.value)}
                    />
                  </div>
                  {/* Quick-fill buttons */}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {remaining !== current.amount && (
                      <button onClick={() => setPayInput(String(remaining))}
                        className="text-xs px-3 py-1 rounded-lg transition-all"
                        style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}>
                        Full remaining ₹{remaining.toLocaleString('en-IN')}
                      </button>
                    )}
                    {[500, 1000, 1500, 2000].filter(v => v < remaining).map(v => (
                      <button key={v} onClick={() => setPayInput(String(v))}
                        className="text-xs px-3 py-1 rounded-lg transition-all"
                        style={{ background: 'rgba(201,168,76,0.06)', color: '#7B8FAD', border: '1px solid rgba(201,168,76,0.12)' }}>
                        ₹{v.toLocaleString('en-IN')}
                      </button>
                    ))}
                    {remaining === current.amount && (
                      <button onClick={() => setPayInput(String(remaining))}
                        className="text-xs px-3 py-1 rounded-lg transition-all"
                        style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}>
                        Pay full ₹{remaining.toLocaleString('en-IN')}
                      </button>
                    )}
                  </div>
                </div>

                {/* Error / success */}
                {error   && <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)',  border: '1px solid rgba(239,68,68,0.25)',  color: '#f87171' }}>{error}</div>}
                {success && <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}>{success}</div>}

                {/* Pay via Razorpay */}
                {!utrStep && (
                  <div className="space-y-3">
                    <button onClick={handleRazorpay} disabled={paying || !rzpReady || !payInput}
                      className="btn-gold w-full justify-center py-3.5 text-base">
                      {paying
                        ? <><span className="spinner spinner-sm" /> Processing…</>
                        : <><IndianRupee className="w-4 h-4" /> Pay ₹{(parseFloat(payInput) || 0).toLocaleString('en-IN')} via Razorpay</>}
                    </button>
                    <p className="text-xs text-center" style={{ color: '#3A4E6A' }}>256-bit SSL · UPI · Cards · Net Banking</p>

                    {/* Or submit UTR */}
                    <button onClick={() => { setUtrStep(true); setError(''); setSuccess('') }}
                      className="w-full text-center text-sm py-2 rounded-xl transition-all"
                      style={{ color: '#C9A84C', border: '1px dashed rgba(201,168,76,0.3)' }}>
                      Already paid via bank transfer? Submit reference →
                    </button>
                  </div>
                )}

                {/* UTR entry */}
                {utrStep && (
                  <div className="space-y-3 animate-scale-in">
                    <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                      <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#4ade80' }} />
                      <p className="text-sm" style={{ color: '#4ade80' }}>Enter the UTR / transaction reference from your bank.</p>
                    </div>
                    <div>
                      <label className="lux-label">Transaction Reference (UTR)</label>
                      <input className="lux-input" placeholder="e.g. 405612345678"
                        value={utr} onChange={e => setUtr(e.target.value)} maxLength={30} />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={submitUtr} disabled={submitting} className="btn-gold flex-1 justify-center">
                        {submitting ? <><span className="spinner spinner-sm" /> Submitting…</> : <><Send className="w-4 h-4" /> Submit</>}
                      </button>
                      <button onClick={() => setUtrStep(false)} className="btn-ghost">Back</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Update UTR reference */}
            {canPay && pendingUtr && (
              <button onClick={() => { setUtrStep(true); setSuccess('') }} className="btn-ghost w-full justify-center">
                Update Transaction Reference
              </button>
            )}
          </>
        ) : null}

        {/* ── Payment history ── */}
        {!pageLoading && history.length > 0 && (
          <div>
            <p className="text-xs font-bold mb-4" style={{ color: '#4A5E7A', letterSpacing: '0.08em' }}>PAYMENT HISTORY</p>
            <div className="space-y-2">
              {history.map((p, i) => {
                const s = statusConfig[p.status]
                const rem = p.amount - (p.paidAmount ?? 0)
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
                          {p.status === 'PAID'
                            ? `Paid ${p.paidAt ? format(new Date(p.paidAt), 'dd MMM') : ''} · ${p.method}`
                            : p.status === 'PARTIAL'
                              ? `₹${(p.paidAmount ?? 0).toLocaleString('en-IN')} paid · ₹${rem.toLocaleString('en-IN')} remaining`
                              : p.utrNumber ? 'UTR submitted · pending verification' : s.label}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold" style={{ color: s.color }}>
                        {p.status === 'PARTIAL'
                          ? `₹${rem.toLocaleString('en-IN')}`
                          : `₹${p.amount.toLocaleString('en-IN')}`}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#4A5E7A' }}>
                        {p.status === 'PARTIAL' ? 'remaining' : 'total'}
                      </p>
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
