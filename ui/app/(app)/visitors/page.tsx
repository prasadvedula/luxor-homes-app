'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { ShieldCheck, Plus, Check, X, LogOut, Bell, BellOff, Clock, RefreshCw, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useApi } from '@/lib/use-api'

type Visitor = {
  id: string; name: string; phone: string; purpose: string; flatToVisit: string
  status: string; entryTime: string|null; exitTime: string|null
  note: string|null; createdAt: string; approvedBy: {name:string}|null
}

const statusBadge: Record<string,string> = {
  PENDING:'badge-yellow', APPROVED:'badge-green', REJECTED:'badge-red', CHECKED_OUT:'badge-gray'
}

type NotifState = 'default' | 'granted' | 'denied'

export default function VisitorsPage() {
  const { data: session } = useSession()
  const api = useApi()
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name:'', phone:'', purpose:'', flatToVisit:'' })
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [notifState, setNotifState] = useState<NotifState>('default')
  const [filter, setFilter] = useState<'ALL'|'PENDING'|'APPROVED'|'CHECKED_OUT'>('ALL')

  const role = session?.user.role
  const canLog     = role === 'ADMIN' || role === 'SECURITY'
  const canApprove = role === 'ADMIN' || role === 'RESIDENT'

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setNotifState(Notification.permission as NotifState)
    }
  }, [])

  const fetchVisitors = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    const res = await api('/visitors'); const data = await res.json()
    setVisitors(data); setRefreshing(false)
  }, [api])

  useEffect(() => { fetchVisitors() }, [fetchVisitors])

  async function requestNotifPermission() {
    const perm = await Notification.requestPermission()
    setNotifState(perm as NotifState)
  }

  async function logVisitor(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const res = await api('/visitors',{method:'POST',body:JSON.stringify(form)})
    if (res.ok) {
      const v = await res.json()
      setVisitors(p=>[v,...p]); setShowForm(false)
      setForm({name:'',phone:'',purpose:'',flatToVisit:''})
    }
    setLoading(false)
  }

  async function act(id: string, action: string) {
    const res = await api(`/visitors/${id}`,{method:'PATCH',body:JSON.stringify({action})})
    if (res.ok) { const u=await res.json(); setVisitors(p=>p.map(v=>v.id===id?u:v)) }
  }

  const pending  = visitors.filter(v=>v.status==='PENDING')
  const filtered = filter==='ALL' ? visitors : visitors.filter(v=>v.status===filter)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold mb-1" style={{ color:'#C9A84C', letterSpacing:'0.08em' }}>SECURITY</p>
          <h1 className="font-display text-3xl font-bold text-white flex items-center gap-3">
            <ShieldCheck className="w-7 h-7" style={{ color:'#c084fc' }} />
            Visitor Management
          </h1>
          <p className="text-sm mt-1" style={{ color:'#7B8FAD' }}>
            {canLog ? 'Log and manage all visitor entries' : 'Approve or deny visitors to your flat'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => fetchVisitors()} disabled={refreshing}
            className="p-2.5 rounded-xl transition-all" title="Refresh"
            style={{ background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.2)', color:'#C9A84C' }}>
            <RefreshCw className={cn('w-4 h-4', refreshing?'animate-spin':'')} />
          </button>
          {canLog && (
            <button onClick={()=>setShowForm(s=>!s)} className="btn-gold">
              <Plus className="w-4 h-4" /> Log Visitor
            </button>
          )}
        </div>
      </div>

      {/* Notification permission banner (residents only) */}
      {canApprove && notifState === 'default' && (
        <div className="glass-gold p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:'rgba(201,168,76,0.15)', border:'1px solid rgba(201,168,76,0.3)' }}>
              <Bell className="w-5 h-5" style={{ color:'#E8C55A' }} />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Enable instant visitor alerts</p>
              <p className="text-xs mt-0.5" style={{ color:'#7B8FAD' }}>
                Get a browser notification the moment a visitor arrives at your gate — approve or deny without opening the app.
              </p>
            </div>
          </div>
          <button onClick={requestNotifPermission} className="btn-gold btn-sm flex-shrink-0">
            <Bell className="w-3.5 h-3.5" /> Enable
          </button>
        </div>
      )}

      {notifState === 'granted' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)' }}>
          <Bell className="w-4 h-4 flex-shrink-0" style={{ color:'#4ade80' }} />
          <p className="text-sm" style={{ color:'#4ade80' }}>
            Visitor notifications <span className="font-semibold">enabled</span> — you&apos;ll be alerted instantly when a visitor arrives at the gate.
          </p>
        </div>
      )}
      {notifState === 'denied' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }}>
          <BellOff className="w-4 h-4 flex-shrink-0" style={{ color:'#f87171' }} />
          <p className="text-sm" style={{ color:'#f87171' }}>
            Notifications blocked. Enable them in your browser settings to receive instant visitor alerts.
          </p>
        </div>
      )}

      {/* Log visitor form */}
      {showForm && canLog && (
        <div className="glass p-6 animate-fade-up">
          <p className="text-xs font-bold mb-4" style={{ color:'#4A5E7A', letterSpacing:'0.08em' }}>LOG NEW VISITOR</p>
          <form onSubmit={logVisitor} className="grid grid-cols-2 gap-4">
            <div><label className="lux-label">Visitor Name</label><input className="lux-input" required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Raj Sharma" /></div>
            <div><label className="lux-label">Phone</label><input className="lux-input" required value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="9876543210" /></div>
            <div><label className="lux-label">Purpose of Visit</label><input className="lux-input" required value={form.purpose} onChange={e=>setForm(f=>({...f,purpose:e.target.value}))} placeholder="Delivery / Personal / Work" /></div>
            <div><label className="lux-label">Flat to Visit</label><input className="lux-input" required value={form.flatToVisit} onChange={e=>setForm(f=>({...f,flatToVisit:e.target.value}))} placeholder="e.g. 301" /></div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={loading} className="btn-gold">{loading?'Logging…':'Log Visitor & Notify'}</button>
              <button type="button" onClick={()=>setShowForm(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Pending approval section */}
      {canApprove && pending.length > 0 && (
        <div className="animate-fade-up">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background:'#facc15', boxShadow:'0 0 8px rgba(234,179,8,0.6)' }} />
              <p className="font-semibold text-white">Awaiting Your Approval</p>
            </div>
            <span className="badge badge-yellow">{pending.length}</span>
          </div>
          <div className="space-y-3">
            {pending.map(v => (
              <div key={v.id} className="glass p-5" style={{ borderColor:'rgba(234,179,8,0.3)', background:'rgba(234,179,8,0.04)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-display font-bold text-lg flex-shrink-0"
                      style={{ background:'rgba(234,179,8,0.15)', color:'#facc15', border:'1px solid rgba(234,179,8,0.3)' }}>
                      {v.name[0]}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{v.name}</p>
                      <p className="text-sm mt-0.5" style={{ color:'#94a3b8' }}>
                        <span className="font-medium" style={{ color:'#E8C55A' }}>{v.purpose}</span> · Flat {v.flatToVisit} · {v.phone}
                      </p>
                      <p className="text-xs mt-1 flex items-center gap-1" style={{ color:'#4A5E7A' }}>
                        <Clock className="w-3 h-3" />
                        Arrived {format(new Date(v.createdAt),'hh:mm a, dd MMM')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button onClick={()=>act(v.id,'APPROVED')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all" style={{ background:'rgba(34,197,94,0.15)', color:'#4ade80', border:'1px solid rgba(34,197,94,0.3)' }}
                      onMouseEnter={e=>(e.currentTarget.style.background='rgba(34,197,94,0.25)')} onMouseLeave={e=>(e.currentTarget.style.background='rgba(34,197,94,0.15)')}>
                      <Check className="w-4 h-4" /> Allow Entry
                    </button>
                    <button onClick={()=>act(v.id,'REJECTED')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all" style={{ background:'rgba(239,68,68,0.12)', color:'#f87171', border:'1px solid rgba(239,68,68,0.25)' }}
                      onMouseEnter={e=>(e.currentTarget.style.background='rgba(239,68,68,0.22)')} onMouseLeave={e=>(e.currentTarget.style.background='rgba(239,68,68,0.12)')}>
                      <X className="w-4 h-4" /> Deny Access
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visitor log */}
      <div>
        {/* Filter tabs */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold" style={{ color:'#4A5E7A', letterSpacing:'0.08em' }}>VISITOR LOG</p>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background:'rgba(7,16,30,0.6)', border:'1px solid rgba(201,168,76,0.1)' }}>
            {(['ALL','PENDING','APPROVED','CHECKED_OUT'] as const).map(f=>(
              <button key={f} onClick={()=>setFilter(f)} className="px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wide transition-all"
                style={filter===f ? { background:'rgba(201,168,76,0.15)', color:'#E8C55A', border:'1px solid rgba(201,168,76,0.25)' } : { color:'#7B8FAD' }}>
                {f==='CHECKED_OUT'?'Done':f.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {filtered.length===0 && (
            <div className="glass p-10 text-center">
              <User className="w-10 h-10 mx-auto mb-3" style={{ color:'#3A4E6A' }} />
              <p className="text-white font-medium mb-1">No visitors in this category</p>
              <p className="text-sm" style={{ color:'#4A5E7A' }}>Visitor entries will appear here once logged.</p>
            </div>
          )}
          {filtered.map(v => (
            <div key={v.id} className="glass p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background:'rgba(192,132,252,0.12)', color:'#c084fc', border:'1px solid rgba(192,132,252,0.2)' }}>
                  {v.name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-white font-medium text-sm">{v.name}</span>
                    <span className={cn('badge', statusBadge[v.status]??'badge-gray')}>{v.status.replace('_',' ')}</span>
                  </div>
                  <div className="text-xs flex flex-wrap gap-x-3" style={{ color:'#7B8FAD' }}>
                    <span className="font-medium" style={{ color:'#C9A84C' }}>{v.purpose}</span>
                    <span>Flat {v.flatToVisit}</span>
                    <span>{v.phone}</span>
                    {v.entryTime && <span style={{ color:'#4ade80' }}>In {format(new Date(v.entryTime),'hh:mm a')}</span>}
                    {v.exitTime  && <span style={{ color:'#94a3b8' }}>Out {format(new Date(v.exitTime),'hh:mm a')}</span>}
                    {v.approvedBy && <span style={{ color:'#4A5E7A' }}>by {v.approvedBy.name}</span>}
                  </div>
                </div>
              </div>
              {canLog && v.status==='APPROVED' && (
                <button onClick={()=>act(v.id,'CHECKED_OUT')} className="btn-ghost btn-sm flex-shrink-0">
                  <LogOut className="w-3.5 h-3.5" /> Check Out
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
