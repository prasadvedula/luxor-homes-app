'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { UserCheck, Plus, Check, X, LogOut, CreditCard } from 'lucide-react'
import { cn, statusColor } from '@/lib/utils'
import { format } from 'date-fns'
import { useApi } from '@/lib/use-api'

const ID_CARD_TYPES = ['Aadhar Card', 'PAN Card', 'Passport', 'Voter ID', 'Driving Licence']

const WORK_TYPES = ['Housekeeping', 'Cooking', 'Childcare', 'Elderly Care', 'Gardening', 'Other']

type Maid = {
  id: string
  name: string
  phone: string
  idCardType: string
  idCardNumber: string
  flatAssigned: string
  workType: string
  status: string
  entryTime: string | null
  exitTime: string | null
  note: string | null
  createdAt: string
  approvedBy: { name: string } | null
}

const emptyForm = {
  name: '',
  phone: '',
  idCardType: ID_CARD_TYPES[0],
  idCardNumber: '',
  flatAssigned: '',
  workType: WORK_TYPES[0],
}

export default function MaidsPage() {
  const { data: session } = useSession()
  const api = useApi()
  const [maids, setMaids] = useState<Maid[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)

  const role = session?.user.role
  const canLog = role === 'ADMIN' || role === 'SECURITY'
  const canApprove = role === 'ADMIN' || role === 'RESIDENT'

  useEffect(() => { api('/maids').then(r => r.ok ? r.json() : []).then((d) => setMaids(Array.isArray(d) ? d : [])) }, [api])

  async function registerMaid(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await api('/maids', { method: 'POST', body: JSON.stringify(form) })
    if (res.ok) {
      const m = await res.json()
      setMaids(prev => [m, ...prev])
      setShowForm(false)
      setForm(emptyForm)
    }
    setLoading(false)
  }

  async function act(id: string, action: string) {
    const res = await api(`/maids/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) })
    if (res.ok) {
      const updated = await res.json()
      setMaids(prev => prev.map(m => m.id === id ? updated : m))
    }
  }

  const pending = maids.filter(m => m.status === 'PENDING')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-800 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-teal-500" /> Maid Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {role === 'SECURITY' ? 'Register and manage maid entries with ID verification' : 'Monitor maids assigned to your flat'}
          </p>
        </div>
        {canLog && (
          <button onClick={() => setShowForm(s => !s)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Register Maid
          </button>
        )}
      </div>

      {showForm && canLog && (
        <div className="card mb-5">
          <h2 className="font-semibold text-navy-800 mb-1 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-teal-500" /> Register New Maid
          </h2>
          <p className="text-xs text-gray-400 mb-4">ID card details are required for entry verification.</p>
          <form onSubmit={registerMaid} className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Full Name</label>
              <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Sunita Devi" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="9876543210" />
            </div>
            <div>
              <label className="label">ID Card Type</label>
              <select className="input" value={form.idCardType} onChange={e => setForm(f => ({ ...f, idCardType: e.target.value }))}>
                {ID_CARD_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">ID Card Number</label>
              <input className="input" required value={form.idCardNumber} onChange={e => setForm(f => ({ ...f, idCardNumber: e.target.value }))} placeholder="e.g. 1234 5678 9012" />
            </div>
            <div>
              <label className="label">Flat Assigned</label>
              <input className="input" required value={form.flatAssigned} onChange={e => setForm(f => ({ ...f, flatAssigned: e.target.value }))} placeholder="e.g. 3B" />
            </div>
            <div>
              <label className="label">Work Type</label>
              <select className="input" value={form.workType} onChange={e => setForm(f => ({ ...f, workType: e.target.value }))}>
                {WORK_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={loading} className="btn-primary text-sm disabled:opacity-60">
                {loading ? 'Registering…' : 'Register Maid'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Pending approvals */}
      {canApprove && pending.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-navy-800 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block" />
            Pending Approval
          </h2>
          <div className="space-y-2">
            {pending.map(m => (
              <div key={m.id} className="card border-yellow-200 bg-yellow-50 flex items-center justify-between">
                <div>
                  <div className="font-medium text-navy-800">{m.name}</div>
                  <div className="text-sm text-gray-600">{m.workType} · Flat {m.flatAssigned}</div>
                  <div className="text-xs text-gray-400 flex gap-3 mt-0.5">
                    <span>{m.phone}</span>
                    <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" />{m.idCardType}: {m.idCardNumber}</span>
                    <span>{format(new Date(m.createdAt), 'dd MMM, hh:mm a')}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => act(m.id, 'APPROVED')} className="flex items-center gap-1 bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-green-700">
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button onClick={() => act(m.id, 'REJECTED')} className="flex items-center gap-1 bg-red-100 text-red-700 text-sm px-3 py-1.5 rounded-lg hover:bg-red-200">
                    <X className="w-3.5 h-3.5" /> Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All maids log */}
      <h2 className="font-semibold text-navy-800 mb-3">Maid Log</h2>
      <div className="space-y-2">
        {maids.length === 0 && <p className="text-gray-500 text-sm">No maids registered.</p>}
        {maids.map(m => (
          <div key={m.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-medium text-navy-800 text-sm">{m.name}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusColor(m.status))}>
                    {m.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{m.workType}</span>
                </div>
                <div className="text-xs text-gray-500 flex gap-3 flex-wrap">
                  <span>Flat {m.flatAssigned}</span>
                  <span>{m.phone}</span>
                  <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" />{m.idCardType}: {m.idCardNumber}</span>
                  {m.entryTime && <span>In: {format(new Date(m.entryTime), 'hh:mm a')}</span>}
                  {m.exitTime && <span>Out: {format(new Date(m.exitTime), 'hh:mm a')}</span>}
                  {m.approvedBy && <span>Approved by {m.approvedBy.name}</span>}
                </div>
              </div>
              {canLog && m.status === 'APPROVED' && (
                <button onClick={() => act(m.id, 'CHECKED_OUT')} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 ml-2">
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
