'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Wrench, Plus } from 'lucide-react'
import { cn, statusColor, priorityColor } from '@/lib/utils'
import { format } from 'date-fns'
import { useApi } from '@/lib/use-api'

type Facility = { id: string; name: string; type: string }
type Request = {
  id: string
  title: string
  description: string
  status: string
  priority: string
  createdAt: string
  resolvedAt: string | null
  facility: Facility
}

const STATUS_ORDER = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

export default function MaintenancePage() {
  const { data: session } = useSession()
  const api = useApi()
  const [requests, setRequests] = useState<Request[]>([])
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [filter, setFilter] = useState('OPEN')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ facilityId: '', title: '', description: '', priority: 'MEDIUM' })
  const [loading, setLoading] = useState(false)
  const isAdmin = session?.user.role === 'ADMIN'

  useEffect(() => {
    api('/maintenance').then(r => r.json()).then((d: { requests: Request[]; facilities: Facility[] }) => {
      setRequests(d.requests)
      setFacilities(d.facilities)
      if (d.facilities.length > 0) {
        setForm(f => f.facilityId ? f : { ...f, facilityId: d.facilities[0].id })
      }
    })
  }, [api])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await api('/maintenance', { method: 'POST', body: JSON.stringify(form) })
    if (res.ok) {
      const r = await res.json()
      setRequests(prev => [r, ...prev])
      setShowForm(false)
      setForm(f => ({ ...f, title: '', description: '' }))
    }
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    await api(`/maintenance/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
    api('/maintenance').then(r => r.json()).then((d: { requests: Request[] }) => setRequests(d.requests))
  }

  const filtered = filter === 'ALL' ? requests : requests.filter(r => r.status === filter)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-800 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-orange-500" /> Maintenance
          </h1>
          <p className="text-gray-500 text-sm mt-1">Track issues across all common facilities</p>
        </div>
        <button onClick={() => setShowForm(s => !s)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Report Issue
        </button>
      </div>

      {/* Report form */}
      {showForm && (
        <div className="card mb-5">
          <h2 className="font-semibold text-navy-800 mb-3">Report a Maintenance Issue</h2>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Facility</label>
                <select className="input" value={form.facilityId} onChange={e => setForm(f => ({ ...f, facilityId: e.target.value }))}>
                  {facilities.map(fac => <option key={fac.id} value={fac.id}>{fac.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Priority</label>
                <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Title</label>
              <input className="input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Lift not working on Floor 3" />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input min-h-[80px]" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the issue…" />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="btn-primary text-sm disabled:opacity-60">{loading ? 'Submitting…' : 'Submit'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Facilities summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {facilities.map(fac => {
          const open = requests.filter(r => r.facility.id === fac.id && ['OPEN', 'IN_PROGRESS'].includes(r.status)).length
          return (
            <div key={fac.id} className="card text-center py-3">
              <div className="text-lg font-bold text-navy-800">{open}</div>
              <div className="text-xs text-gray-500 mt-0.5">{fac.name}</div>
              {open > 0 && <div className="text-xs text-orange-500 font-medium">open</div>}
            </div>
          )
        })}
      </div>

      {/* Filter */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ALL'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn('px-3 py-1 rounded-md text-xs font-medium transition-colors', filter === s ? 'bg-white shadow text-navy-800' : 'text-gray-500 hover:text-gray-700')}
          >
            {s === 'ALL' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-gray-500 text-sm">No issues in this category.</p>}
        {filtered.map(r => (
          <div key={r.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium text-navy-800 text-sm">{r.title}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusColor(r.status))}>
                    {r.status.replace('_', ' ')}
                  </span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', priorityColor(r.priority))}>
                    {r.priority}
                  </span>
                </div>
                <div className="text-xs text-gray-500 flex gap-3">
                  <span>{r.facility.name}</span>
                  <span>{format(new Date(r.createdAt), 'dd MMM yyyy')}</span>
                  {r.resolvedAt && <span>Resolved {format(new Date(r.resolvedAt), 'dd MMM')}</span>}
                </div>
                {r.description && <p className="text-xs text-gray-600 mt-1">{r.description}</p>}
              </div>
              {isAdmin && r.status !== 'CLOSED' && (
                <select
                  value={r.status}
                  onChange={e => updateStatus(r.id, e.target.value)}
                  className="text-xs border border-gray-200 rounded px-2 py-1 ml-3"
                >
                  {STATUS_ORDER.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
