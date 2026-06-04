'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Users, Phone, Car, ChevronRight, Check, X, Search, Home, KeyRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApi } from '@/lib/use-api'

type Tenant = { id: string; name: string; phone: string; email: string | null; moveInDate: string | null; leaseEndDate: string | null; rentAmount: number | null }
type Owner = {
  id: string; name: string; phone: string
  flat: { label: string; floor: number }
  emergencyContacts: { name: string; relation: string; phone: string }[]
  vehicles: { registration: string; type: string }[]
  tenant: Tenant | null
  user: { id: string; registrationStatus: string }
}
type PendingUser = {
  id: string; name: string; email: string; phone: string; createdAt: string
  owner: { flat: { label: string } } | null
}

const statusBadge: Record<string, string> = { APPROVED: 'badge-green', PENDING: 'badge-yellow', REJECTED: 'badge-red' }

export default function ResidentsPage() {
  const { data: session } = useSession()
  const api = useApi()
  const [tab, setTab] = useState<'directory' | 'pending'>('directory')
  const [owners, setOwners] = useState<Owner[]>([])
  const [pending, setPending] = useState<PendingUser[]>([])
  const [search, setSearch] = useState('')
  const [filterRented, setFilterRented] = useState<'all' | 'rented' | 'owner'>('all')
  const [loading, setLoading] = useState(true)
  const isAdmin = session?.user.role === 'ADMIN'

  useEffect(() => {
    api('/residents').then(r => r.ok ? r.json() : []).then((d: Owner[]) => { setOwners(Array.isArray(d) ? d : []); setLoading(false) })
    if (isAdmin) api('/admin/pending-users').then(r => r.ok ? r.json() : []).then((d) => setPending(Array.isArray(d) ? d : []))
  }, [api, isAdmin])

  async function handleApproval(userId: string, action: 'APPROVED' | 'REJECTED') {
    await api('/admin/approve-user', { method: 'POST', body: JSON.stringify({ userId, action }) })
    setPending(prev => prev.filter(u => u.id !== userId))
    if (action === 'APPROVED') api('/residents').then(r => r.json()).then(setOwners)
  }

  const rentedCount = owners.filter(o => o.tenant).length

  const filtered = owners.filter(o => {
    const matchSearch = o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.flat.label.includes(search) ||
      (o.tenant?.name.toLowerCase().includes(search.toLowerCase()) ?? false)
    const matchRented = filterRented === 'all' ? true : filterRented === 'rented' ? !!o.tenant : !o.tenant
    return matchSearch && matchRented
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color:'#C9A84C', letterSpacing:'0.08em' }}>MANAGEMENT</p>
          <h1 className="font-display text-3xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7" style={{ color:'#60a5fa' }} /> Residents
          </h1>
          <p className="text-sm mt-1 flex items-center gap-4" style={{ color:'#7B8FAD' }}>
            <span>{owners.length} of 70 flats registered</span>
            {rentedCount > 0 && (
              <span className="flex items-center gap-1.5 badge badge-orange">
                <KeyRound className="w-3 h-3" /> {rentedCount} rented
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      {isAdmin && (
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background:'rgba(7,16,30,0.6)', border:'1px solid rgba(201,168,76,0.12)' }}>
          {(['directory','pending'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
              style={tab===t ? { background:'rgba(201,168,76,0.15)', color:'#E8C55A', border:'1px solid rgba(201,168,76,0.25)' } : { color:'#7B8FAD' }}>
              {t==='directory' ? 'Directory' : `Pending${pending.length ? ` (${pending.length})` : ''}`}
            </button>
          ))}
        </div>
      )}

      {/* Pending approvals */}
      {tab==='pending' && isAdmin && (
        <div className="space-y-3">
          {pending.length===0 && <div className="glass p-8 text-center" style={{ color:'#4A5E7A' }}>No pending registrations</div>}
          {pending.map(u => (
            <div key={u.id} className="glass p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ background:'rgba(201,168,76,0.15)', color:'#C9A84C', border:'1px solid rgba(201,168,76,0.25)' }}>{u.name[0]}</div>
                <div>
                  <div className="text-white font-medium">{u.name}</div>
                  <div className="text-xs mt-0.5" style={{ color:'#7B8FAD' }}>{u.email} · Flat {u.owner?.flat.label ?? '?'}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleApproval(u.id,'APPROVED')} className="btn-gold py-2 px-4 text-xs"><Check className="w-3.5 h-3.5" /> Approve</button>
                <button onClick={() => handleApproval(u.id,'REJECTED')} className="btn-danger py-2 px-4 text-xs"><X className="w-3.5 h-3.5" /> Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Directory */}
      {tab==='directory' && (
        <>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:'#4A5E7A' }} />
              <input className="lux-input pl-10" placeholder="Search owner, tenant, or flat…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {/* Rented filter */}
            <div className="flex gap-1 p-1 rounded-xl flex-shrink-0" style={{ background:'rgba(7,16,30,0.6)', border:'1px solid rgba(201,168,76,0.12)' }}>
              {(['all','owner','rented'] as const).map(f => (
                <button key={f} onClick={() => setFilterRented(f)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all flex items-center gap-1.5"
                  style={filterRented===f ? { background:'rgba(201,168,76,0.15)', color:'#E8C55A', border:'1px solid rgba(201,168,76,0.25)' } : { color:'#7B8FAD' }}>
                  {f==='rented' && <KeyRound className="w-3 h-3" />}
                  {f==='owner'  && <Home className="w-3 h-3" />}
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="glass p-8 text-center" style={{ color:'#4A5E7A' }}>Loading…</div>
          ) : (
            <div className="space-y-2">
              {filtered.length===0 && <div className="glass p-8 text-center" style={{ color:'#4A5E7A' }}>No residents found</div>}
              {filtered.map(owner => (
                <Link key={owner.id} href={`/residents/${owner.id}`} className="glass p-4 flex items-center gap-4 group" style={{ textDecoration:'none' }}>
                  {/* Flat badge */}
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold flex-shrink-0 relative"
                    style={ owner.tenant ? { background:'rgba(249,115,22,0.12)', color:'#fb923c', border:'1px solid rgba(249,115,22,0.25)' } : { background:'rgba(201,168,76,0.1)', color:'#C9A84C', border:'1px solid rgba(201,168,76,0.2)' }}>
                    {owner.flat.label}
                    {owner.tenant && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background:'rgba(249,115,22,0.9)', border:'1px solid #050D1A' }}>
                        <KeyRound className="w-2.5 h-2.5 text-white" />
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {/* Owner row */}
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white font-medium text-sm">{owner.name}</span>
                      <span className="badge badge-blue text-xs" style={{ padding:'1px 6px', fontSize:'0.6rem' }}>Owner</span>
                    </div>
                    <div className="text-xs flex items-center gap-3 mb-1" style={{ color:'#7B8FAD' }}>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{owner.phone}</span>
                      {owner.vehicles.length>0 && <span className="flex items-center gap-1"><Car className="w-3 h-3" />{owner.vehicles.length}v</span>}
                      <span style={{ color:'#3A4E6A' }}>Fl.{owner.flat.floor}</span>
                    </div>
                    {/* Tenant row */}
                    {owner.tenant && (
                      <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor:'rgba(249,115,22,0.15)' }}>
                        <KeyRound className="w-3 h-3 flex-shrink-0" style={{ color:'#fb923c' }} />
                        <span className="text-xs font-medium" style={{ color:'#fb923c' }}>Tenant:</span>
                        <span className="text-xs text-white">{owner.tenant.name}</span>
                        <span className="text-xs" style={{ color:'#7B8FAD' }}>{owner.tenant.phone}</span>
                        {owner.tenant.rentAmount && <span className="text-xs" style={{ color:'#4A5E7A' }}>₹{owner.tenant.rentAmount.toLocaleString()}/mo</span>}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {owner.tenant
                      ? <span className="badge badge-orange">Rented</span>
                      : <span className={cn('badge', statusBadge[owner.user.registrationStatus]??'badge-gray')}>{owner.user.registrationStatus.toLowerCase()}</span>
                    }
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color:'#C9A84C' }} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
