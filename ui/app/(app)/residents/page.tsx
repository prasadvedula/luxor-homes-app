'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Users, Car, Phone, ChevronRight, Check, X } from 'lucide-react'
import { cn, statusColor } from '@/lib/utils'
import { useApi } from '@/lib/use-api'

type Owner = {
  id: string
  name: string
  phone: string
  flat: { label: string; floor: number }
  emergencyContacts: { name: string; relation: string; phone: string }[]
  vehicles: { registration: string; type: string }[]
  user: { id: string; registrationStatus: string }
}

type PendingUser = {
  id: string
  name: string
  email: string
  phone: string
  createdAt: string
  owner: { flat: { label: string } } | null
}

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
    api('/residents').then(r => r.json()).then((data: Owner[]) => { setOwners(data); setLoading(false) })
    if (isAdmin) {
      api('/admin/pending-users').then(r => r.json()).then(setPending)
    }
  }, [api, isAdmin])

  async function handleApproval(userId: string, action: 'APPROVED' | 'REJECTED') {
    await api('/admin/approve-user', {
      method: 'POST',
      body: JSON.stringify({ userId, action }),
    })
    setPending(prev => prev.filter(u => u.id !== userId))
    if (action === 'APPROVED') {
      api('/residents').then(r => r.json()).then(setOwners)
    }
  }

  const filtered = owners.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.flat.label.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" /> Residents
          </h1>
          <p className="text-gray-500 text-sm mt-1">Flat directory for Luxor Homes — 70 flats across 5 floors</p>
        </div>
      </div>

      {/* Tabs */}
      {isAdmin && (
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
          {(['directory', 'pending'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors', tab === t ? 'bg-white shadow text-navy-800' : 'text-gray-500 hover:text-gray-700')}
            >
              {t === 'directory' ? 'Directory' : `Pending Approvals${pending.length ? ` (${pending.length})` : ''}`}
            </button>
          ))}
        </div>
      )}

      {tab === 'pending' && isAdmin && (
        <div className="space-y-3">
          {pending.length === 0 && <p className="text-gray-500 text-sm">No pending registrations.</p>}
          {pending.map(u => (
            <div key={u.id} className="card flex items-center justify-between">
              <div>
                <div className="font-medium text-navy-800">{u.name}</div>
                <div className="text-sm text-gray-500">{u.email} · Flat {u.owner?.flat.label ?? '?'}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleApproval(u.id, 'APPROVED')} className="flex items-center gap-1 bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-green-700">
                  <Check className="w-3.5 h-3.5" /> Approve
                </button>
                <button onClick={() => handleApproval(u.id, 'REJECTED')} className="flex items-center gap-1 bg-red-100 text-red-700 text-sm px-3 py-1.5 rounded-lg hover:bg-red-200">
                  <X className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'directory' && (
        <>
          <input
            className="input max-w-xs mb-5"
            placeholder="Search by name or flat…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {loading ? (
            <div className="text-gray-400 text-sm">Loading…</div>
          ) : (
            <div className="space-y-2">
              {filtered.length === 0 && <p className="text-gray-500 text-sm">No residents found.</p>}
              {filtered.map(owner => (
                <Link key={owner.id} href={`/residents/${owner.id}`}
                  className="card flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {owner.flat.label}
                    </div>
                    <div>
                      <div className="font-medium text-navy-800">{owner.name}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{owner.phone}</span>
                        {owner.vehicles.length > 0 && (
                          <span className="flex items-center gap-1"><Car className="w-3 h-3" />{owner.vehicles.length} vehicle{owner.vehicles.length > 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium', statusColor(owner.user.registrationStatus))}>
                      {owner.user.registrationStatus.toLowerCase()}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
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
