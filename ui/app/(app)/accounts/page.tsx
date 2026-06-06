'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  CreditCard, CheckCircle, Clock, AlertTriangle, IndianRupee,
  ChevronLeft, ChevronRight, Check, X, Shield, Banknote, RefreshCw, Plus, Trash2, Phone, KeyRound, Eye, EyeOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useApi } from '@/lib/use-api'

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
  note: string | null
}

type Summary = {
  month: number; year: number; totalOwners: number
  paid: number; overdue: number; pending: number; waived: number
  unpaidCount: number; collected: number; outstanding: number; amount: number
}

type Manager = { id: string; name: string; phone: string; mustChangePassword: boolean; createdAt: string }

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const statusConfig = {
  PAID:    { label: 'Paid',    color: '#4ade80', badge: 'badge-green',  Icon: CheckCircle  },
  PENDING: { label: 'Due',     color: '#facc15', badge: 'badge-yellow', Icon: Clock         },
  OVERDUE: { label: 'Overdue', color: '#f87171', badge: 'badge-red',    Icon: AlertTriangle },
  WAIVED:  { label: 'Waived',  color: '#94a3b8', badge: 'badge-gray',   Icon: X             },
}

export default function AccountsPage() {
  const { data: session } = useSession()
  const api = useApi()

  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [payments, setPayments] = useState<Payment[]>([])
  const [summary,  setSummary]  = useState<Summary | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'OVERDUE'>('ALL')
  const [pageLoading, setPageLoading] = useState(true)
  const [refreshing, setRefreshing]   = useState(false)
  const [markingId, setMarkingId]     = useState<string | null>(null)
  const [activeTab, setActiveTab]     = useState<'payments' | 'managers'>('payments')

  // Accounts managers (admin only)
  const [managers, setManagers] = useState<Manager[]>([])
  const [showManagerForm, setShowManagerForm] = useState(false)
  const [mgrForm, setMgrForm] = useState({ name: '', phone: '', defaultPassword: '' })
  const [mgrLoading, setMgrLoading] = useState(false)
  const [showMgrPwd, setShowMgrPwd] = useState(false)

  const role = session?.user?.role
  const isAdmin = role === 'ADMIN'

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    const [pRes, sRes] = await Promise.all([
      api(`/payments/all?month=${month}&year=${year}`),
      api(`/payments/summary?month=${month}&year=${year}`),
    ])
    if (pRes.ok) { const d = await pRes.json(); setPayments(d.payments) }
    if (sRes.ok) setSummary(await sRes.json())
    setRefreshing(false)
    setPageLoading(false)
  }, [api, month, year])

  useEffect(() => { fetchData() }, [fetchData])

  const fetchManagers = useCallback(async () => {
    const res = await api('/admin/accounts-managers')
    if (res.ok) setManagers(await res.json())
  }, [api])

  useEffect(() => { if (isAdmin && activeTab === 'managers') fetchManagers() }, [isAdmin, activeTab, fetchManagers])

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    const n = new Date(); if (year > n.getFullYear() || (year === n.getFullYear() && month >= n.getMonth() + 1)) return
    if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  async function markPaid(p: Payment, method: 'cash' | 'bank_transfer') {
    setMarkingId(p.ownerId)
    const res = await api('/payments/mark-paid', {
      method: 'POST',
      body: JSON.stringify({ ownerId: p.ownerId, month, year, method }),
    })
    if (res.ok) fetchData(true)
    setMarkingId(null)
  }

  async function waive(p: Payment) {
    if (!confirm(`Waive maintenance for ${p.residentName} (Flat ${p.flatLabel})?`)) return
    const res = await api('/payments/waive', { method: 'POST', body: JSON.stringify({ ownerId: p.ownerId, month, year }) })
    if (res.ok) fetchData(true)
  }

  async function generate() {
    if (!confirm(`Generate payment records for all residents for ${MONTHS[month - 1]} ${year}?`)) return
    await api('/payments/generate', { method: 'POST', body: JSON.stringify({ month, year }) })
    fetchData(true)
  }

  async function addManager(e: React.FormEvent) {
    e.preventDefault(); setMgrLoading(true)
    const res = await api('/admin/accounts-managers', { method: 'POST', body: JSON.stringify(mgrForm) })
    if (res.ok) {
      const m = await res.json()
      setManagers(prev => [...prev, m])
      setShowManagerForm(false); setMgrForm({ name: '', phone: '', defaultPassword: '' })
    }
    setMgrLoading(false)
  }

  async function removeManager(id: string, name: string) {
    if (!confirm(`Remove accounts manager ${name}?`)) return
    const res = await api(`/admin/accounts-managers/${id}`, { method: 'DELETE' })
    if (res.ok) setManagers(prev => prev.filter(m => m.id !== id))
  }

  const displayed = filter === 'ALL' ? payments : payments.filter(p => p.status === filter)
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: '#C9A84C', letterSpacing: '0.08em' }}>
            {role === 'ACCOUNTS' ? 'ACCOUNTS' : 'ADMIN'}
          </p>
          <h1 className="font-display text-3xl font-bold text-white flex items-center gap-3">
            <CreditCard className="w-7 h-7" style={{ color: '#C9A84C' }} />
            Accounts
          </h1>
          <p className="text-sm mt-1" style={{ color: '#7B8FAD' }}>Maintenance payment management</p>
        </div>
        <button onClick={() => fetchData()} disabled={refreshing}
          className="p-2.5 rounded-xl transition-all"
          style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C' }}>
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Admin tabs */}
      {isAdmin && (
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(7,16,30,0.6)', border: '1px solid rgba(201,168,76,0.1)' }}>
          {(['payments', 'managers'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all"
              style={activeTab === t ? { background: 'rgba(201,168,76,0.15)', color: '#E8C55A', border: '1px solid rgba(201,168,76,0.25)' } : { color: '#7B8FAD' }}>
              {t === 'payments' ? 'Payments' : 'Accounts Managers'}
            </button>
          ))}
        </div>
      )}

      {/* ── PAYMENTS TAB ── */}
      {activeTab === 'payments' && (
        <>
          {/* Month navigator */}
          <div className="flex items-center justify-between glass p-4">
            <button onClick={prevMonth} className="p-2 rounded-xl ripple" style={{ color: '#C9A84C' }}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <p className="font-display text-xl font-bold text-white">{MONTHS[month - 1]} {year}</p>
              {isCurrentMonth && <p className="text-xs mt-0.5" style={{ color: '#C9A84C' }}>Current Month</p>}
            </div>
            <button onClick={nextMonth} className="p-2 rounded-xl ripple" style={{ color: isCurrentMonth ? '#3A4E6A' : '#C9A84C' }}>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Summary cards */}
          {summary && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Collected',    value: `₹${(summary.collected / 1000).toFixed(0)}k`,  sub: `${summary.paid}/${summary.totalOwners} flats`, color: '#4ade80' },
                { label: 'Outstanding', value: `₹${(summary.outstanding / 1000).toFixed(0)}k`, sub: `${summary.unpaidCount} unpaid`,               color: '#f87171' },
                { label: 'Overdue',     value: summary.overdue,  sub: 'past due date',   color: '#fb923c' },
                { label: 'Pending',     value: summary.pending,  sub: 'not yet due',     color: '#facc15' },
              ].map(s => (
                <div key={s.label} className="glass p-4">
                  <p className="text-xs font-semibold mb-1" style={{ color: '#7B8FAD', letterSpacing: '0.06em' }}>{s.label.toUpperCase()}</p>
                  <p className="font-display text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#3A4E6A' }}>{s.sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* Filters + Generate */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 p-1 rounded-lg flex-1" style={{ background: 'rgba(7,16,30,0.6)', border: '1px solid rgba(201,168,76,0.1)' }}>
              {(['ALL', 'PAID', 'PENDING', 'OVERDUE'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className="flex-1 py-1.5 rounded-md text-xs font-semibold transition-all"
                  style={filter === f ? { background: 'rgba(201,168,76,0.15)', color: '#E8C55A', border: '1px solid rgba(201,168,76,0.25)' } : { color: '#7B8FAD' }}>
                  {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            {isAdmin && (
              <button onClick={generate} className="btn-ghost btn-sm flex-shrink-0">
                <Plus className="w-3.5 h-3.5" /> Generate
              </button>
            )}
          </div>

          {/* Payment rows */}
          {pageLoading ? (
            [1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton skeleton-card" style={{ animationDelay: `${i * 0.06}s` }} />)
          ) : displayed.length === 0 ? (
            <div className="glass p-10 text-center" style={{ color: '#4A5E7A' }}>
              <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No records found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayed.map((p) => {
                const s = statusConfig[p.status]
                const isMarking = markingId === p.ownerId
                return (
                  <div key={`${p.ownerId}-${p.month}-${p.year}`} className="glass p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                          style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}>
                          {p.flatLabel}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-medium text-sm">{p.residentName}</span>
                            <span className={cn('badge text-xs', s.badge)}>{s.label}</span>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: '#7B8FAD' }}>
                            {p.paidAt ? `Paid ${format(new Date(p.paidAt), 'dd MMM')} · ${p.method}` : `Flat ${p.flatLabel}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-bold" style={{ color: s.color }}>
                          ₹{p.amount.toLocaleString('en-IN')}
                        </span>
                        {(p.status === 'PENDING' || p.status === 'OVERDUE') && (
                          <div className="flex gap-1">
                            <button onClick={() => markPaid(p, 'cash')} disabled={isMarking} title="Mark paid (Cash)"
                              className="p-1.5 rounded-lg transition-all"
                              style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}>
                              <Banknote className="w-3.5 h-3.5" />
                            </button>
                            {isAdmin && (
                              <button onClick={() => waive(p)} title="Waive payment"
                                className="p-1.5 rounded-lg transition-all"
                                style={{ background: 'rgba(100,116,139,0.1)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.2)' }}>
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── MANAGERS TAB (admin only) ── */}
      {activeTab === 'managers' && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Accounts Managers</p>
            {!showManagerForm && (
              <button onClick={() => setShowManagerForm(true)} className="btn-gold btn-sm">
                <Plus className="w-3.5 h-3.5" /> Add Manager
              </button>
            )}
          </div>

          {showManagerForm && (
            <div className="glass p-5 space-y-4 animate-scale-in">
              <h3 className="font-semibold text-white text-sm">New Accounts Manager</h3>
              <form onSubmit={addManager} className="space-y-3">
                <div><label className="lux-label">Full Name</label>
                  <input className="lux-input" required placeholder="Manager name"
                    value={mgrForm.name} onChange={e => setMgrForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><label className="lux-label">Mobile Number</label>
                  <div className="relative"><Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#4A5E7A' }} />
                    <input className="lux-input pl-10" required placeholder="9876543210"
                      value={mgrForm.phone} onChange={e => setMgrForm(f => ({ ...f, phone: e.target.value }))} /></div></div>
                <div><label className="lux-label">Default Password</label>
                  <div className="relative"><KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#4A5E7A' }} />
                    <input type={showMgrPwd ? 'text' : 'password'} className="lux-input pl-10 pr-10" required minLength={6}
                      placeholder="Min 6 characters" value={mgrForm.defaultPassword}
                      onChange={e => setMgrForm(f => ({ ...f, defaultPassword: e.target.value }))} />
                    <button type="button" onClick={() => setShowMgrPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#4A5E7A' }}>
                      {showMgrPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button></div></div>
                <div className="flex gap-3">
                  <button type="submit" disabled={mgrLoading} className="btn-gold">
                    {mgrLoading ? <><span className="spinner spinner-sm" /> Creating…</> : 'Create'}
                  </button>
                  <button type="button" onClick={() => setShowManagerForm(false)} className="btn-ghost">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {managers.length === 0 ? (
            <div className="glass p-8 text-center" style={{ color: '#4A5E7A' }}>
              <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No accounts managers added yet.</p>
            </div>
          ) : managers.map((m, i) => (
            <div key={m.id} className="glass p-4 flex items-center gap-4 animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}>
                {m.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-semibold text-sm">{m.name}</span>
                  {m.mustChangePassword && <span className="badge badge-yellow" style={{ fontSize: '0.6rem' }}>Must change pwd</span>}
                </div>
                <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: '#7B8FAD' }}>
                  <Phone className="w-3 h-3" /> {m.phone}
                </p>
              </div>
              <button onClick={() => removeManager(m.id, m.name)}
                className="p-2 rounded-lg ripple flex-shrink-0" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
