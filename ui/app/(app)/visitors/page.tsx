'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ShieldCheck, Plus, Check, X, LogOut } from 'lucide-react'
import { cn, statusColor } from '@/lib/utils'
import { format } from 'date-fns'
import { useApi } from '@/lib/use-api'

type Visitor = {
  id: string
  name: string
  phone: string
  purpose: string
  flatToVisit: string
  status: string
  entryTime: string | null
  exitTime: string | null
  note: string | null
  createdAt: string
  approvedBy: { name: string } | null
}

export default function VisitorsPage() {
  const { data: session } = useSession()
  const api = useApi()
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', purpose: '', flatToVisit: '' })
  const [loading, setLoading] = useState(false)

  const role = session?.user.role
  const canLog = role === 'ADMIN' || role === 'SECURITY'
  const canApprove = role === 'ADMIN' || role === 'RESIDENT'

  useEffect(() => { api('/visitors').then(r => r.json()).then(setVisitors) }, [api])

  async function logVisitor(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await api('/visitors', { method: 'POST', body: JSON.stringify(form) })
    if (res.ok) {
      const v = await res.json()
      setVisitors(prev => [v, ...prev])
      setShowForm(false)
      setForm({ name: '', phone: '', purpose: '', flatToVisit: '' })
    }
    setLoading(false)
  }

  async function act(id: string, action: string) {
    const res = await api(`/visitors/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) })
    if (res.ok) {
      const updated = await res.json()
      setVisitors(prev => prev.map(v => v.id === id ? updated : v))
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-500" /> Visitor Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {role === 'SECURITY' ? 'Log and manage visitor entries' : 'Monitor visitors to your flat'}
          </p>
        </div>
        {canLog && (
          <button onClick={() => setShowForm(s => !s)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Log Visitor
          </button>
        )}
      </div>

      {showForm && canLog && (
        <div className="card mb-5">
          <h2 className="font-semibold text-navy-800 mb-3">Log New Visitor</h2>
          <form onSubmit={logVisitor} className="grid grid-cols-2 gap-3">
            <div><label className="label">Visitor Name</label><input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Raj Sharma" /></div>
            <div><label className="label">Phone</label><input className="input" required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="9876543210" /></div>
            <div><label className="label">Purpose</label><input className="input" required value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} placeholder="Delivery / Personal / Work" /></div>
            <div><label className="label">Flat to Visit</label><input className="input" required value={form.flatToVisit} onChange={e => setForm(f => ({ ...f, flatToVisit: e.target.value }))} placeholder="e.g. 3B" /></div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={loading} className="btn-primary text-sm disabled:opacity-60">{loading ? 'Logging…' : 'Log Visitor'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Pending approvals */}
      {canApprove && visitors.filter(v => v.status === 'PENDING').length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-navy-800 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block" />
            Pending Approval
          </h2>
          <div className="space-y-2">
            {visitors.filter(v => v.status === 'PENDING').map(v => (
              <div key={v.id} className="card border-yellow-200 bg-yellow-50 flex items-center justify-between">
                <div>
                  <div className="font-medium text-navy-800">{v.name}</div>
                  <div className="text-sm text-gray-600">{v.purpose} · Flat {v.flatToVisit}</div>
                  <div className="text-xs text-gray-400">{v.phone} · {format(new Date(v.createdAt), 'dd MMM, hh:mm a')}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => act(v.id, 'APPROVED')} className="flex items-center gap-1 bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-green-700">
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button onClick={() => act(v.id, 'REJECTED')} className="flex items-center gap-1 bg-red-100 text-red-700 text-sm px-3 py-1.5 rounded-lg hover:bg-red-200">
                    <X className="w-3.5 h-3.5" /> Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All visitors log */}
      <h2 className="font-semibold text-navy-800 mb-3">Visitor Log</h2>
      <div className="space-y-2">
        {visitors.length === 0 && <p className="text-gray-500 text-sm">No visitors logged.</p>}
        {visitors.map(v => (
          <div key={v.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-medium text-navy-800 text-sm">{v.name}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusColor(v.status))}>
                    {v.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-xs text-gray-500 flex gap-3 flex-wrap">
                  <span>{v.purpose}</span>
                  <span>Flat {v.flatToVisit}</span>
                  <span>{v.phone}</span>
                  {v.entryTime && <span>In: {format(new Date(v.entryTime), 'hh:mm a')}</span>}
                  {v.exitTime && <span>Out: {format(new Date(v.exitTime), 'hh:mm a')}</span>}
                  {v.approvedBy && <span>Approved by {v.approvedBy.name}</span>}
                </div>
              </div>
              {canLog && v.status === 'APPROVED' && (
                <button onClick={() => act(v.id, 'CHECKED_OUT')} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 ml-2">
                  <LogOut className="w-3 h-3" /> Check Out
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
