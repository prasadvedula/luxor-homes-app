'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Phone, Car, AlertCircle, Plus, Trash2, Edit3, Save, X } from 'lucide-react'
import Link from 'next/link'
import { useApi } from '@/lib/use-api'

type Owner = {
  id: string; name: string; phone: string; altPhone: string; email: string
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
  const [form, setForm] = useState<Partial<Owner & { emergencyContacts: Owner['emergencyContacts']; vehicles: Owner['vehicles'] }>>({})
  const id = params.id as string
  const canEdit = session?.user.role === 'ADMIN' || owner?.id === session?.user.id

  useEffect(() => {
    api(`/residents/${id}`).then(r => r.json()).then((d: Owner) => { setOwner(d); setForm(d) })
  }, [api, id])

  async function save() {
    await api(`/residents/${id}`, { method: 'PUT', body: JSON.stringify(form) })
    setEditing(false)
    api(`/residents/${id}`).then(r => r.json()).then(setOwner)
  }

  if (!owner) return <div className="glass p-8 text-center" style={{ color:'#4A5E7A' }}>Loading…</div>

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/residents" className="w-9 h-9 rounded-xl flex items-center justify-center transition-all" style={{ background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.2)', color:'#C9A84C' }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base" style={{ background:'linear-gradient(135deg,#C9A84C,#E8C55A)', color:'#050D1A' }}>
              {owner.flat.label}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white">{owner.name}</h1>
              <p className="text-sm" style={{ color:'#7B8FAD' }}>Flat {owner.flat.label} · Floor {owner.flat.floor}</p>
            </div>
          </div>
        </div>
        {canEdit && !editing && (
          <button onClick={() => setEditing(true)} className="btn-ghost py-2 px-4 text-sm"><Edit3 className="w-3.5 h-3.5" /> Edit</button>
        )}
      </div>

      {/* Contact card */}
      <div className="glass p-6">
        <p className="text-xs font-semibold mb-4" style={{ color:'#4A5E7A', letterSpacing:'0.08em' }}>CONTACT DETAILS</p>
        {editing ? (
          <div className="space-y-3">
            <div><label className="lux-label">Full Name</label><input className="lux-input" value={form.name??''} onChange={e => setForm(f=>({...f,name:e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="lux-label">Primary Phone</label><input className="lux-input" value={form.phone??''} onChange={e => setForm(f=>({...f,phone:e.target.value}))} /></div>
              <div><label className="lux-label">Alt Phone</label><input className="lux-input" value={form.altPhone??''} onChange={e => setForm(f=>({...f,altPhone:e.target.value}))} /></div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:'rgba(96,165,250,0.1)', border:'1px solid rgba(96,165,250,0.2)' }}><Phone className="w-4 h-4" style={{ color:'#60a5fa' }} /></div><div><div className="text-white text-sm font-medium">{owner.phone}</div><div className="text-xs" style={{ color:'#4A5E7A' }}>Primary</div></div></div>
            {owner.altPhone && <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:'rgba(96,165,250,0.1)', border:'1px solid rgba(96,165,250,0.2)' }}><Phone className="w-4 h-4" style={{ color:'#60a5fa' }} /></div><div><div className="text-white text-sm font-medium">{owner.altPhone}</div><div className="text-xs" style={{ color:'#4A5E7A' }}>Alternate</div></div></div>}
            <div className="text-sm" style={{ color:'#7B8FAD' }}>{owner.email}</div>
          </div>
        )}
      </div>

      {/* Emergency contacts */}
      <div className="glass p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold flex items-center gap-2" style={{ color:'#4A5E7A', letterSpacing:'0.08em' }}>
            <AlertCircle className="w-3.5 h-3.5" style={{ color:'#f87171' }} /> EMERGENCY CONTACTS
          </p>
          {editing && <button onClick={() => setForm(f=>({...f,emergencyContacts:[...(f.emergencyContacts??[]),{id:'',name:'',relation:'',phone:''}]}))} className="text-xs flex items-center gap-1" style={{ color:'#C9A84C' }}><Plus className="w-3 h-3" /> Add</button>}
        </div>
        {(editing ? form.emergencyContacts : owner.emergencyContacts)?.map((ec, i) => (
          editing ? (
            <div key={i} className="grid grid-cols-3 gap-2 mb-2">
              <input className="lux-input text-xs" placeholder="Name" value={ec.name} onChange={e => setForm(f=>{const ec2=[...(f.emergencyContacts??[])];ec2[i]={...ec2[i],name:e.target.value};return{...f,emergencyContacts:ec2}})} />
              <input className="lux-input text-xs" placeholder="Relation" value={ec.relation} onChange={e => setForm(f=>{const ec2=[...(f.emergencyContacts??[])];ec2[i]={...ec2[i],relation:e.target.value};return{...f,emergencyContacts:ec2}})} />
              <div className="flex gap-1">
                <input className="lux-input text-xs" placeholder="Phone" value={ec.phone} onChange={e => setForm(f=>{const ec2=[...(f.emergencyContacts??[])];ec2[i]={...ec2[i],phone:e.target.value};return{...f,emergencyContacts:ec2}})} />
                <button onClick={() => setForm(f=>({...f,emergencyContacts:(f.emergencyContacts??[]).filter((_,j)=>j!==i)}))} style={{ color:'#f87171' }}><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-center gap-4 py-2.5 border-b last:border-0" style={{ borderColor:'rgba(201,168,76,0.08)' }}>
              <div className="flex-1"><div className="text-white text-sm font-medium">{ec.name}</div><div className="text-xs" style={{ color:'#7B8FAD' }}>{ec.relation}</div></div>
              <div className="flex items-center gap-1 text-sm" style={{ color:'#7B8FAD' }}><Phone className="w-3 h-3" />{ec.phone}</div>
            </div>
          )
        ))}
        {!editing && owner.emergencyContacts.length===0 && <p className="text-sm" style={{ color:'#4A5E7A' }}>None added</p>}
      </div>

      {/* Vehicles */}
      <div className="glass p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold flex items-center gap-2" style={{ color:'#4A5E7A', letterSpacing:'0.08em' }}>
            <Car className="w-3.5 h-3.5" style={{ color:'#60a5fa' }} /> REGISTERED VEHICLES
          </p>
          {editing && <button onClick={() => setForm(f=>({...f,vehicles:[...(f.vehicles??[]),{id:'',registration:'',type:'Car',make:'',color:''}]}))} className="text-xs flex items-center gap-1" style={{ color:'#C9A84C' }}><Plus className="w-3 h-3" /> Add</button>}
        </div>
        {(editing ? form.vehicles : owner.vehicles)?.map((v, i) => (
          editing ? (
            <div key={i} className="grid grid-cols-4 gap-2 mb-2">
              <input className="lux-input text-xs" placeholder="Reg. No." value={v.registration} onChange={e => setForm(f=>{const vs=[...(f.vehicles??[])];vs[i]={...vs[i],registration:e.target.value};return{...f,vehicles:vs}})} />
              <select className="lux-input text-xs" value={v.type} onChange={e => setForm(f=>{const vs=[...(f.vehicles??[])];vs[i]={...vs[i],type:e.target.value};return{...f,vehicles:vs}})}>
                <option>Car</option><option>Bike</option><option>Scooter</option><option>Other</option>
              </select>
              <input className="lux-input text-xs" placeholder="Make" value={v.make} onChange={e => setForm(f=>{const vs=[...(f.vehicles??[])];vs[i]={...vs[i],make:e.target.value};return{...f,vehicles:vs}})} />
              <div className="flex gap-1">
                <input className="lux-input text-xs" placeholder="Color" value={v.color} onChange={e => setForm(f=>{const vs=[...(f.vehicles??[])];vs[i]={...vs[i],color:e.target.value};return{...f,vehicles:vs}})} />
                <button onClick={() => setForm(f=>({...f,vehicles:(f.vehicles??[]).filter((_,j)=>j!==i)}))} style={{ color:'#f87171' }}><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-center gap-4 py-2.5 border-b last:border-0" style={{ borderColor:'rgba(201,168,76,0.08)' }}>
              <span className="font-mono text-sm text-white font-semibold">{v.registration}</span>
              <span className="badge badge-blue text-xs">{v.type}</span>
              {v.make && <span className="text-sm" style={{ color:'#7B8FAD' }}>{v.make}</span>}
              {v.color && <span className="text-sm" style={{ color:'#4A5E7A' }}>{v.color}</span>}
            </div>
          )
        ))}
        {!editing && owner.vehicles.length===0 && <p className="text-sm" style={{ color:'#4A5E7A' }}>No vehicles registered</p>}
      </div>

      {editing && (
        <div className="flex gap-3">
          <button onClick={save} className="btn-gold"><Save className="w-4 h-4" /> Save Changes</button>
          <button onClick={() => { setEditing(false); setForm(owner) }} className="btn-ghost"><X className="w-4 h-4" /> Cancel</button>
        </div>
      )}
    </div>
  )
}
