'use client'
import { useEffect, useState } from 'react'
import { ShieldCheck, Plus, Trash2, Phone, Eye, EyeOff, KeyRound } from 'lucide-react'
import { useApi } from '@/lib/use-api'
import { format } from 'date-fns'

type Officer = { id: string; name: string; phone: string; mustChangePassword: boolean; createdAt: string }
const emptyForm = { name: '', phone: '', defaultPassword: '' }

export default function SecurityOfficersPage() {
  const api = useApi()
  const [officers, setOfficers] = useState<Officer[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    api('/admin/security-officers').then(r => r.ok ? r.json() : []).then(d => {
      setOfficers(Array.isArray(d) ? d : [])
      setPageLoading(false)
    })
  }, [api])

  async function create(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    const res = await api('/admin/security-officers', { method: 'POST', body: JSON.stringify(form) })
    setLoading(false)
    if (res.ok) {
      const o = await res.json()
      setOfficers(prev => [...prev, o])
      setShowForm(false); setForm(emptyForm)
    } else {
      const err = await res.json().catch(() => ({}))
      setError(err.error || 'Failed to create')
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Remove security officer ${name}?`)) return
    const res = await api(`/admin/security-officers/${id}`, { method: 'DELETE' })
    if (res.ok) setOfficers(prev => prev.filter(o => o.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: '#C9A84C', letterSpacing: '0.08em' }}>ADMIN</p>
          <h1 className="font-display text-3xl font-bold text-white flex items-center gap-3">
            <ShieldCheck className="w-7 h-7" style={{ color: '#4ade80' }} /> Security Officers
          </h1>
          <p className="text-sm mt-1" style={{ color: '#7B8FAD' }}>Manage gate security officer accounts</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-gold">
            <Plus className="w-4 h-4" /> Add Officer
          </button>
        )}
      </div>

      {showForm && (
        <div className="glass p-6 space-y-4 animate-scale-in">
          <h2 className="font-semibold text-white">New Security Officer</h2>
          {error && <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>{error}</div>}
          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="lux-label">Full Name</label>
                <input className="lux-input" required placeholder="Raju Singh"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="lux-label">Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#4A5E7A' }} />
                  <input className="lux-input pl-10" required placeholder="9876543210"
                    value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="lux-label">Default Password <span className="normal-case font-normal" style={{ color: '#4A5E7A' }}>(officer must change on first login)</span></label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#4A5E7A' }} />
                  <input type={showPwd ? 'text' : 'password'} className="lux-input pl-10 pr-10" required minLength={6}
                    placeholder="Min 6 characters" value={form.defaultPassword}
                    onChange={e => setForm(f => ({ ...f, defaultPassword: e.target.value }))} />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#4A5E7A' }}>
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="btn-gold disabled:opacity-60">
                {loading ? <><span className="spinner-sm spinner" /> Creating…</> : 'Create Officer'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setError('') }} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {pageLoading ? (
          [1, 2].map(i => <div key={i} className="skeleton skeleton-card" style={{ animationDelay: `${i * 0.1}s` }} />)
        ) : officers.length === 0 ? (
          <div className="glass p-10 text-center animate-fade-in" style={{ color: '#4A5E7A' }}>
            <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No security officers added yet.</p>
          </div>
        ) : officers.map((o, i) => (
          <div key={o.id} className="glass p-5 flex items-center gap-4 animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold flex-shrink-0"
              style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}>
              {o.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-semibold">{o.name}</span>
                {o.mustChangePassword && (
                  <span className="badge badge-yellow text-xs" style={{ fontSize: '0.6rem' }}>Must change password</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: '#7B8FAD' }}>
                <Phone className="w-3 h-3" /> {o.phone}
                <span className="ml-2" style={{ color: '#3A4E6A' }}>Added {format(new Date(o.createdAt), 'dd MMM yyyy')}</span>
              </div>
            </div>
            <button onClick={() => remove(o.id, o.name)}
              className="p-2 rounded-lg ripple flex-shrink-0" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
