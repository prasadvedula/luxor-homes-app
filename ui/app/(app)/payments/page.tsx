'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { CreditCard, CheckCircle, Clock, AlertTriangle, XCircle, IndianRupee, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useApi } from '@/lib/use-api'
import Script from 'next/script'

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
  razorpayOrderId: string | null
  createdAt: string | null
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const statusConfig = {
  PAID:    { label: 'Paid',    color: '#4ade80', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.3)',   Icon: CheckCircle  },
  PENDING: { label: 'Due',     color: '#facc15', bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.25)',  Icon: Clock         },
  OVERDUE: { label: 'Overdue', color: '#f87171', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)',   Icon: AlertTriangle },
  WAIVED:  { label: 'Waived',  color: '#94a3b8', bg: 'rgba(100,116,139,0.1)','border': 'rgba(100,116,139,0.25)', Icon: XCircle    },
}

export default function PaymentsPage() {
  const { data: session } = useSession()
  const api = useApi()
  const [current, setCurrent] = useState<Payment | null>(null)
  const [history, setHistory] = useState<Payment[]>([])
  const [defaultAmount, setDefaultAmount] = useState(2500)
  const [paying, setPaying] = useState(false)
  const [paid, setPaid] = useState(false)
  const [error, setError] = useState('')
  const [pageLoading, setPageLoading] = useState(true)
  const [rzpReady, setRzpReady] = useState(false)

  const now = new Date()
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
      setDefaultAmount(da)
    }
    setPageLoading(false)
  }, [api])

  useEffect(() => { load() }, [load])

  async function handlePay() {
    if (!(window as unknown as Record<string, unknown>).Razorpay) {
      setError('Payment gateway is loading. Please wait a moment and try again.')
      return
    }
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
      key: keyId,
      amount,
      currency,
      name: 'Luxor Homes',
      description: `Maintenance — ${MONTHS[curMonth - 1]} ${curYear}`,
      order_id: orderId,
      prefill,
      theme: { color: '#C9A84C' },
      handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        const verRes = await api('/payments/verify', { method: 'POST', body: JSON.stringify(response) })
        if (verRes.ok) {
          setPaid(true)
          setCurrent(prev => prev ? { ...prev, status: 'PAID', paidAt: new Date().toISOString(), method: 'online' } : prev)
          load()
        } else {
          setError('Payment verified by gateway but confirmation failed. Contact admin.')
        }
        setPaying(false)
      },
      modal: {
        ondismiss: () => setPaying(false),
      },
    })
    rzp.on('payment.failed', (resp: unknown) => {
      console.error('Payment failed', resp)
      setError('Payment failed. Please try again.')
      setPaying(false)
    })
    rzp.open()
  }

  const cfg = current ? statusConfig[current.status] : null

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onReady={() => setRzpReady(true)}
      />

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

        {/* Current month card */}
        {pageLoading ? (
          <div className="skeleton" style={{ height: 200, borderRadius: 14 }} />
        ) : current && cfg ? (
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
                <p className="text-xs mt-1" style={{ color: '#7B8FAD' }}>
                  Due: {MONTHS[curMonth - 1].slice(0, 3)} 5, {curYear}
                </p>
              </div>
            </div>

            {current.status === 'PAID' ? (
              <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)' }}>
                <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#4ade80' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#4ade80' }}>Payment received — thank you!</p>
                  {current.paidAt && <p className="text-xs mt-0.5" style={{ color: '#4A5E7A' }}>
                    Paid on {format(new Date(current.paidAt), 'dd MMM yyyy, hh:mm a')} via {current.method}
                  </p>}
                </div>
              </div>
            ) : current.status === 'WAIVED' ? (
              <p className="text-sm" style={{ color: '#94a3b8' }}>Payment waived by admin for this month.</p>
            ) : (
              <div className="space-y-3">
                {error && (
                  <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                    {error}
                  </div>
                )}
                {paid ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)' }}>
                    <CheckCircle className="w-4 h-4" style={{ color: '#4ade80' }} />
                    <p className="text-sm font-semibold" style={{ color: '#4ade80' }}>Payment successful!</p>
                  </div>
                ) : (
                  <button
                    onClick={handlePay}
                    disabled={paying || !rzpReady}
                    className="btn-gold w-full justify-center py-3.5 text-base"
                  >
                    {paying ? (
                      <><span className="spinner spinner-sm" /> Processing…</>
                    ) : (
                      <><IndianRupee className="w-4 h-4" /> Pay ₹{defaultAmount.toLocaleString('en-IN')} via Razorpay</>
                    )}
                  </button>
                )}
                <p className="text-xs text-center" style={{ color: '#3A4E6A' }}>
                  Secured by Razorpay · UPI · Cards · Net Banking · Wallets
                </p>
              </div>
            )}
          </div>
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
                        <p className="text-white font-medium text-sm">
                          {MONTHS[p.month - 1]} {p.year}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#7B8FAD' }}>
                          {p.paidAt ? `Paid ${format(new Date(p.paidAt), 'dd MMM')} · ${p.method}` : s.label}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold" style={{ color: s.color }}>
                        ₹{p.amount.toLocaleString('en-IN')}
                      </p>
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
