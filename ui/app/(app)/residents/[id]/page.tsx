'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Phone, Car, AlertCircle, Plus, Trash2, Edit3, Save, X, KeyRound, Home, Calendar, IndianRupee, FileText, User, ToggleLeft, ToggleRight } from 'lucide-react'
import Link from 'next/link'
import { useApi } from '@/lib/use-api'
import { format } from 'date-fns'

type Tenant = {
  id: string; name: string; phone: string; email: string | null
  moveInDate: string | null; leaseEndDate: string | null
  rentAmount: number | null; agreementNumber: string | null
}
type Owner = {
  id: string; name: string; phone: string; altPhone: string; email: string
  flat: { label: string; floor: number }
  emergencyContacts: { id: string; name: string; relation: string; phone: string }[]
  vehicles: { id: string; registration: string; type: string; make: string; color: string }[]
  tenant: Tenant | null
}

type TenantForm = {
  name: string; phone: string; email: string
  moveInDate: string; leaseEndDate: string
  rentAmount: string; agreementNumber: string
}

const emptyTenant: TenantForm = { name:'', phone:'', email:'', moveInDate:'', leaseEndDate:'', rentAmount:'', agreementNumber:'' }

export default function ResidentDetailPage() {
  const params = useParams()
  const { data: session } = useSession()
  const api = useApi()
  const [owner, setOwner] = useState<Owner | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Owner & { emergencyContacts: Owner['emergencyContacts']; vehicles: Owner['vehicles'] }>>({})
  const [isRented, setIsRented] = useState(false)
  const [tenantForm, setTenantForm] = useState<TenantForm>(emptyTenant)
  const [saving, setSaving] = useState(false)

  const id = params.id as string
  const canEdit = session?.user.role === 'ADMIN' || owner?.id === session?.user.id

  useEffect(() => {
    api(`/residents/${id}`).then(r => r.json()).then((d: Owner) => {
      setOwner(d)
      setForm(d)
      setIsRented(!!d.tenant)
      if (d.tenant) {
        setTenantForm({
          name: d.tenant.name ?? '',
          phone: d.tenant.phone ?? '',
          email: d.tenant.email ?? '',
          moveInDate: d.tenant.moveInDate ? d.tenant.moveInDate.split('T')[0] : '',
          leaseEndDate: d.tenant.leaseEndDate ? d.tenant.leaseEndDate.split('T')[0] : '',
          rentAmount: d.tenant.rentAmount ? String(d.tenant.rentAmount) : '',
          agreementNumber: d.tenant.agreementNumber ?? '',
        })
      } else {
        setTenantForm(emptyTenant)
      }
    })
  }, [api, id])

  function setTF(key: keyof TenantForm, val: string) { setTenantForm(f => ({ ...f, [key]: val })) }

  async function save() {
    setSaving(true)
    await api(`/residents/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...form,
        tenantData: isRented ? {
          name: tenantForm.name, phone: tenantForm.phone, email: tenantForm.email || null,
          moveInDate: tenantForm.moveInDate || null, leaseEndDate: tenantForm.leaseEndDate || null,
          rentAmount: tenantForm.rentAmount ? Number(tenantForm.rentAmount) : null,
          agreementNumber: tenantForm.agreementNumber || null,
        } : null,
      }),
    })
    setSaving(false)
    setEditing(false)
    api(`/residents/${id}`).then(r => r.json()).then((d: Owner) => {
      setOwner(d); setForm(d); setIsRented(!!d.tenant)
      if (d.tenant) setTenantForm({ name:d.tenant.name, phone:d.tenant.phone, email:d.tenant.email??'', moveInDate:d.tenant.moveInDate?d.tenant.moveInDate.split('T')[0]:'', leaseEndDate:d.tenant.leaseEndDate?d.tenant.leaseEndDate.split('T')[0]:'', rentAmount:d.tenant.rentAmount?String(d.tenant.rentAmount):'', agreementNumber:d.tenant.agreementNumber??'' })
    })
  }

  if (!owner) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor:'rgba(201,168,76,0.3)', borderTopColor:'#C9A84C' }} />
    </div>
  )

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/residents" className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.2)', color:'#C9A84C' }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0"
            style={{ background: owner.tenant ? 'rgba(249,115,22,0.15)' : 'linear-gradient(135deg,#C9A84C,#E8C55A)', color: owner.tenant ? '#fb923c' : '#050D1A', border: owner.tenant ? '1px solid rgba(249,115,22,0.3)' : 'none' }}>
            {owner.flat.label}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-xl font-bold text-white">{owner.name}</h1>
              {owner.tenant
                ? <span className="badge badge-orange"><KeyRound className="w-3 h-3" /> Rented</span>
                : <span className="badge badge-blue"><Home className="w-3 h-3" /> Owner-Occupied</span>}
            </div>
            <p className="text-sm mt-0.5" style={{ color:'#7B8FAD' }}>Flat {owner.flat.label} · Floor {owner.flat.floor}</p>
          </div>
        </div>
        {canEdit && !editing && (
          <button onClick={() => setEditing(true)} className="btn-ghost py-2 px-4 text-sm flex-shrink-0">
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </button>
        )}
      </div>

      {/* Owner Contact */}
      <div className="glass p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4" style={{ color:'#60a5fa' }} />
          <p className="text-xs font-bold" style={{ color:'#4A5E7A', letterSpacing:'0.08em' }}>OWNER DETAILS</p>
        </div>
        {editing ? (
          <div className="space-y-3">
            <div><label className="lux-label">Full Name</label><input className="lux-input" value={form.name??''} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="lux-label">Primary Phone</label><input className="lux-input" value={form.phone??''} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></div>
              <div><label className="lux-label">Alt Phone</label><input className="lux-input" value={form.altPhone??''} onChange={e=>setForm(f=>({...f,altPhone:e.target.value}))} /></div>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:'rgba(96,165,250,0.1)', border:'1px solid rgba(96,165,250,0.2)' }}><Phone className="w-4 h-4" style={{ color:'#60a5fa' }} /></div><div><div className="text-white text-sm font-medium">{owner.phone}</div><div className="text-xs" style={{ color:'#4A5E7A' }}>Primary</div></div></div>
            {owner.altPhone && <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:'rgba(96,165,250,0.1)', border:'1px solid rgba(96,165,250,0.2)' }}><Phone className="w-4 h-4" style={{ color:'#60a5fa' }} /></div><div><div className="text-white text-sm font-medium">{owner.altPhone}</div><div className="text-xs" style={{ color:'#4A5E7A' }}>Alternate</div></div></div>}
            <div className="text-sm" style={{ color:'#7B8FAD' }}>{owner.email}</div>
          </div>
        )}
      </div>

      {/* ── TENANT SECTION ───────────────────────────── */}
      <div className="glass p-6" style={ (owner.tenant || (editing && isRented)) ? { borderColor:'rgba(249,115,22,0.3)', background:'rgba(249,115,22,0.04)' } : {}}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" style={{ color: (owner.tenant || isRented) ? '#fb923c' : '#4A5E7A' }} />
            <p className="text-xs font-bold" style={{ color: (owner.tenant || isRented) ? '#fb923c' : '#4A5E7A', letterSpacing:'0.08em' }}>TENANT DETAILS</p>
          </div>
          {editing && (
            <button onClick={() => { setIsRented(v => !v); if (isRented) setTenantForm(emptyTenant) }}
              className="flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ color: isRented ? '#fb923c' : '#7B8FAD' }}>
              {isRented ? <ToggleRight className="w-6 h-6" style={{ color:'#fb923c' }} /> : <ToggleLeft className="w-6 h-6" />}
              {isRented ? 'Flat is rented' : 'Mark as rented'}
            </button>
          )}
        </div>

        {/* Not editing, no tenant */}
        {!editing && !owner.tenant && (
          <div className="flex items-center gap-3 py-2">
            <Home className="w-4 h-4" style={{ color:'#4A5E7A' }} />
            <p className="text-sm" style={{ color:'#4A5E7A' }}>This flat is owner-occupied. No tenant on record.</p>
          </div>
        )}

        {/* Editing: show tenant form when toggled on */}
        {editing && isRented && (
          <div className="space-y-4 animate-fade-up">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="lux-label">Tenant Name *</label><input className="lux-input" required value={tenantForm.name} onChange={e=>setTF('name',e.target.value)} placeholder="Full name" /></div>
              <div><label className="lux-label">Tenant Phone *</label><input className="lux-input" required value={tenantForm.phone} onChange={e=>setTF('phone',e.target.value)} placeholder="9876543210" /></div>
              <div><label className="lux-label">Tenant Email</label><input type="email" className="lux-input" value={tenantForm.email} onChange={e=>setTF('email',e.target.value)} placeholder="tenant@email.com" /></div>
              <div><label className="lux-label">Monthly Rent (₹)</label>
                <div className="relative"><IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color:'#4A5E7A' }} /><input type="number" className="lux-input pl-8" value={tenantForm.rentAmount} onChange={e=>setTF('rentAmount',e.target.value)} placeholder="25000" /></div>
              </div>
              <div><label className="lux-label">Move-in Date</label><input type="date" className="lux-input" value={tenantForm.moveInDate} onChange={e=>setTF('moveInDate',e.target.value)} /></div>
              <div><label className="lux-label">Lease End Date</label><input type="date" className="lux-input" value={tenantForm.leaseEndDate} onChange={e=>setTF('leaseEndDate',e.target.value)} /></div>
              <div className="col-span-2"><label className="lux-label">Agreement / Lease No.</label><input className="lux-input" value={tenantForm.agreementNumber} onChange={e=>setTF('agreementNumber',e.target.value)} placeholder="e.g. LSE-2024-101" /></div>
            </div>
          </div>
        )}

        {/* View mode: show tenant details */}
        {!editing && owner.tenant && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background:'rgba(249,115,22,0.08)' }}>
                <User className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color:'#fb923c' }} />
                <div><div className="text-xs font-semibold mb-0.5" style={{ color:'#fb923c' }}>TENANT</div><div className="text-white font-semibold">{owner.tenant.name}</div><div className="text-xs mt-0.5" style={{ color:'#7B8FAD' }}>{owner.tenant.phone}</div>{owner.tenant.email && <div className="text-xs" style={{ color:'#4A5E7A' }}>{owner.tenant.email}</div>}</div>
              </div>
              {owner.tenant.rentAmount && (
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background:'rgba(249,115,22,0.08)' }}>
                  <IndianRupee className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color:'#fb923c' }} />
                  <div><div className="text-xs font-semibold mb-0.5" style={{ color:'#fb923c' }}>MONTHLY RENT</div><div className="text-white font-semibold font-display text-xl">₹{owner.tenant.rentAmount.toLocaleString()}</div></div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {owner.tenant.moveInDate && (
                <div className="p-3 rounded-xl" style={{ background:'rgba(7,16,30,0.5)', border:'1px solid rgba(249,115,22,0.12)' }}>
                  <div className="flex items-center gap-1.5 mb-1"><Calendar className="w-3 h-3" style={{ color:'#fb923c' }} /><span className="text-xs font-semibold" style={{ color:'#fb923c' }}>MOVE-IN</span></div>
                  <div className="text-white text-sm">{format(new Date(owner.tenant.moveInDate),'dd MMM yyyy')}</div>
                </div>
              )}
              {owner.tenant.leaseEndDate && (
                <div className="p-3 rounded-xl" style={{ background:'rgba(7,16,30,0.5)', border:'1px solid rgba(249,115,22,0.12)' }}>
                  <div className="flex items-center gap-1.5 mb-1"><Calendar className="w-3 h-3" style={{ color:'#fb923c' }} /><span className="text-xs font-semibold" style={{ color:'#fb923c' }}>LEASE END</span></div>
                  <div className="text-white text-sm">{format(new Date(owner.tenant.leaseEndDate),'dd MMM yyyy')}</div>
                </div>
              )}
              {owner.tenant.agreementNumber && (
                <div className="p-3 rounded-xl" style={{ background:'rgba(7,16,30,0.5)', border:'1px solid rgba(249,115,22,0.12)' }}>
                  <div className="flex items-center gap-1.5 mb-1"><FileText className="w-3 h-3" style={{ color:'#fb923c' }} /><span className="text-xs font-semibold" style={{ color:'#fb923c' }}>AGREEMENT</span></div>
                  <div className="text-white text-sm font-mono">{owner.tenant.agreementNumber}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Emergency Contacts */}
      <div className="glass p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4" style={{ color:'#f87171' }} /><p className="text-xs font-bold" style={{ color:'#4A5E7A', letterSpacing:'0.08em' }}>EMERGENCY CONTACTS</p></div>
          {editing && <button onClick={() => setForm(f=>({...f,emergencyContacts:[...(f.emergencyContacts??[]),{id:'',name:'',relation:'',phone:''}]}))} className="text-xs flex items-center gap-1" style={{ color:'#C9A84C' }}><Plus className="w-3 h-3" /> Add</button>}
        </div>
        {(editing ? form.emergencyContacts : owner.emergencyContacts)?.map((ec, i) =>
          editing ? (
            <div key={i} className="grid grid-cols-3 gap-2 mb-2">
              <input className="lux-input text-xs" placeholder="Name" value={ec.name} onChange={e=>setForm(f=>{const a=[...(f.emergencyContacts??[])];a[i]={...a[i],name:e.target.value};return{...f,emergencyContacts:a}})} />
              <input className="lux-input text-xs" placeholder="Relation" value={ec.relation} onChange={e=>setForm(f=>{const a=[...(f.emergencyContacts??[])];a[i]={...a[i],relation:e.target.value};return{...f,emergencyContacts:a}})} />
              <div className="flex gap-1">
                <input className="lux-input text-xs" placeholder="Phone" value={ec.phone} onChange={e=>setForm(f=>{const a=[...(f.emergencyContacts??[])];a[i]={...a[i],phone:e.target.value};return{...f,emergencyContacts:a}})} />
                <button onClick={()=>setForm(f=>({...f,emergencyContacts:(f.emergencyContacts??[]).filter((_,j)=>j!==i)}))} style={{ color:'#f87171' }}><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-center gap-4 py-2.5 border-b last:border-0" style={{ borderColor:'rgba(201,168,76,0.08)' }}>
              <div className="flex-1"><div className="text-white text-sm font-medium">{ec.name}</div><div className="text-xs" style={{ color:'#7B8FAD' }}>{ec.relation}</div></div>
              <div className="flex items-center gap-1 text-sm" style={{ color:'#7B8FAD' }}><Phone className="w-3 h-3" />{ec.phone}</div>
            </div>
          )
        )}
        {!editing && !owner.emergencyContacts.length && <p className="text-sm" style={{ color:'#4A5E7A' }}>None added</p>}
      </div>

      {/* Vehicles */}
      <div className="glass p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><Car className="w-4 h-4" style={{ color:'#60a5fa' }} /><p className="text-xs font-bold" style={{ color:'#4A5E7A', letterSpacing:'0.08em' }}>REGISTERED VEHICLES</p></div>
          {editing && <button onClick={() => setForm(f=>({...f,vehicles:[...(f.vehicles??[]),{id:'',registration:'',type:'Car',make:'',color:''}]}))} className="text-xs flex items-center gap-1" style={{ color:'#C9A84C' }}><Plus className="w-3 h-3" /> Add</button>}
        </div>
        {(editing ? form.vehicles : owner.vehicles)?.map((v, i) =>
          editing ? (
            <div key={i} className="grid grid-cols-4 gap-2 mb-2">
              <input className="lux-input text-xs" placeholder="Reg. No." value={v.registration} onChange={e=>setForm(f=>{const a=[...(f.vehicles??[])];a[i]={...a[i],registration:e.target.value};return{...f,vehicles:a}})} />
              <select className="lux-input text-xs" value={v.type} onChange={e=>setForm(f=>{const a=[...(f.vehicles??[])];a[i]={...a[i],type:e.target.value};return{...f,vehicles:a}})}>
                <option>Car</option><option>Bike</option><option>Scooter</option><option>Other</option>
              </select>
              <input className="lux-input text-xs" placeholder="Make" value={v.make} onChange={e=>setForm(f=>{const a=[...(f.vehicles??[])];a[i]={...a[i],make:e.target.value};return{...f,vehicles:a}})} />
              <div className="flex gap-1">
                <input className="lux-input text-xs" placeholder="Color" value={v.color} onChange={e=>setForm(f=>{const a=[...(f.vehicles??[])];a[i]={...a[i],color:e.target.value};return{...f,vehicles:a}})} />
                <button onClick={()=>setForm(f=>({...f,vehicles:(f.vehicles??[]).filter((_,j)=>j!==i)}))} style={{ color:'#f87171' }}><Trash2 className="w-4 h-4" /></button>
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
        )}
        {!editing && !owner.vehicles.length && <p className="text-sm" style={{ color:'#4A5E7A' }}>No vehicles registered</p>}
      </div>

      {editing && (
        <div className="flex gap-3">
          <button onClick={save} disabled={saving} className="btn-gold"><Save className="w-4 h-4" />{saving?'Saving…':'Save Changes'}</button>
          <button onClick={() => { setEditing(false); setForm(owner); setIsRented(!!owner.tenant) }} className="btn-ghost"><X className="w-4 h-4" /> Cancel</button>
        </div>
      )}
    </div>
  )
}
