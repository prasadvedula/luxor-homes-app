'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Wrench, Plus, ChevronDown, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useApi } from '@/lib/use-api'

type Facility = { id: string; name: string; type: string }
type Request = {
  id: string; title: string; description: string; status: string; priority: string
  createdAt: string; resolvedAt: string | null; facility: Facility
}

const STATUS_ORDER = ['OPEN','IN_PROGRESS','RESOLVED','CLOSED']
const priorityStyle: Record<string,{color:string;bg:string}> = {
  LOW:      { color:'#94a3b8', bg:'rgba(100,116,139,0.12)' },
  MEDIUM:   { color:'#facc15', bg:'rgba(234,179,8,0.12)'   },
  HIGH:     { color:'#fb923c', bg:'rgba(249,115,22,0.12)'  },
  CRITICAL: { color:'#f87171', bg:'rgba(239,68,68,0.12)'   },
}
const statusIcon = { OPEN: AlertTriangle, IN_PROGRESS: Clock, RESOLVED: CheckCircle, CLOSED: XCircle }
const statusStyle: Record<string,{color:string;badge:string}> = {
  OPEN:        { color:'#60a5fa', badge:'badge-blue'   },
  IN_PROGRESS: { color:'#c084fc', badge:'badge-purple' },
  RESOLVED:    { color:'#4ade80', badge:'badge-green'  },
  CLOSED:      { color:'#94a3b8', badge:'badge-gray'   },
}

export default function MaintenancePage() {
  const { data: session } = useSession()
  const api = useApi()
  const [requests, setRequests] = useState<Request[]>([])
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [filter, setFilter] = useState('OPEN')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ facilityId:'', title:'', description:'', priority:'MEDIUM' })
  const [loading, setLoading] = useState(false)
  const isAdmin = session?.user.role === 'ADMIN'

  useEffect(() => {
    api('/maintenance').then(r => r.json()).then((d:{requests:Request[];facilities:Facility[]}) => {
      setRequests(d.requests); setFacilities(d.facilities)
      if (d.facilities.length>0) setForm(f => f.facilityId ? f : {...f,facilityId:d.facilities[0].id})
    })
  }, [api])

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const res = await api('/maintenance',{method:'POST',body:JSON.stringify(form)})
    if (res.ok) { const r=await res.json(); setRequests(p=>[r,...p]); setShowForm(false); setForm(f=>({...f,title:'',description:''})) }
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    await api(`/maintenance/${id}`,{method:'PATCH',body:JSON.stringify({status})})
    api('/maintenance').then(r=>r.json()).then((d:{requests:Request[]})=>setRequests(d.requests))
  }

  const filtered = filter==='ALL' ? requests : requests.filter(r=>r.status===filter)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color:'#C9A84C', letterSpacing:'0.08em' }}>FACILITIES</p>
          <h1 className="font-display text-3xl font-bold text-white flex items-center gap-3">
            <Wrench className="w-7 h-7" style={{ color:'#fb923c' }} /> Maintenance
          </h1>
          <p className="text-sm mt-1" style={{ color:'#7B8FAD' }}>Track and resolve issues across all common areas</p>
        </div>
        <button onClick={() => setShowForm(s=>!s)} className="btn-gold">
          <Plus className="w-4 h-4" /> Report Issue
        </button>
      </div>

      {/* Facility summary tiles */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {facilities.map(fac => {
          const open = requests.filter(r=>r.facility.id===fac.id && ['OPEN','IN_PROGRESS'].includes(r.status)).length
          return (
            <div key={fac.id} className="glass p-4 text-center">
              <div className="text-2xl font-bold font-display" style={{ color: open>0?'#fb923c':'#4ade80' }}>{open}</div>
              <div className="text-xs mt-1 text-white font-medium">{fac.name}</div>
              <div className="text-xs mt-0.5" style={{ color: open>0?'#fb923c':'#4A5E7A' }}>{open>0?'open issues':'all clear'}</div>
            </div>
          )
        })}
      </div>

      {/* Report form */}
      {showForm && (
        <div className="glass p-6 space-y-4">
          <p className="text-xs font-semibold" style={{ color:'#4A5E7A', letterSpacing:'0.08em' }}>REPORT ISSUE</p>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="lux-label">Facility</label>
                <select className="lux-input" value={form.facilityId} onChange={e=>setForm(f=>({...f,facilityId:e.target.value}))}>
                  {facilities.map(fac=><option key={fac.id} value={fac.id}>{fac.name}</option>)}
                </select>
              </div>
              <div><label className="lux-label">Priority</label>
                <select className="lux-input" value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>
                  <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>
            <div><label className="lux-label">Title</label>
              <input className="lux-input" required value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Lift stuck on Floor 3" />
            </div>
            <div><label className="lux-label">Description</label>
              <textarea className="lux-input min-h-[80px]" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Describe the issue in detail…" />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="btn-gold">{loading?'Submitting…':'Submit Report'}</button>
              <button type="button" onClick={()=>setShowForm(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background:'rgba(7,16,30,0.6)', border:'1px solid rgba(201,168,76,0.12)' }}>
        {['OPEN','IN_PROGRESS','RESOLVED','ALL'].map(s => (
          <button key={s} onClick={()=>setFilter(s)}
            className="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all"
            style={filter===s ? { background:'rgba(201,168,76,0.15)', color:'#E8C55A', border:'1px solid rgba(201,168,76,0.25)' } : { color:'#7B8FAD' }}>
            {s==='ALL'?'All':s.replace('_',' ')}
          </button>
        ))}
      </div>

      {/* Request list */}
      <div className="space-y-3">
        {filtered.length===0 && <div className="glass p-8 text-center" style={{ color:'#4A5E7A' }}>No issues in this category</div>}
        {filtered.map(r => {
          const ps = priorityStyle[r.priority] ?? priorityStyle.MEDIUM
          const ss = statusStyle[r.status] ?? statusStyle.OPEN
          const SIcon = statusIcon[r.status as keyof typeof statusIcon] ?? AlertTriangle
          return (
            <div key={r.id} className="glass p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background:`${ss.color}15`, border:`1px solid ${ss.color}25` }}>
                    <SIcon className="w-4 h-4" style={{ color:ss.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-white font-semibold text-sm">{r.title}</span>
                      <span className={cn('badge',ss.badge)}>{r.status.replace('_',' ')}</span>
                      <span className="badge text-xs" style={{ background:ps.bg, color:ps.color, border:`1px solid ${ps.color}25` }}>{r.priority}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs" style={{ color:'#7B8FAD' }}>
                      <span className="font-medium" style={{ color:'#C9A84C' }}>{r.facility.name}</span>
                      <span>{format(new Date(r.createdAt),'dd MMM yyyy')}</span>
                      {r.resolvedAt && <span style={{ color:'#4ade80' }}>Resolved {format(new Date(r.resolvedAt),'dd MMM')}</span>}
                    </div>
                    {r.description && <p className="text-xs mt-1.5 leading-relaxed" style={{ color:'#4A5E7A' }}>{r.description}</p>}
                  </div>
                </div>
                {isAdmin && r.status!=='CLOSED' && (
                  <div className="relative flex-shrink-0">
                    <select value={r.status} onChange={e=>updateStatus(r.id,e.target.value)} className="lux-input text-xs py-2 px-3 pr-7 appearance-none" style={{ width:'auto', minWidth:'130px' }}>
                      {STATUS_ORDER.map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color:'#C9A84C' }} />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
