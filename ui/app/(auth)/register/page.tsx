'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, CheckCircle, ArrowRight } from 'lucide-react'

type Flat = { id: string; label: string; floor: number; number: number }

export default function RegisterPage() {
  const router = useRouter()
  const [flats, setFlats] = useState<Flat[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', flatId: '' })
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

  useEffect(() => {
    fetch(`${API}/residents/flats`).then(r => r.json()).then(setFlats)
  }, [API])

  function set(key: string, val: string) { setForm(p => ({ ...p, [key]: val })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    const res = await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json(); setLoading(false)
    if (!res.ok) { setError(data.error || 'Registration failed'); return }
    setSuccess(true)
  }

  if (success) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(160deg,#050D1A 0%,#0B1628 100%)' }}>
      <div className="glass p-12 text-center max-w-md w-full animate-fade-up">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
          <CheckCircle className="w-8 h-8" style={{ color: '#4ade80' }} />
        </div>
        <h2 className="font-display text-2xl font-bold text-white mb-3">Registration Submitted</h2>
        <p className="text-sm leading-relaxed mb-8" style={{ color: '#7B8FAD' }}>
          Your request has been submitted. The society admin will review and approve your account shortly.
        </p>
        <Link href="/login" className="btn-gold w-full justify-center py-3">Back to Sign In</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'linear-gradient(160deg,#050D1A 0%,#0B1628 100%)' }}>
      <div className="w-full max-w-md animate-fade-up">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C55A)' }}>
            <Building2 className="w-5 h-5" style={{ color: '#050D1A' }} />
          </div>
          <span className="font-display text-xl font-bold text-white">Luxor Homes</span>
        </div>

        <h1 className="font-display text-3xl font-bold text-white mb-2">Request Access</h1>
        <p className="text-sm mb-8" style={{ color: '#7B8FAD' }}>Resident self-registration · Requires admin approval</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="lux-label">Full Name</label>
              <input className="lux-input" required placeholder="Ravi Kumar" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className="lux-label">Email</label>
              <input type="email" className="lux-input" required placeholder="ravi@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="lux-label">Phone</label>
              <input type="tel" className="lux-input" required placeholder="9876543210" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="lux-label">Your Flat</label>
              <select className="lux-input" required value={form.flatId} onChange={e => set('flatId', e.target.value)}>
                <option value="">Select your flat number</option>
                {[1,2,3,4,5].map(floor => (
                  <optgroup key={floor} label={`Floor ${floor}`}>
                    {flats.filter(f => f.floor === floor).map(flat => (
                      <option key={flat.id} value={flat.id}>Flat {flat.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="lux-label">Password</label>
              <input type="password" className="lux-input" required minLength={8} placeholder="Minimum 8 characters" value={form.password} onChange={e => set('password', e.target.value)} />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-gold w-full justify-center py-3 text-base mt-2">
            {loading ? 'Submitting…' : <><span>Submit Registration</span><ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <div className="gold-divider mt-6" />
        <p className="text-center text-sm" style={{ color: '#7B8FAD' }}>
          Already registered?{' '}
          <Link href="/login" className="font-semibold hover:opacity-80" style={{ color: '#C9A84C' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
