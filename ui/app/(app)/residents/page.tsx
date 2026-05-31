'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Users, Phone, Car, ChevronRight, Check, X, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApi } from '@/lib/use-api'

type Owner = {
  id: string; name: string; phone: string
  flat: { label: string; floor: number }
  emergencyContacts: { name: string; relation: string; phone: string }[]
  vehicles: { registration: string; type: string }[]
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
  const [loading, setLoading] = useState(true)
  const isAdmin = session?.user.role === 'ADMIN'

  useEffect(() => {
    api('/residents').then(r => r.json()).then((d: Owner[]) => { setOwners(d); setLoading(false) })
    if (isAdmin) api('/admin/pending-users').then(r => r.json()).then(setPending)
  }, [api, isAdmin])

  async function handleApproval(userId: string, action: 'APPROVED' | 'REJECTED') {
    await api('/admin/approve-user', { method: 'POST', body: JSON.stringify({ userId, action }) })
    setPending(prev => prev.filter(u => u.id !== userId))
    if (action === 'APPROVED') api('/residents').then(r => r.json()).then(setOwners)
  }

  const filtered = owners.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) || o.flat.label.includes(search)
  )

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold mb-1" style={{ color:'#C9A84C', letterSpacing:'0.08em' }}>MANAGEMENT</p>
        <h1 className="font-display text-3xl font-bold text-white flex items-center gap-3">
          <Users className="w-7 h-7" style={{ color:'#60a5fa' }} /> Residents
        </h1>
        <p className="text-sm mt-1" style={{ color:'#7B8FAD' }}>{owners.length} of 70 flats registered · 5 floors</p>
      </div>

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

      {tab==='directory' && (
        <>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:'#4A5E7A' }} />
            <input className="lux-input pl-10" placeholder="Search by name or flat number…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {loading ? (
            <div className="glass p-8 text-center" style={{ color:'#4A5E7A' }}>Loading…</div>
          ) : (
            <div className="space-y-2">
              {filtered.length===0 && <div className="glass p-8 text-center" style={{ color:'#4A5E7A' }}>No residents found</div>}
              {filtered.map(owner => (
                <Link key={owner.id} href={`/residents/${owner.id}`} className="glass p-4 flex items-center gap-4 group" style={{ textDecoration:'none' }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold flex-shrink-0" style={{ background:'rgba(201,168,76,0.1)', color:'#C9A84C', border:'1px solid rgba(201,168,76,0.2)' }}>{owner.flat.label}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium">{owner.name}</div>
                    <div className="text-xs mt-0.5 flex items-center gap-3" style={{ color:'#7B8FAD' }}>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{owner.phone}</span>
                      {owner.vehicles.length>0 && <span className="flex items-center gap-1"><Car className="w-3 h-3" />{owner.vehicles.length} vehicle{owner.vehicles.length>1?'s':''}</span>}
                      <span style={{ color:'#3A4E6A' }}>Floor {owner.flat.floor}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn('badge', statusBadge[owner.user.registrationStatus]??'badge-gray')}>{owner.user.registrationStatus.toLowerCase()}</span>
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
