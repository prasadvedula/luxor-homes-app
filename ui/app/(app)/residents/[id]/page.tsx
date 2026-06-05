'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import {
  ArrowLeft, Phone, Car, AlertCircle, Plus, Trash2, Edit3, Save, X,
  KeyRound, Home, Calendar, IndianRupee, FileText, User,
  ToggleLeft, ToggleRight, ShieldCheck, CreditCard, UserCheck, UserX, Users,
} from 'lucide-react'
import Link from 'next/link'
import { useApi } from '@/lib/use-api'
import { format } from 'date-fns'

/* ── Types ─────────────────────────────────────────────────── */
type FamilyMember = { id: string; name: string; phone: string; email: string | null; createdAt: string }
type FamilyForm = { name: string; phone: string; password: string; relation: string }
const emptyFamilyForm: FamilyForm = { name: '', phone: '', password: '', relation: 'Spouse' }
const RELATIONS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Other']

type Tenant = {
  id: string; name: string; phone: string; email: string | null
  moveInDate: string | null; leaseEndDate: string | null
  rentAmount: number | null; agreementNumber: string | null
}
type Maid = {
  id: string; name: string; phone: string | null; role: string
  idType: string; idNumber: string; address: string | null; isActive: boolean
}
type Owner = {
  id: string; name: string; phone: string; altPhone: string; email: string
  flat: { label: string; floor: number }
  emergencyContacts: { id: string; name: string; relation: string; phone: string }[]
  vehicles: { id: string; registration: string; type: string; make: string; color: string }[]
  tenant: Tenant | null
  maids: Maid[]
  user: { id: string; phone: string; email: string | null; registrationStatus: string; isPrimaryResident: boolean }
}

/* ── Constants ─────────────────────────────────────────────── */
const ROLES   = ['Maid / House Help', 'Cook', 'Driver / Chauffeur', 'Nanny / Baby Sitter', 'Security Guard', 'Gardener', 'Other']
const ID_TYPES = ['Aadhaar Card', 'Voter ID', 'Passport', 'Driving License', 'PAN Card']

const ID_ICON_BG: Record<string, { bg: string; color: string }> = {
  'Aadhaar Card':    { bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa' },
  'Voter ID':        { bg: 'rgba(168,85,247,0.12)',  color: '#c084fc' },
  'Passport':        { bg: 'rgba(34,197,94,0.12)',   color: '#4ade80' },
  'Driving License': { bg: 'rgba(234,179,8,0.12)',   color: '#facc15' },
  'PAN Card':        { bg: 'rgba(249,115,22,0.12)',  color: '#fb923c' },
}

type TenantForm = { name:string; phone:string; email:string; moveInDate:string; leaseEndDate:string; rentAmount:string; agreementNumber:string }
type MaidForm   = { name:string; phone:string; role:string; idType:string; idNumber:string; address:string }

const emptyTenantForm: TenantForm = { name:'', phone:'', email:'', moveInDate:'', leaseEndDate:'', rentAmount:'', agreementNumber:'' }
const emptyMaidForm:   MaidForm   = { name:'', phone:'', role:ROLES[0], idType:ID_TYPES[0], idNumber:'', address:'' }

/* ── Helpers ───────────────────────────────────────────────── */
function maskId(id: string) {
  if (id.length <= 4) return id
  return '•'.repeat(id.length - 4) + id.slice(-4)
}

/* ══════════════════════════════════════════════════════════════ */
export default function ResidentDetailPage() {
  const params  = useParams()
  const { data: session } = useSession()
  const api     = useApi()
  const id      = params.id as string

  const [owner,    setOwner]    = useState<Owner | null>(null)
  const [editing,  setEditing]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [form,     setForm]     = useState<Partial<Owner>>({})
  const [isRented, setIsRented] = useState(false)
  const [tenantForm, setTenantForm] = useState<TenantForm>(emptyTenantForm)

  // Maid add-form state
  const [showMaidForm, setShowMaidForm] = useState(false)
  const [maidForm,     setMaidForm]     = useState<MaidForm>(emptyMaidForm)
  const [maidLoading,  setMaidLoading]  = useState(false)
  const [editingMaid,  setEditingMaid]  = useState<string | null>(null) // maid id being edited
  const [editMaidForm, setEditMaidForm] = useState<MaidForm>(emptyMaidForm)

  const canEdit = session?.user.role === 'ADMIN' || (owner && owner.id === session?.user.id)
  const isAdmin = session?.user.role === 'ADMIN'
  const isPrimaryResident = session?.user.isPrimaryResident ?? true

  // ── Family members ──
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [showFamilyForm, setShowFamilyForm] = useState(false)
  const [familyForm, setFamilyForm] = useState<FamilyForm>(emptyFamilyForm)
  const [familyLoading, setFamilyLoading] = useState(false)
  const [familyError, setFamilyError] = useState('')
  const [editingFamily, setEditingFamily] = useState<string | null>(null)
  const [editFamilyName, setEditFamilyName] = useState('')

  /* ── Load ─────────────────────────────────────── */
  function applyOwner(d: Owner) {
    setOwner(d); setForm(d)
    setIsRented(!!d.tenant)
    setTenantForm(d.tenant ? {
      name: d.tenant.name, phone: d.tenant.phone, email: d.tenant.email ?? '',
      moveInDate: d.tenant.moveInDate ? d.tenant.moveInDate.split('T')[0] : '',
      leaseEndDate: d.tenant.leaseEndDate ? d.tenant.leaseEndDate.split('T')[0] : '',
      rentAmount: d.tenant.rentAmount ? String(d.tenant.rentAmount) : '',
      agreementNumber: d.tenant.agreementNumber ?? '',
    } : emptyTenantForm)
  }

  useEffect(() => {
    api(`/residents/${id}`).then(r => r.json()).then(applyOwner)
  }, [api, id]) // eslint-disable-line react-hooks/exhaustive-deps

  function reload() { api(`/residents/${id}`).then(r => r.json()).then(applyOwner) }

  // Load family members once owner is loaded
  useEffect(() => {
    if (!owner) return
    const qs = isAdmin ? `?primaryId=${owner.user.id}` : ''
    api(`/residents/family/list${qs}`).then(r => r.ok ? r.json() : []).then(d => setFamilyMembers(Array.isArray(d) ? d : []))
  }, [api, owner, isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  async function addFamilyMember(e: React.FormEvent) {
    e.preventDefault(); setFamilyLoading(true); setFamilyError('')
    const res = await api('/residents/family', { method: 'POST', body: JSON.stringify(familyForm) })
    setFamilyLoading(false)
    if (res.ok) {
      const m = await res.json()
      setFamilyMembers(prev => [...prev, m])
      setShowFamilyForm(false); setFamilyForm(emptyFamilyForm)
    } else {
      const err = await res.json().catch(() => ({}))
      setFamilyError(err.error || 'Failed to add member')
    }
  }

  async function updateFamilyMember(memberId: string) {
    const res = await api(`/residents/family/${memberId}`, { method: 'PUT', body: JSON.stringify({ name: editFamilyName }) })
    if (res.ok) {
      const updated = await res.json()
      setFamilyMembers(prev => prev.map(m => m.id === memberId ? { ...m, ...updated } : m))
      setEditingFamily(null)
    }
  }

  async function removeFamilyMember(memberId: string) {
    if (!confirm('Remove this family member?')) return
    const res = await api(`/residents/family/${memberId}`, { method: 'DELETE' })
    if (res.ok) setFamilyMembers(prev => prev.filter(m => m.id !== memberId))
  }
  function setTF(key: keyof TenantForm, val: string) { setTenantForm(f => ({ ...f, [key]: val })) }
  function setMF(key: keyof MaidForm,   val: string) { setMaidForm(f => ({ ...f, [key]: val })) }
  function setEMF(key: keyof MaidForm,  val: string) { setEditMaidForm(f => ({ ...f, [key]: val })) }

  /* ── Save owner + tenant ──────────────────────── */
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
    setSaving(false); setEditing(false); reload()
  }

  /* ── Maid actions ─────────────────────────────── */
  async function addMaid(e: React.FormEvent) {
    e.preventDefault(); setMaidLoading(true)
    const res = await api(`/residents/${id}/maids`, { method: 'POST', body: JSON.stringify(maidForm) })
    setMaidLoading(false)
    if (res.ok) { setShowMaidForm(false); setMaidForm(emptyMaidForm); reload() }
  }

  async function saveMaid(maidId: string) {
    await api(`/residents/${id}/maids/${maidId}`, { method: 'PUT', body: JSON.stringify(editMaidForm) })
    setEditingMaid(null); reload()
  }

  async function toggleActive(maid: Maid) {
    await api(`/residents/${id}/maids/${maid.id}`, { method: 'PUT', body: JSON.stringify({ ...maid, isActive: !maid.isActive }) })
    reload()
  }

  async function deleteMaid(maidId: string) {
    if (!confirm('Remove this entry?')) return
    await api(`/residents/${id}/maids/${maidId}`, { method: 'DELETE' })
    reload()
  }

  /* ── Render ───────────────────────────────────── */
  if (!owner) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(201,168,76,0.3)', borderTopColor: '#C9A84C' }} />
    </div>
  )

  return (
    <div className="max-w-2xl space-y-5">

      {/* ── Header ───────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Link href="/residents" className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C' }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0"
            style={owner.tenant
              ? { background: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.3)' }
              : { background: 'linear-gradient(135deg,#C9A84C,#E8C55A)', color: '#050D1A' }}>
            {owner.flat.label}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-xl font-bold text-white">{owner.name}</h1>
              {owner.tenant
                ? <span className="badge badge-orange"><KeyRound className="w-3 h-3" /> Rented</span>
                : <span className="badge badge-blue"><Home className="w-3 h-3" /> Owner-Occupied</span>}
              {owner.maids.length > 0 && (
                <span className="badge badge-purple">
                  <ShieldCheck className="w-3 h-3" /> {owner.maids.filter(m => m.isActive).length} staff
                </span>
              )}
            </div>
            <p className="text-sm mt-0.5" style={{ color: '#7B8FAD' }}>Flat {owner.flat.label} · Floor {owner.flat.floor}</p>
          </div>
        </div>
        {canEdit && !editing && (
          <button onClick={() => setEditing(true)} className="btn-ghost py-2 px-4 text-sm flex-shrink-0">
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </button>
        )}
      </div>

      {/* ── Owner Contact ─────────────────────────── */}
      <div className="glass p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4" style={{ color: '#60a5fa' }} />
          <p className="text-xs font-bold" style={{ color: '#4A5E7A', letterSpacing: '0.08em' }}>OWNER DETAILS</p>
        </div>
        {editing ? (
          <div className="space-y-3">
            <div><label className="lux-label">Full Name</label><input className="lux-input" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="lux-label">Primary Phone</label><input className="lux-input" value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><label className="lux-label">Alt Phone</label><input className="lux-input" value={form.altPhone ?? ''} onChange={e => setForm(f => ({ ...f, altPhone: e.target.value }))} /></div>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}><Phone className="w-4 h-4" style={{ color: '#60a5fa' }} /></div>
              <div><div className="text-white text-sm font-medium">{owner.phone}</div><div className="text-xs" style={{ color: '#4A5E7A' }}>Primary</div></div>
            </div>
            {owner.altPhone && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}><Phone className="w-4 h-4" style={{ color: '#60a5fa' }} /></div>
                <div><div className="text-white text-sm font-medium">{owner.altPhone}</div><div className="text-xs" style={{ color: '#4A5E7A' }}>Alternate</div></div>
              </div>
            )}
            <div className="text-sm" style={{ color: '#7B8FAD' }}>{owner.email}</div>
          </div>
        )}
      </div>

      {/* ── Family Members ───────────────────────── */}
      {(isAdmin || (isPrimaryResident && owner.user.id === session?.user.id)) && (
        <div className="glass p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: '#4ade80' }} />
              <p className="text-xs font-bold" style={{ color: '#4A5E7A', letterSpacing: '0.08em' }}>FAMILY MEMBERS</p>
              {familyMembers.length > 0 && (
                <span className="badge badge-green ml-1">{familyMembers.length}</span>
              )}
            </div>
            {isPrimaryResident && owner.user.id === session?.user.id && (
              <button onClick={() => { setShowFamilyForm(v => !v); setFamilyError('') }}
                className="flex items-center gap-1.5 text-sm font-medium transition-colors"
                style={{ color: showFamilyForm ? '#f87171' : '#C9A84C' }}>
                {showFamilyForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Member</>}
              </button>
            )}
          </div>

          {/* Add form */}
          {showFamilyForm && (
            <form onSubmit={addFamilyMember} className="mb-5 space-y-3 p-4 rounded-xl animate-fade-up"
              style={{ background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.15)' }}>
              {familyError && (
                <div className="text-sm p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>{familyError}</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="lux-label">Full Name *</label>
                  <input className="lux-input" required placeholder="Priya Kumar"
                    value={familyForm.name} onChange={e => setFamilyForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="lux-label">Mobile Number *</label>
                  <input className="lux-input" required placeholder="9876543210"
                    value={familyForm.phone} onChange={e => setFamilyForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="lux-label">Relationship</label>
                  <select className="lux-input" value={familyForm.relation}
                    onChange={e => setFamilyForm(f => ({ ...f, relation: e.target.value }))}>
                    {RELATIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="lux-label">Login Password *</label>
                  <input type="password" className="lux-input" required minLength={6} placeholder="Min 6 chars"
                    value={familyForm.password} onChange={e => setFamilyForm(f => ({ ...f, password: e.target.value }))} />
                </div>
              </div>
              <p className="text-xs" style={{ color: '#4A5E7A' }}>They will log in using their mobile number and this password.</p>
              <div className="flex gap-2">
                <button type="submit" disabled={familyLoading} className="btn-gold py-2 px-4 text-xs disabled:opacity-60">
                  {familyLoading ? 'Adding…' : <><Plus className="w-3.5 h-3.5" /> Add Member</>}
                </button>
              </div>
            </form>
          )}

          {/* Member list */}
          {familyMembers.length === 0 && !showFamilyForm && (
            <div className="py-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2" style={{ color: '#3A4E6A' }} />
              <p className="text-sm" style={{ color: '#4A5E7A' }}>No family members added yet.</p>
            </div>
          )}
          <div className="space-y-2">
            {familyMembers.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.12)' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}>
                  {m.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  {editingFamily === m.id ? (
                    <div className="flex items-center gap-2">
                      <input className="lux-input py-1 text-sm" value={editFamilyName}
                        onChange={e => setEditFamilyName(e.target.value)} />
                      <button onClick={() => updateFamilyMember(m.id)} className="btn-gold py-1 px-3 text-xs">
                        <Save className="w-3 h-3" />
                      </button>
                      <button onClick={() => setEditingFamily(null)} className="btn-ghost py-1 px-2 text-xs">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-white text-sm font-medium">{m.name}</div>
                      <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: '#7B8FAD' }}>
                        <Phone className="w-3 h-3" /> {m.phone}
                      </div>
                    </>
                  )}
                </div>
                {(isAdmin || isPrimaryResident) && editingFamily !== m.id && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => { setEditingFamily(m.id); setEditFamilyName(m.name) }}
                      className="p-1.5 rounded-lg" style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C' }}>
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeFamilyMember(m.id)}
                      className="p-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tenant Section ────────────────────────── */}
      <div className="glass p-6" style={(owner.tenant || (editing && isRented)) ? { borderColor: 'rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.04)' } : {}}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" style={{ color: (owner.tenant || isRented) ? '#fb923c' : '#4A5E7A' }} />
            <p className="text-xs font-bold" style={{ color: (owner.tenant || isRented) ? '#fb923c' : '#4A5E7A', letterSpacing: '0.08em' }}>TENANT DETAILS</p>
          </div>
          {editing && (
            <button onClick={() => { setIsRented(v => !v); if (isRented) setTenantForm(emptyTenantForm) }}
              className="flex items-center gap-2 text-sm font-medium" style={{ color: isRented ? '#fb923c' : '#7B8FAD' }}>
              {isRented ? <ToggleRight className="w-6 h-6" style={{ color: '#fb923c' }} /> : <ToggleLeft className="w-6 h-6" />}
              {isRented ? 'Flat is rented' : 'Mark as rented'}
            </button>
          )}
        </div>
        {!editing && !owner.tenant && (
          <div className="flex items-center gap-3 py-2">
            <Home className="w-4 h-4" style={{ color: '#4A5E7A' }} />
            <p className="text-sm" style={{ color: '#4A5E7A' }}>Owner-occupied — no tenant on record.</p>
          </div>
        )}
        {editing && isRented && (
          <div className="space-y-4 animate-fade-up">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="lux-label">Tenant Name *</label><input className="lux-input" required value={tenantForm.name} onChange={e => setTF('name', e.target.value)} placeholder="Full name" /></div>
              <div><label className="lux-label">Phone *</label><input className="lux-input" required value={tenantForm.phone} onChange={e => setTF('phone', e.target.value)} /></div>
              <div><label className="lux-label">Email</label><input type="email" className="lux-input" value={tenantForm.email} onChange={e => setTF('email', e.target.value)} /></div>
              <div><label className="lux-label">Monthly Rent (₹)</label><div className="relative"><IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#4A5E7A' }} /><input type="number" className="lux-input pl-8" value={tenantForm.rentAmount} onChange={e => setTF('rentAmount', e.target.value)} /></div></div>
              <div><label className="lux-label">Move-in Date</label><input type="date" className="lux-input" value={tenantForm.moveInDate} onChange={e => setTF('moveInDate', e.target.value)} /></div>
              <div><label className="lux-label">Lease End Date</label><input type="date" className="lux-input" value={tenantForm.leaseEndDate} onChange={e => setTF('leaseEndDate', e.target.value)} /></div>
              <div className="col-span-2"><label className="lux-label">Agreement No.</label><input className="lux-input" value={tenantForm.agreementNumber} onChange={e => setTF('agreementNumber', e.target.value)} placeholder="LSE-2024-101" /></div>
            </div>
          </div>
        )}
        {!editing && owner.tenant && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(249,115,22,0.08)' }}>
                <User className="w-4 h-4 mt-0.5" style={{ color: '#fb923c' }} />
                <div><div className="text-xs font-semibold mb-0.5" style={{ color: '#fb923c' }}>TENANT</div><div className="text-white font-semibold">{owner.tenant.name}</div><div className="text-xs" style={{ color: '#7B8FAD' }}>{owner.tenant.phone}</div>{owner.tenant.email && <div className="text-xs" style={{ color: '#4A5E7A' }}>{owner.tenant.email}</div>}</div>
              </div>
              {owner.tenant.rentAmount && (
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(249,115,22,0.08)' }}>
                  <IndianRupee className="w-4 h-4 mt-0.5" style={{ color: '#fb923c' }} />
                  <div><div className="text-xs font-semibold mb-0.5" style={{ color: '#fb923c' }}>RENT</div><div className="font-display text-xl font-bold text-white">₹{owner.tenant.rentAmount.toLocaleString()}</div><div className="text-xs" style={{ color: '#4A5E7A' }}>per month</div></div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {owner.tenant.moveInDate && <div className="p-3 rounded-xl" style={{ background: 'rgba(7,16,30,0.5)', border: '1px solid rgba(249,115,22,0.12)' }}><div className="flex items-center gap-1 mb-1"><Calendar className="w-3 h-3" style={{ color: '#fb923c' }} /><span className="text-xs font-semibold" style={{ color: '#fb923c' }}>MOVE-IN</span></div><div className="text-white text-sm">{format(new Date(owner.tenant.moveInDate), 'dd MMM yyyy')}</div></div>}
              {owner.tenant.leaseEndDate && <div className="p-3 rounded-xl" style={{ background: 'rgba(7,16,30,0.5)', border: '1px solid rgba(249,115,22,0.12)' }}><div className="flex items-center gap-1 mb-1"><Calendar className="w-3 h-3" style={{ color: '#fb923c' }} /><span className="text-xs font-semibold" style={{ color: '#fb923c' }}>LEASE END</span></div><div className="text-white text-sm">{format(new Date(owner.tenant.leaseEndDate), 'dd MMM yyyy')}</div></div>}
              {owner.tenant.agreementNumber && <div className="p-3 rounded-xl" style={{ background: 'rgba(7,16,30,0.5)', border: '1px solid rgba(249,115,22,0.12)' }}><div className="flex items-center gap-1 mb-1"><FileText className="w-3 h-3" style={{ color: '#fb923c' }} /><span className="text-xs font-semibold" style={{ color: '#fb923c' }}>AGREEMENT</span></div><div className="text-white text-sm font-mono">{owner.tenant.agreementNumber}</div></div>}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          DOMESTIC HELP / MAID SECTION
      ════════════════════════════════════════════════ */}
      <div className="glass p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" style={{ color: '#c084fc' }} />
            <p className="text-xs font-bold" style={{ color: '#4A5E7A', letterSpacing: '0.08em' }}>DOMESTIC HELP</p>
            {owner.maids.length > 0 && (
              <span className="badge badge-purple ml-1">{owner.maids.length} registered</span>
            )}
          </div>
          {canEdit && (
            <button onClick={() => { setShowMaidForm(v => !v); setEditingMaid(null) }}
              className="flex items-center gap-1.5 text-sm font-medium transition-colors"
              style={{ color: showMaidForm ? '#f87171' : '#C9A84C' }}>
              {showMaidForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add</>}
            </button>
          )}
        </div>

        {/* ── Add maid form ───────────────────────── */}
        {showMaidForm && (
          <form onSubmit={addMaid} className="glass-gold p-5 mb-5 space-y-4 animate-fade-up" style={{ borderRadius: '10px' }}>
            <p className="text-xs font-bold" style={{ color: '#C9A84C', letterSpacing: '0.08em' }}>NEW ENTRY</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="lux-label">Full Name *</label><input className="lux-input" required value={maidForm.name} onChange={e => setMF('name', e.target.value)} placeholder="e.g. Lakshmi Bai" /></div>
              <div><label className="lux-label">Phone</label><input className="lux-input" value={maidForm.phone} onChange={e => setMF('phone', e.target.value)} placeholder="9876543210" /></div>
              <div>
                <label className="lux-label">Role *</label>
                <select className="lux-input" value={maidForm.role} onChange={e => setMF('role', e.target.value)}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="lux-label">ID Card Type *</label>
                <select className="lux-input" required value={maidForm.idType} onChange={e => setMF('idType', e.target.value)}>
                  {ID_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="lux-label">ID Card Number *</label>
                <input className="lux-input font-mono" required value={maidForm.idNumber} onChange={e => setMF('idNumber', e.target.value)} placeholder="e.g. 1234 5678 9012" />
              </div>
              <div><label className="lux-label">Address</label><input className="lux-input" value={maidForm.address} onChange={e => setMF('address', e.target.value)} placeholder="Home address" /></div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={maidLoading} className="btn-gold btn-sm">
                {maidLoading ? 'Adding…' : <><Plus className="w-3.5 h-3.5" /> Add Entry</>}
              </button>
              <button type="button" onClick={() => setShowMaidForm(false)} className="btn-ghost btn-sm">Cancel</button>
            </div>
          </form>
        )}

        {/* ── Maid list ───────────────────────────── */}
        {owner.maids.length === 0 && !showMaidForm && (
          <div className="py-6 text-center">
            <ShieldCheck className="w-8 h-8 mx-auto mb-2" style={{ color: '#3A4E6A' }} />
            <p className="text-sm" style={{ color: '#4A5E7A' }}>No domestic help registered for this flat.</p>
          </div>
        )}

        <div className="space-y-3">
          {owner.maids.map(maid => {
            const idStyle = ID_ICON_BG[maid.idType] ?? { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8' }
            const isEditingThis = editingMaid === maid.id

            return (
              <div key={maid.id} className="rounded-xl overflow-hidden"
                style={{ border: `1px solid ${maid.isActive ? 'rgba(192,132,252,0.2)' : 'rgba(100,116,139,0.15)'}`, background: maid.isActive ? 'rgba(192,132,252,0.04)' : 'rgba(7,16,30,0.4)' }}>

                {/* Card header */}
                <div className="flex items-center gap-3 p-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center font-display font-bold text-lg flex-shrink-0"
                    style={{ background: maid.isActive ? 'rgba(192,132,252,0.15)' : 'rgba(100,116,139,0.1)', color: maid.isActive ? '#c084fc' : '#94a3b8', border: `1px solid ${maid.isActive ? 'rgba(192,132,252,0.25)' : 'rgba(100,116,139,0.15)'}` }}>
                    {maid.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold text-sm">{maid.name}</span>
                      <span className="badge badge-purple text-xs" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>{maid.role}</span>
                      {!maid.isActive && <span className="badge badge-gray text-xs" style={{ fontSize: '0.65rem' }}>Inactive</span>}
                    </div>
                    {maid.phone && (
                      <div className="flex items-center gap-1 mt-0.5 text-xs" style={{ color: '#7B8FAD' }}>
                        <Phone className="w-3 h-3" /> {maid.phone}
                      </div>
                    )}
                  </div>
                  {canEdit && !isEditingThis && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => toggleActive(maid)} title={maid.isActive ? 'Mark inactive' : 'Mark active'}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ background: maid.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)', color: maid.isActive ? '#4ade80' : '#94a3b8' }}>
                        {maid.isActive ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => { setEditingMaid(maid.id); setEditMaidForm({ name: maid.name, phone: maid.phone ?? '', role: maid.role, idType: maid.idType, idNumber: maid.idNumber, address: maid.address ?? '' }); setShowMaidForm(false) }}
                        className="p-1.5 rounded-lg transition-all" style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C' }}>
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteMaid(maid.id)} className="p-1.5 rounded-lg transition-all" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* ID Card strip */}
                {!isEditingThis && (
                  <div className="flex items-center gap-3 px-4 py-3 border-t" style={{ borderColor: maid.isActive ? 'rgba(192,132,252,0.12)' : 'rgba(100,116,139,0.1)', background: 'rgba(7,16,30,0.3)' }}>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: idStyle.bg, border: `1px solid ${idStyle.color}25` }}>
                      <CreditCard className="w-3.5 h-3.5" style={{ color: idStyle.color }} />
                      <span className="text-xs font-semibold" style={{ color: idStyle.color }}>{maid.idType}</span>
                    </div>
                    <span className="font-mono text-sm font-semibold text-white tracking-widest">{maskId(maid.idNumber)}</span>
                    {maid.address && (
                      <span className="text-xs ml-auto truncate max-w-[160px]" style={{ color: '#4A5E7A' }}>📍 {maid.address}</span>
                    )}
                  </div>
                )}

                {/* Inline edit form */}
                {isEditingThis && (
                  <div className="p-4 border-t space-y-3 animate-fade-up" style={{ borderColor: 'rgba(201,168,76,0.15)', background: 'rgba(201,168,76,0.03)' }}>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="lux-label">Name</label><input className="lux-input" value={editMaidForm.name} onChange={e => setEMF('name', e.target.value)} /></div>
                      <div><label className="lux-label">Phone</label><input className="lux-input" value={editMaidForm.phone} onChange={e => setEMF('phone', e.target.value)} /></div>
                      <div><label className="lux-label">Role</label><select className="lux-input" value={editMaidForm.role} onChange={e => setEMF('role', e.target.value)}>{ROLES.map(r => <option key={r}>{r}</option>)}</select></div>
                      <div><label className="lux-label">ID Type</label><select className="lux-input" value={editMaidForm.idType} onChange={e => setEMF('idType', e.target.value)}>{ID_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                      <div><label className="lux-label">ID Number</label><input className="lux-input font-mono" value={editMaidForm.idNumber} onChange={e => setEMF('idNumber', e.target.value)} /></div>
                      <div><label className="lux-label">Address</label><input className="lux-input" value={editMaidForm.address} onChange={e => setEMF('address', e.target.value)} /></div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveMaid(maid.id)} className="btn-gold btn-sm"><Save className="w-3.5 h-3.5" /> Save</button>
                      <button onClick={() => setEditingMaid(null)} className="btn-ghost btn-sm"><X className="w-3.5 h-3.5" /> Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Emergency Contacts ────────────────────── */}
      <div className="glass p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4" style={{ color: '#f87171' }} /><p className="text-xs font-bold" style={{ color: '#4A5E7A', letterSpacing: '0.08em' }}>EMERGENCY CONTACTS</p></div>
          {editing && <button onClick={() => setForm(f => ({ ...f, emergencyContacts: [...(f.emergencyContacts ?? []), { id: '', name: '', relation: '', phone: '' }] }))} className="text-xs flex items-center gap-1" style={{ color: '#C9A84C' }}><Plus className="w-3 h-3" /> Add</button>}
        </div>
        {(editing ? form.emergencyContacts : owner.emergencyContacts)?.map((ec, i) =>
          editing ? (
            <div key={i} className="grid grid-cols-3 gap-2 mb-2">
              <input className="lux-input text-xs" placeholder="Name" value={ec.name} onChange={e => setForm(f => { const a = [...(f.emergencyContacts ?? [])]; a[i] = { ...a[i], name: e.target.value }; return { ...f, emergencyContacts: a } })} />
              <input className="lux-input text-xs" placeholder="Relation" value={ec.relation} onChange={e => setForm(f => { const a = [...(f.emergencyContacts ?? [])]; a[i] = { ...a[i], relation: e.target.value }; return { ...f, emergencyContacts: a } })} />
              <div className="flex gap-1">
                <input className="lux-input text-xs" placeholder="Phone" value={ec.phone} onChange={e => setForm(f => { const a = [...(f.emergencyContacts ?? [])]; a[i] = { ...a[i], phone: e.target.value }; return { ...f, emergencyContacts: a } })} />
                <button onClick={() => setForm(f => ({ ...f, emergencyContacts: (f.emergencyContacts ?? []).filter((_, j) => j !== i) }))} style={{ color: '#f87171' }}><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-center gap-4 py-2.5 border-b last:border-0" style={{ borderColor: 'rgba(201,168,76,0.08)' }}>
              <div className="flex-1"><div className="text-white text-sm font-medium">{ec.name}</div><div className="text-xs" style={{ color: '#7B8FAD' }}>{ec.relation}</div></div>
              <div className="flex items-center gap-1 text-sm" style={{ color: '#7B8FAD' }}><Phone className="w-3 h-3" />{ec.phone}</div>
            </div>
          )
        )}
        {!editing && !owner.emergencyContacts.length && <p className="text-sm" style={{ color: '#4A5E7A' }}>None added</p>}
      </div>

      {/* ── Vehicles ──────────────────────────────── */}
      <div className="glass p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><Car className="w-4 h-4" style={{ color: '#60a5fa' }} /><p className="text-xs font-bold" style={{ color: '#4A5E7A', letterSpacing: '0.08em' }}>REGISTERED VEHICLES</p></div>
          {editing && <button onClick={() => setForm(f => ({ ...f, vehicles: [...(f.vehicles ?? []), { id: '', registration: '', type: 'Car', make: '', color: '' }] }))} className="text-xs flex items-center gap-1" style={{ color: '#C9A84C' }}><Plus className="w-3 h-3" /> Add</button>}
        </div>
        {(editing ? form.vehicles : owner.vehicles)?.map((v, i) =>
          editing ? (
            <div key={i} className="grid grid-cols-4 gap-2 mb-2">
              <input className="lux-input text-xs" placeholder="Reg. No." value={v.registration} onChange={e => setForm(f => { const a = [...(f.vehicles ?? [])]; a[i] = { ...a[i], registration: e.target.value }; return { ...f, vehicles: a } })} />
              <select className="lux-input text-xs" value={v.type} onChange={e => setForm(f => { const a = [...(f.vehicles ?? [])]; a[i] = { ...a[i], type: e.target.value }; return { ...f, vehicles: a } })}><option>Car</option><option>Bike</option><option>Scooter</option><option>Other</option></select>
              <input className="lux-input text-xs" placeholder="Make" value={v.make} onChange={e => setForm(f => { const a = [...(f.vehicles ?? [])]; a[i] = { ...a[i], make: e.target.value }; return { ...f, vehicles: a } })} />
              <div className="flex gap-1">
                <input className="lux-input text-xs" placeholder="Color" value={v.color} onChange={e => setForm(f => { const a = [...(f.vehicles ?? [])]; a[i] = { ...a[i], color: e.target.value }; return { ...f, vehicles: a } })} />
                <button onClick={() => setForm(f => ({ ...f, vehicles: (f.vehicles ?? []).filter((_, j) => j !== i) }))} style={{ color: '#f87171' }}><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-center gap-4 py-2.5 border-b last:border-0" style={{ borderColor: 'rgba(201,168,76,0.08)' }}>
              <span className="font-mono text-sm text-white font-semibold">{v.registration}</span>
              <span className="badge badge-blue text-xs">{v.type}</span>
              {v.make && <span className="text-sm" style={{ color: '#7B8FAD' }}>{v.make}</span>}
              {v.color && <span className="text-sm" style={{ color: '#4A5E7A' }}>{v.color}</span>}
            </div>
          )
        )}
        {!editing && !owner.vehicles.length && <p className="text-sm" style={{ color: '#4A5E7A' }}>No vehicles registered</p>}
      </div>

      {/* ── Save / Cancel ─────────────────────────── */}
      {editing && (
        <div className="flex gap-3">
          <button onClick={save} disabled={saving} className="btn-gold"><Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Changes'}</button>
          <button onClick={() => { setEditing(false); applyOwner(owner) }} className="btn-ghost"><X className="w-4 h-4" /> Cancel</button>
        </div>
      )}
    </div>
  )
}
