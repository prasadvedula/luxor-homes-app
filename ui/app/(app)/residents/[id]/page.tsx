'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Phone, Car, AlertCircle, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useApi } from '@/lib/use-api'

type Owner = {
  id: string
  name: string
  phone: string
  altPhone: string
  email: string
  flat: { label: string; floor: number }
  emergencyContacts: { id: string; name: string; relation: string; phone: string }[]
  vehicles: { id: string; registration: string; type: string; make: string; color: string }[]
}

export default function ResidentDetailPage() {
  const params = useParams()
  const { data: session } = useSession()
  const api = useApi()
  const [owner, setOwner] = useState<Owner | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Owner & { emergencyContacts: Owner['emergencyContacts'], vehicles: Owner['vehicles'] }>>({})

  const id = params.id as string
  const canEdit = session?.user.role === 'ADMIN' || owner?.id === session?.user.id

  useEffect(() => {
    api(`/residents/${id}`).then(r => r.json()).then((data: Owner) => {
      setOwner(data)
      setForm(data)
    })
  }, [api, id])

  async function save() {
    await api(`/residents/${id}`, { method: 'PUT', body: JSON.stringify(form) })
    setEditing(false)
    api(`/residents/${id}`).then(r => r.json()).then(setOwner)
  }

  function addEmergencyContact() {
    setForm(f => ({ ...f, emergencyContacts: [...(f.emergencyContacts ?? []), { id: '', name: '', relation: '', phone: '' }] }))
  }

  function addVehicle() {
    setForm(f => ({ ...f, vehicles: [...(f.vehicles ?? []), { id: '', registration: '', type: 'Car', make: '', color: '' }] }))
  }

  if (!owner) return <div className="text-gray-400 text-sm">Loading…</div>

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/residents" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-navy-800">Flat {owner.flat.label} — {owner.name}</h1>
          <p className="text-sm text-gray-500">Floor {owner.flat.floor}</p>
        </div>
        {canEdit && !editing && (
          <button onClick={() => setEditing(true)} className="ml-auto btn-secondary text-sm">Edit</button>
        )}
      </div>

      {/* Basic Info */}
      <div className="card mb-4">
        <h2 className="font-semibold text-navy-800 mb-3">Contact</h2>
        {editing ? (
          <div className="space-y-3">
            <div><label className="label">Name</label><input className="input" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><label className="label">Alt Phone</label><input className="input" value={form.altPhone ?? ''} onChange={e => setForm(f => ({ ...f, altPhone: e.target.value }))} /></div>
          </div>
        ) : (
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" />{owner.phone}</div>
            {owner.altPhone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" />{owner.altPhone} (alt)</div>}
            <div className="text-gray-500">{owner.email}</div>
          </div>
        )}
      </div>

      {/* Emergency Contacts */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-navy-800 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-400" /> Emergency Contacts</h2>
          {editing && <button onClick={addEmergencyContact} className="text-sm text-navy-600 hover:underline flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add</button>}
        </div>
        {(editing ? form.emergencyContacts : owner.emergencyContacts)?.map((ec, i) => (
          <div key={i} className={`${editing ? 'grid grid-cols-3 gap-2 mb-2' : 'flex gap-4 text-sm text-gray-700 py-1.5 border-b border-gray-50 last:border-0'}`}>
            {editing ? (
              <>
                <input className="input" placeholder="Name" value={ec.name} onChange={e => setForm(f => { const ec2 = [...(f.emergencyContacts ?? [])]; ec2[i] = { ...ec2[i], name: e.target.value }; return { ...f, emergencyContacts: ec2 } })} />
                <input className="input" placeholder="Relation" value={ec.relation} onChange={e => setForm(f => { const ec2 = [...(f.emergencyContacts ?? [])]; ec2[i] = { ...ec2[i], relation: e.target.value }; return { ...f, emergencyContacts: ec2 } })} />
                <div className="flex gap-1">
                  <input className="input" placeholder="Phone" value={ec.phone} onChange={e => setForm(f => { const ec2 = [...(f.emergencyContacts ?? [])]; ec2[i] = { ...ec2[i], phone: e.target.value }; return { ...f, emergencyContacts: ec2 } })} />
                  <button onClick={() => setForm(f => ({ ...f, emergencyContacts: (f.emergencyContacts ?? []).filter((_, j) => j !== i) }))} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </>
            ) : (
              <>
                <span className="font-medium">{ec.name}</span>
                <span className="text-gray-400">({ec.relation})</span>
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-gray-400" />{ec.phone}</span>
              </>
            )}
          </div>
        ))}
        {!editing && owner.emergencyContacts.length === 0 && <p className="text-sm text-gray-400">None added</p>}
      </div>

      {/* Vehicles */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-navy-800 flex items-center gap-2"><Car className="w-4 h-4 text-blue-400" /> Vehicles</h2>
          {editing && <button onClick={addVehicle} className="text-sm text-navy-600 hover:underline flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add</button>}
        </div>
        {(editing ? form.vehicles : owner.vehicles)?.map((v, i) => (
          <div key={i} className={`${editing ? 'grid grid-cols-4 gap-2 mb-2' : 'flex gap-4 text-sm text-gray-700 py-1.5 border-b border-gray-50 last:border-0'}`}>
            {editing ? (
              <>
                <input className="input" placeholder="Reg. No." value={v.registration} onChange={e => setForm(f => { const vs = [...(f.vehicles ?? [])]; vs[i] = { ...vs[i], registration: e.target.value }; return { ...f, vehicles: vs } })} />
                <select className="input" value={v.type} onChange={e => setForm(f => { const vs = [...(f.vehicles ?? [])]; vs[i] = { ...vs[i], type: e.target.value }; return { ...f, vehicles: vs } })}>
                  <option>Car</option><option>Bike</option><option>Scooter</option><option>Other</option>
                </select>
                <input className="input" placeholder="Make" value={v.make} onChange={e => setForm(f => { const vs = [...(f.vehicles ?? [])]; vs[i] = { ...vs[i], make: e.target.value }; return { ...f, vehicles: vs } })} />
                <div className="flex gap-1">
                  <input className="input" placeholder="Color" value={v.color} onChange={e => setForm(f => { const vs = [...(f.vehicles ?? [])]; vs[i] = { ...vs[i], color: e.target.value }; return { ...f, vehicles: vs } })} />
                  <button onClick={() => setForm(f => ({ ...f, vehicles: (f.vehicles ?? []).filter((_, j) => j !== i) }))} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </>
            ) : (
              <>
                <span className="font-mono font-medium">{v.registration}</span>
                <span className="text-gray-500">{v.type}</span>
                {v.make && <span>{v.make}</span>}
                {v.color && <span className="text-gray-400">{v.color}</span>}
              </>
            )}
          </div>
        ))}
        {!editing && owner.vehicles.length === 0 && <p className="text-sm text-gray-400">No vehicles registered</p>}
      </div>

      {editing && (
        <div className="flex gap-3">
          <button onClick={save} className="btn-primary">Save Changes</button>
          <button onClick={() => { setEditing(false); setForm(owner) }} className="btn-secondary">Cancel</button>
        </div>
      )}
    </div>
  )
}
