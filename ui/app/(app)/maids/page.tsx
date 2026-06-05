'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { UserCheck, Plus, Check, X, CreditCard, Clock, LogOut, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { useApi } from '@/lib/use-api'

const ID_TYPES = ['Aadhar Card', 'PAN Card', 'Passport', 'Voter ID', 'Driving Licence']
const WORK_TYPES = ['Housekeeping', 'Cooking', 'Childcare', 'Elderly Care', 'Gardening', 'Other']

type Maid = {
  id: string; name: string; phone: string; idCardType: string; idCardNumber: string
  flatAssigned: string; workType: string; status: string
  entryTime: string | null; exitTime: string | null; note: string | null
  createdAt: string; approvedBy: { name: string } | null
}

const emptyForm = { name: '', phone: '', idCardType: ID_TYPES[0], idCardNumber: '', flatAssigned: '', workType: WORK_TYPES[0] }

const STATUS_STYLE: Record<string, { label: string; badge: string }> = {
  PENDING:     { label: 'Pending',    badge: 'badge-yellow' },
  APPROVED:    { label: 'Approved',   badge: 'badge-green'  },
  REJECTED:    { label: 'Rejected',   badge: 'badge-red'    },
  ACTIVE:      { label: 'Active',     badge: 'badge-blue'   },
  CHECKED_OUT: { label: 'Checked Out',badge: 'badge-gray'   },
}

export default function MaidsPage() {
  const { data: session } = useSession()
  const api = useApi()
  const [maids, setMaids] = useState<Maid[]>([])
  const [tab, setTab] = useState<'pending' | 'all'>('pending')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const role = session?.user?.role
  const isAdmin = role === 'ADMIN'
  const isSecurity = role === 'SECURITY'
  const isResident = role === 'RESIDENT'
  const canRegister = isAdmin || isSecurity || isResident
  const canApprove = isAdmin

  useEffect(() => {
    api('/maids').then(r => r.ok ? r.json() : []).then(d => setMaids(Array.isArray(d) ? d : []))
  }, [api])

  async function submitMaid(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true); setError('')
    const res = await api('/maids', { method: 'POST', body: JSON.stringify(form) })
    if (res.ok) {
      const m = await res.json()
      setMaids(prev => [m, ...prev])
      setShowForm(false); setForm(emptyForm)
    } else {
      const err = await res.json().catch(() => ({}))
      setError(err.error || 'Failed to submit')
    }
    setSubmitting(false)
  }

  async function act(id: string, action: string) {
    const res = await api(`/maids/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) })
    if (res.ok) {
      const updated = await res.json()
      setMaids(prev => prev.map(m => m.id === id ? updated : m))
    }
  }

  const pending = maids.filter(m => m.status === 'PENDING')
  const displayed = tab === 'pending' ? pending : maids

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: '#C9A84C', letterSpacing: '0.08em' }}>MANAGEMENT</p>
          <h1 className="font-display text-3xl font-bold text-white flex items-center gap-3">
            <UserCheck className="w-7 h-7" style={{ color: '#60a5fa' }} /> Maids
          </h1>
          <p className="text-sm mt-1" style={{ color: '#7B8FAD' }}>
            {isResident ? 'Register your maid — admin will verify and approve' : 'Register and manage maid entries with ID verification'}
          </p>
        </div>
        {canRegister && !showForm && (
          <button onClick={() => setShowForm(true)} className="btn-gold">
            <Plus className="w-4 h-4" />
            {isResident ? 'Request Maid' : 'Register Maid'}
          </button>
        )}
      </div>

      {/* Registration form */}
      {showForm && canRegister && (
        <div className="glass p-6 space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5" style={{ color: '#C9A84C' }} />
              {isResident ? 'Request Maid Approval' : 'Register New Maid'}
            </h2>
            <p className="text-sm mt-1" style={{ color: '#4A5E7A' }}>
              {isResident
                ? 'Submit maid details for your flat — admin will review and approve entry access.'
                : 'ID card details are required for entry verification.'}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
              {error}
            </div>
          )}

          <form onSubmit={submitMaid} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="lux-label">Full Name</label>
                <input className="lux-input" required placeholder="Sunita Devi"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="lux-label">Phone Number</label>
                <input className="lux-input" required placeholder="9876543210"
                  value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="lux-label">ID Card Type</label>
                <select className="lux-input" value={form.idCardType} onChange={e => setForm(f => ({ ...f, idCardType: e.target.value }))}>
                  {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="lux-label">ID Card Number</label>
                <input className="lux-input" required placeholder="1234 5678 9012"
                  value={form.idCardNumber} onChange={e => setForm(f => ({ ...f, idCardNumber: e.target.value }))} />
              </div>
              {!isResident && (
                <div>
                  <label className="lux-label">Flat Assigned</label>
                  <input className="lux-input" required placeholder="e.g. 214"
                    value={form.flatAssigned} onChange={e => setForm(f => ({ ...f, flatAssigned: e.target.value }))} />
                </div>
              )}
              <div>
                <label className="lux-label">Work Type</label>
                <select className="lux-input" value={form.workType} onChange={e => setForm(f => ({ ...f, workType: e.target.value }))}>
                  {WORK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={submitting} className="btn-gold disabled:opacity-60">
                {submitting ? 'Submitting…' : isResident ? 'Submit Request' : 'Register Maid'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setError('') }} className="btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(7,16,30,0.6)', border: '1px solid rgba(201,168,76,0.12)' }}>
        {([['pending', `Pending${pending.length ? ` (${pending.length})` : ''}`], ['all', 'All Maids']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === key
              ? { background: 'rgba(201,168,76,0.15)', color: '#E8C55A', border: '1px solid rgba(201,168,76,0.25)' }
              : { color: '#7B8FAD' }}>
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {displayed.length === 0 && (
          <div className="glass p-8 text-center" style={{ color: '#4A5E7A' }}>
            {tab === 'pending' ? 'No pending maid requests' : 'No maids registered yet'}
          </div>
        )}

        {displayed.map(m => {
          const s = STATUS_STYLE[m.status] ?? { label: m.status, badge: 'badge-gray' }
          return (
            <div key={m.id} className="glass p-5">
              <div className="flex items-start justify-between gap-4">
                {/* Avatar + info */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.25)' }}>
                    {m.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold text-sm">{m.name}</span>
                      <span className={`badge ${s.badge}`}>{s.label}</span>
                      <span className="badge badge-blue text-xs" style={{ fontSize: '0.65rem' }}>{m.workType}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs" style={{ color: '#7B8FAD' }}>
                      <span>Flat {m.flatAssigned}</span>
                      <span>{m.phone}</span>
                      <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" />{m.idCardType}: {m.idCardNumber}</span>
                      {m.entryTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />In: {format(new Date(m.entryTime), 'dd MMM, hh:mm a')}</span>}
                      {m.exitTime && <span className="flex items-center gap-1"><LogOut className="w-3 h-3" />Out: {format(new Date(m.exitTime), 'hh:mm a')}</span>}
                      {m.approvedBy && <span style={{ color: '#4A5E7A' }}>Approved by {m.approvedBy.name}</span>}
                      <span style={{ color: '#3A4E6A' }}>{format(new Date(m.createdAt), 'dd MMM yyyy')}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {canApprove && m.status === 'PENDING' && (
                    <>
                      <button onClick={() => act(m.id, 'APPROVED')}
                        className="btn-gold py-1.5 px-3 text-xs">
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => act(m.id, 'REJECTED')}
                        className="btn-danger py-1.5 px-3 text-xs">
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}
                  {(isAdmin || isSecurity) && m.status === 'APPROVED' && (
                    <button onClick={() => act(m.id, 'CHECKED_OUT')}
                      className="btn-ghost py-1.5 px-3 text-xs">
                      <LogOut className="w-3.5 h-3.5" /> Check Out
                    </button>
                  )}
                  {m.status === 'PENDING' && isResident && (
                    <span className="text-xs" style={{ color: '#4A5E7A' }}>Awaiting admin review</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
