'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  ShieldCheck, Plus, LogOut, RefreshCw, Clock, User,
  CalendarDays, Building2, Check, X, ChevronDown, Phone, Bell, BellOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, isToday, isYesterday } from 'date-fns'
import { useApi } from '@/lib/use-api'

type Visitor = {
  id: string
  name: string
  phone: string
  purpose: string
  flatToVisit: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHECKED_OUT'
  entryTime: string | null
  exitTime: string | null
  note: string | null
  createdAt: string
  approvedBy: { name: string } | null
}

const statusBadge: Record<string, string> = {
  PENDING: 'badge-yellow', APPROVED: 'badge-green', REJECTED: 'badge-red', CHECKED_OUT: 'badge-gray',
}

const emptyForm = { name: '', phone: '', purpose: '', flatToVisit: '' }

function dateGroup(d: string): string {
  const date = new Date(d)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEEE, dd MMM yyyy')
}

function groupBy<T>(arr: T[], key: (item: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>()
  for (const item of arr) {
    const k = key(item)
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(item)
  }
  return Array.from(map.entries())
}

export default function VisitorsPage() {
  const { data: session } = useSession()
  const api = useApi()
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [groupMode, setGroupMode] = useState<'date' | 'flat'>('date')
  const [flatFilter, setFlatFilter] = useState('ALL')
  const [notifState, setNotifState] = useState<'default' | 'granted' | 'denied'>('default')

  const role = session?.user?.role

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setNotifState(Notification.permission as 'default' | 'granted' | 'denied')
    }
  }, [])

  const fetchVisitors = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    const res = await api('/visitors')
    if (res.ok) {
      const data = await res.json()
      setVisitors(Array.isArray(data) ? data : [])
    }
    setRefreshing(false)
    setPageLoading(false)
  }, [api])

  useEffect(() => { fetchVisitors() }, [fetchVisitors])

  async function logVisitor(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await api('/visitors', { method: 'POST', body: JSON.stringify(form) })
    if (res.ok) {
      const v = await res.json()
      setVisitors(p => [v, ...p])
      setShowForm(false)
      setForm(emptyForm)
    }
    setLoading(false)
  }

  async function act(id: string, action: string) {
    const res = await api(`/visitors/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) })
    if (res.ok) {
      const u = await res.json()
      setVisitors(p => p.map(v => v.id === id ? u : v))
    }
  }

  // Derived lists
  const insideNow      = visitors.filter(v => v.status === 'APPROVED')
  const pendingVisitors = visitors.filter(v => v.status === 'PENDING')
  const history        = visitors.filter(v => v.status === 'CHECKED_OUT' || v.status === 'REJECTED')
  const todayCount     = visitors.filter(v => isToday(new Date(v.createdAt))).length

  // History filters
  const historyFlats    = Array.from(new Set(history.map(v => v.flatToVisit))).sort()
  const filteredHistory = flatFilter === 'ALL' ? history : history.filter(v => v.flatToVisit === flatFilter)
  const grouped         = groupMode === 'date'
    ? groupBy(filteredHistory, v => dateGroup(v.createdAt))
    : [...groupBy(filteredHistory, v => v.flatToVisit)].sort(([a], [b]) => a.localeCompare(b))

  // ── GATE VIEW — Security officers and admins ──────────────────────────────
  if (role === 'SECURITY' || role === 'ADMIN') {
    const canApprove = role === 'ADMIN'

    return (
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: '#C9A84C', letterSpacing: '0.08em' }}>
              {role === 'SECURITY' ? 'SECURITY' : 'ADMIN'}
            </p>
            <h1 className="font-display text-3xl font-bold text-white flex items-center gap-3">
              <ShieldCheck className="w-7 h-7" style={{ color: '#4ade80' }} />
              Gate Pass
            </h1>
            <p className="text-sm mt-1" style={{ color: '#7B8FAD' }}>
              {format(new Date(), 'EEEE, dd MMMM yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => fetchVisitors()}
              disabled={refreshing}
              className="p-2.5 rounded-xl transition-all"
              style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C' }}
            >
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            </button>
            <button onClick={() => setShowForm(s => !s)} className="btn-gold">
              <Plus className="w-4 h-4" /> Issue Pass
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Inside Now',    value: insideNow.length,       color: '#4ade80' },
            { label: 'Awaiting',      value: pendingVisitors.length, color: '#facc15' },
            { label: "Today's Total", value: todayCount,             color: '#C9A84C' },
          ].map(stat => (
            <div key={stat.label} className="glass p-4 text-center">
              <div className="text-2xl font-bold font-display count-up" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#7B8FAD' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Issue Pass form */}
        {showForm && (
          <div className="glass p-6 space-y-4 animate-scale-in">
            <h2 className="font-semibold text-white">Issue Visitor Pass</h2>
            <form onSubmit={logVisitor} className="grid grid-cols-2 gap-4">
              <div>
                <label className="lux-label">Visitor Name</label>
                <input className="lux-input" required placeholder="Full name"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="lux-label">Phone</label>
                <input className="lux-input" required placeholder="Mobile number"
                  value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="lux-label">Purpose of Visit</label>
                <input className="lux-input" required placeholder="Delivery / Personal / Work"
                  value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} />
              </div>
              <div>
                <label className="lux-label">Flat to Visit</label>
                <input className="lux-input" required placeholder="e.g. 301"
                  value={form.flatToVisit} onChange={e => setForm(f => ({ ...f, flatToVisit: e.target.value }))} />
              </div>
              <div className="col-span-2 flex gap-3">
                <button type="submit" disabled={loading} className="btn-gold">
                  {loading ? <><span className="spinner-sm spinner" /> Issuing…</> : 'Issue Pass & Notify Resident'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm) }} className="btn-ghost">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {pageLoading ? (
          [1, 2, 3].map(i => <div key={i} className="skeleton skeleton-card" style={{ animationDelay: `${i * 0.1}s` }} />)
        ) : (
          <>
            {/* Inside Now */}
            {insideNow.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full" style={{ background: '#4ade80', boxShadow: '0 0 8px rgba(74,222,128,0.6)' }} />
                  <p className="text-sm font-semibold text-white">Inside Now</p>
                  <span className="badge badge-green">{insideNow.length}</span>
                </div>
                <div className="space-y-2">
                  {insideNow.map(v => (
                    <div key={v.id} className="glass p-4 flex items-center justify-between gap-4"
                      style={{ borderColor: 'rgba(74,222,128,0.2)' }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                          style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
                          {v.name[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-medium text-sm">{v.name}</p>
                          <div className="flex flex-wrap gap-x-3 text-xs mt-0.5" style={{ color: '#7B8FAD' }}>
                            <span className="font-medium" style={{ color: '#C9A84C' }}>{v.purpose}</span>
                            <span>Flat {v.flatToVisit}</span>
                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{v.phone}</span>
                            {v.entryTime && <span style={{ color: '#4ade80' }}>In {format(new Date(v.entryTime), 'hh:mm a')}</span>}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => act(v.id, 'CHECKED_OUT')} className="btn-ghost btn-sm flex-shrink-0">
                        <LogOut className="w-3.5 h-3.5" /> Check Out
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Awaiting resident approval */}
            {pendingVisitors.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#facc15', boxShadow: '0 0 8px rgba(234,179,8,0.6)' }} />
                  <p className="text-sm font-semibold text-white">Awaiting Resident Approval</p>
                  <span className="badge badge-yellow">{pendingVisitors.length}</span>
                </div>
                <div className="space-y-2">
                  {pendingVisitors.map(v => (
                    <div key={v.id} className="glass p-4 flex items-center justify-between gap-4"
                      style={{ borderColor: 'rgba(234,179,8,0.15)' }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                          style={{ background: 'rgba(234,179,8,0.12)', color: '#facc15', border: '1px solid rgba(234,179,8,0.2)' }}>
                          {v.name[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-medium text-sm">{v.name}</p>
                          <div className="flex flex-wrap gap-x-3 text-xs mt-0.5" style={{ color: '#7B8FAD' }}>
                            <span className="font-medium" style={{ color: '#C9A84C' }}>{v.purpose}</span>
                            <span>Flat {v.flatToVisit}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />{format(new Date(v.createdAt), 'hh:mm a')}
                            </span>
                          </div>
                        </div>
                      </div>
                      {canApprove && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => act(v.id, 'APPROVED')}
                            className="p-2 rounded-lg transition-all"
                            style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}>
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => act(v.id, 'REJECTED')}
                            className="p-2 rounded-lg transition-all"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {insideNow.length === 0 && pendingVisitors.length === 0 && (
              <div className="glass p-8 text-center animate-fade-in">
                <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: '#4ade80' }} />
                <p className="text-white font-medium">All clear at the gate</p>
                <p className="text-sm mt-1" style={{ color: '#4A5E7A' }}>No active visitors right now</p>
              </div>
            )}

            {/* ── Visit History ── */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <p className="text-xs font-bold" style={{ color: '#4A5E7A', letterSpacing: '0.08em' }}>
                  VISIT HISTORY{history.length > 0 && ` (${history.length})`}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Group mode toggle */}
                  <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'rgba(7,16,30,0.6)', border: '1px solid rgba(201,168,76,0.1)' }}>
                    <button
                      onClick={() => setGroupMode('date')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                      style={groupMode === 'date'
                        ? { background: 'rgba(201,168,76,0.15)', color: '#E8C55A', border: '1px solid rgba(201,168,76,0.25)' }
                        : { color: '#7B8FAD' }}>
                      <CalendarDays className="w-3.5 h-3.5" /> By Date
                    </button>
                    <button
                      onClick={() => setGroupMode('flat')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                      style={groupMode === 'flat'
                        ? { background: 'rgba(201,168,76,0.15)', color: '#E8C55A', border: '1px solid rgba(201,168,76,0.25)' }
                        : { color: '#7B8FAD' }}>
                      <Building2 className="w-3.5 h-3.5" /> By Flat
                    </button>
                  </div>
                  {/* Flat filter dropdown */}
                  <div className="relative">
                    <select
                      value={flatFilter}
                      onChange={e => setFlatFilter(e.target.value)}
                      className="lux-input py-1.5 pr-8 text-xs appearance-none cursor-pointer"
                      style={{ minWidth: '110px' }}>
                      <option value="ALL">All Flats</option>
                      {historyFlats.map(f => <option key={f} value={f}>Flat {f}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#4A5E7A' }} />
                  </div>
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="glass p-8 text-center" style={{ color: '#4A5E7A' }}>
                  <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No visit history yet</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {grouped.map(([groupKey, groupVisitors]) => (
                    <div key={groupKey}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: '#C9A84C', letterSpacing: '0.06em' }}>
                          {groupMode === 'flat' ? <Building2 className="w-3 h-3" /> : <CalendarDays className="w-3 h-3" />}
                          {groupMode === 'flat' ? `Flat ${groupKey}` : groupKey}
                        </div>
                        <div className="flex-1 h-px" style={{ background: 'rgba(201,168,76,0.1)' }} />
                        <span className="text-xs" style={{ color: '#3A4E6A' }}>
                          {groupVisitors.length} visit{groupVisitors.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {groupVisitors.map(v => (
                          <div key={v.id} className="glass p-4 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
                              style={{ background: 'rgba(100,116,139,0.12)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.2)' }}>
                              {v.name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <span className="text-white text-sm font-medium">{v.name}</span>
                                <span className={cn('badge', statusBadge[v.status] ?? 'badge-gray')}>
                                  {v.status.replace('_', ' ')}
                                </span>
                              </div>
                              <div className="text-xs flex flex-wrap gap-x-3" style={{ color: '#7B8FAD' }}>
                                <span className="font-medium" style={{ color: '#C9A84C' }}>{v.purpose}</span>
                                {groupMode === 'date' && <span>Flat {v.flatToVisit}</span>}
                                {groupMode === 'flat' && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {format(new Date(v.createdAt), 'hh:mm a, dd MMM')}
                                  </span>
                                )}
                                {v.entryTime && v.exitTime && (
                                  <span style={{ color: '#4A5E7A' }}>
                                    {format(new Date(v.entryTime), 'hh:mm a')} → {format(new Date(v.exitTime), 'hh:mm a')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  // ── RESIDENT VIEW ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold mb-1" style={{ color: '#C9A84C', letterSpacing: '0.08em' }}>SECURITY</p>
          <h1 className="font-display text-3xl font-bold text-white flex items-center gap-3">
            <ShieldCheck className="w-7 h-7" style={{ color: '#c084fc' }} />
            Visitor Management
          </h1>
          <p className="text-sm mt-1" style={{ color: '#7B8FAD' }}>Approve or deny visitors to your flat</p>
        </div>
        <button
          onClick={() => fetchVisitors()}
          disabled={refreshing}
          className="p-2.5 rounded-xl transition-all"
          style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C' }}>
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Notification permission banner */}
      {notifState === 'default' && (
        <div className="glass-gold p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}>
              <Bell className="w-5 h-5" style={{ color: '#E8C55A' }} />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Enable instant visitor alerts</p>
              <p className="text-xs mt-0.5" style={{ color: '#7B8FAD' }}>
                Get notified the moment a visitor arrives at your gate.
              </p>
            </div>
          </div>
          <button
            onClick={() => Notification.requestPermission().then(p => setNotifState(p as 'default' | 'granted' | 'denied'))}
            className="btn-gold btn-sm flex-shrink-0">
            <Bell className="w-3.5 h-3.5" /> Enable
          </button>
        </div>
      )}
      {notifState === 'granted' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <Bell className="w-4 h-4 flex-shrink-0" style={{ color: '#4ade80' }} />
          <p className="text-sm" style={{ color: '#4ade80' }}>Visitor notifications <strong>enabled</strong></p>
        </div>
      )}
      {notifState === 'denied' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <BellOff className="w-4 h-4 flex-shrink-0" style={{ color: '#f87171' }} />
          <p className="text-sm" style={{ color: '#f87171' }}>
            Notifications blocked. Enable in browser settings for instant alerts.
          </p>
        </div>
      )}

      {pageLoading ? (
        [1, 2].map(i => <div key={i} className="skeleton skeleton-card" style={{ animationDelay: `${i * 0.1}s` }} />)
      ) : (
        <>
          {/* Pending approvals */}
          {pendingVisitors.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-2.5 h-2.5 rounded-full animate-pulse"
                  style={{ background: '#facc15', boxShadow: '0 0 8px rgba(234,179,8,0.6)' }} />
                <p className="font-semibold text-white">Awaiting Your Approval</p>
                <span className="badge badge-yellow">{pendingVisitors.length}</span>
              </div>
              <div className="space-y-3">
                {pendingVisitors.map(v => (
                  <div key={v.id} className="glass p-5"
                    style={{ borderColor: 'rgba(234,179,8,0.3)', background: 'rgba(234,179,8,0.04)' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-display font-bold text-lg flex-shrink-0"
                          style={{ background: 'rgba(234,179,8,0.15)', color: '#facc15', border: '1px solid rgba(234,179,8,0.3)' }}>
                          {v.name[0]}
                        </div>
                        <div>
                          <p className="text-white font-semibold">{v.name}</p>
                          <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>
                            <span className="font-medium" style={{ color: '#E8C55A' }}>{v.purpose}</span>
                            {' · '}{v.phone}
                          </p>
                          <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#4A5E7A' }}>
                            <Clock className="w-3 h-3" />
                            Arrived {format(new Date(v.createdAt), 'hh:mm a, dd MMM')}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button onClick={() => act(v.id, 'APPROVED')}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm"
                          style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>
                          <Check className="w-4 h-4" /> Allow
                        </button>
                        <button onClick={() => act(v.id, 'REJECTED')}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm"
                          style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                          <X className="w-4 h-4" /> Deny
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full visitor log for this flat */}
          <div>
            <p className="text-xs font-bold mb-4" style={{ color: '#4A5E7A', letterSpacing: '0.08em' }}>VISITOR LOG</p>
            {visitors.length === 0 ? (
              <div className="glass p-10 text-center">
                <User className="w-10 h-10 mx-auto mb-3" style={{ color: '#3A4E6A' }} />
                <p className="text-white font-medium mb-1">No visitors yet</p>
                <p className="text-sm" style={{ color: '#4A5E7A' }}>
                  Visitor entries will appear here once logged by security.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {visitors.map(v => (
                  <div key={v.id} className="glass p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                      style={{ background: 'rgba(192,132,252,0.12)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.2)' }}>
                      {v.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-white font-medium text-sm">{v.name}</span>
                        <span className={cn('badge', statusBadge[v.status] ?? 'badge-gray')}>
                          {v.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-xs flex flex-wrap gap-x-3" style={{ color: '#7B8FAD' }}>
                        <span className="font-medium" style={{ color: '#C9A84C' }}>{v.purpose}</span>
                        <span>{v.phone}</span>
                        {v.entryTime && <span style={{ color: '#4ade80' }}>In {format(new Date(v.entryTime), 'hh:mm a')}</span>}
                        {v.exitTime && <span style={{ color: '#94a3b8' }}>Out {format(new Date(v.exitTime), 'hh:mm a')}</span>}
                        {!v.entryTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(v.createdAt), 'hh:mm a, dd MMM')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
