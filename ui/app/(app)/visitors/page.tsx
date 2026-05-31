'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ShieldCheck, Plus, Check, X, LogOut, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useApi } from '@/lib/use-api'

type Visitor = {
  id: string; name: string; phone: string; purpose: string; flatToVisit: string
  status: string; entryTime: string|null; exitTime: string|null
  note: string|null; createdAt: string; approvedBy: {name:string}|null
}
const statusBadge: Record<string,string> = { PENDING:'badge-yellow', APPROVED:'badge-green', REJECTED:'badge-red', CHECKED_OUT:'badge-gray' }

export default function VisitorsPage() {
  const { data: session } = useSession()
  const api = useApi()
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name:'', phone:'', purpose:'', flatToVisit:'' })
  const [loading, setLoading] = useState(false)
  const role = session?.user.role
  const canLog = role==='ADMIN'||role==='SECURITY'
  const canApprove = role==='ADMIN'||role==='RESIDENT'

  useEffect(() => { api('/visitors').then(r=>r.json()).then(setVisitors) }, [api])

  async function logVisitor(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const res = await api('/visitors',{method:'POST',body:JSON.stringify(form)})
    if (res.ok) { const v=await res.json(); setVisitors(p=>[v,...p]); setShowForm(false); setForm({name:'',phone:'',purpose:'',flatToVisit:''}) }
    setLoading(false)
  }

  async function act(id: string, action: string) {
    const res = await api(`/visitors/${id}`,{method:'PATCH',body:JSON.stringify({action})})
    if (res.ok) { const u=await res.json(); setVisitors(p=>p.map(v=>v.id===id?u:v)) }
  }

  const pending = visitors.filter(v=>v.status==='PENDING')

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color:'#C9A84C', letterSpacing:'0.08em' }}>SECURITY</p>
          <h1 className="font-display text-3xl font-bold text-white flex items-center gap-3">
            <ShieldCheck className="w-7 h-7" style={{ color:'#c084fc' }} /> Visitors
          </h1>
          <p className="text-sm mt-1" style={{ color:'#7B8FAD' }}>
            {role==='SECURITY' ? 'Log and manage visitor entries' : 'Monitor and approve visitors to your flat'}
          </p>
        </div>
        {canLog && (
          <button onClick={()=>setShowForm(s=>!s)} className="btn-gold">
            <Plus className="w-4 h-4" /> Log Visitor
          </button>
        )}
      </div>

      {/* Log form */}
      {showForm && canLog && (
        <div className="glass p-6">
          <p className="text-xs font-semibold mb-4" style={{ color:'#4A5E7A', letterSpacing:'0.08em' }}>LOG NEW VISITOR</p>
          <form onSubmit={logVisitor} className="grid grid-cols-2 gap-4">
            <div><label className="lux-label">Visitor Name</label><input className="lux-input" required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Raj Sharma" /></div>
            <div><label className="lux-label">Phone</label><input className="lux-input" required value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="9876543210" /></div>
            <div><label className="lux-label">Purpose</label><input className="lux-input" required value={form.purpose} onChange={e=>setForm(f=>({...f,purpose:e.target.value}))} placeholder="Delivery / Personal / Work" /></div>
            <div><label className="lux-label">Flat to Visit</label><input className="lux-input" required value={form.flatToVisit} onChange={e=>setForm(f=>({...f,flatToVisit:e.target.value}))} placeholder="e.g. 301" /></div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={loading} className="btn-gold">{loading?'Logging…':'Log Visitor'}</button>
              <button type="button" onClick={()=>setShowForm(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Pending approvals */}
      {canApprove && pending.length>0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background:'#facc15' }} />
            <p className="text-sm font-semibold text-white">Awaiting Approval <span className="ml-1 badge badge-yellow">{pending.length}</span></p>
          </div>
          {pending.map(v => (
            <div key={v.id} className="glass p-5 flex items-center justify-between" style={{ borderColor:'rgba(234,179,8,0.25)', background:'rgba(234,179,8,0.05)' }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ background:'rgba(234,179,8,0.15)', color:'#facc15', border:'1px solid rgba(234,179,8,0.25)' }}>{v.name[0]}</div>
                <div>
                  <div className="text-white font-semibold">{v.name}</div>
                  <div className="text-xs mt-0.5" style={{ color:'#7B8FAD' }}>{v.purpose} · Flat {v.flatToVisit} · {v.phone}</div>
                  <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color:'#4A5E7A' }}><Clock className="w-3 h-3" />{format(new Date(v.createdAt),'dd MMM, hh:mm a')}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>act(v.id,'APPROVED')} className="btn-gold py-2 px-4 text-xs"><Check className="w-3.5 h-3.5" /> Allow</button>
                <button onClick={()=>act(v.id,'REJECTED')} className="btn-danger py-2 px-4 text-xs"><X className="w-3.5 h-3.5" /> Deny</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Visitor log */}
      <div>
        <p className="text-xs font-semibold mb-3" style={{ color:'#4A5E7A', letterSpacing:'0.08em' }}>VISITOR LOG</p>
        <div className="space-y-2">
          {visitors.length===0 && <div className="glass p-8 text-center" style={{ color:'#4A5E7A' }}>No visitors logged yet</div>}
          {visitors.map(v => (
            <div key={v.id} className="glass p-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background:'rgba(192,132,252,0.12)', color:'#c084fc', border:'1px solid rgba(192,132,252,0.2)' }}>{v.name[0]}</div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-white font-medium text-sm">{v.name}</span>
                    <span className={cn('badge', statusBadge[v.status]??'badge-gray')}>{v.status.replace('_',' ')}</span>
                  </div>
                  <div className="text-xs flex flex-wrap gap-x-3 gap-y-0.5" style={{ color:'#7B8FAD' }}>
                    <span className="font-medium" style={{ color:'#C9A84C' }}>{v.purpose}</span>
                    <span>Flat {v.flatToVisit}</span>
                    <span>{v.phone}</span>
                    {v.entryTime && <span style={{ color:'#4ade80' }}>In {format(new Date(v.entryTime),'hh:mm a')}</span>}
                    {v.exitTime && <span style={{ color:'#94a3b8' }}>Out {format(new Date(v.exitTime),'hh:mm a')}</span>}
                    {v.approvedBy && <span style={{ color:'#4A5E7A' }}>Approved by {v.approvedBy.name}</span>}
                  </div>
                </div>
              </div>
              {canLog && v.status==='APPROVED' && (
                <button onClick={()=>act(v.id,'CHECKED_OUT')} className="btn-ghost py-1.5 px-3 text-xs flex-shrink-0">
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
