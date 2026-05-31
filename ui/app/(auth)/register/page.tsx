'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2 } from 'lucide-react'

type Flat = { id: string; label: string; floor: number; number: number }

export default function RegisterPage() {
  const router = useRouter()
  const [flats, setFlats] = useState<Flat[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', flatId: '',
  })

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

  useEffect(() => {
    fetch(`${API}/residents/flats`).then(r => r.json()).then(setFlats)
  }, [API])

  function set(key: string, val: string) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Registration failed'); return }
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-navy-800 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-10 text-center max-w-md w-full shadow-xl">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-green-600 text-2xl">✓</span>
          </div>
          <h2 className="text-navy-800 text-xl font-bold mb-2">Registration Submitted</h2>
          <p className="text-gray-600 text-sm mb-6">
            Your account is pending admin approval. You will be able to sign in once approved.
          </p>
          <Link href="/login" className="btn-primary inline-block">Go to Sign In</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy-800 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <Building2 className="w-7 h-7 text-gold-500" />
            <span className="text-white text-xl font-bold">Luxor Homes</span>
          </div>
          <h1 className="text-white text-2xl font-semibold">Create your account</h1>
          <p className="text-navy-300 text-sm mt-1">Resident self-registration</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}
            <div>
              <label className="label">Full Name</label>
              <input className="input" required placeholder="Ravi Kumar" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" required placeholder="ravi@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input type="tel" className="input" required placeholder="9876543210" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              <label className="label">Your Flat</label>
              <select className="input" required value={form.flatId} onChange={e => set('flatId', e.target.value)}>
                <option value="">Select your flat</option>
                {[1,2,3,4,5].map(floor => (
                  <optgroup key={floor} label={`Floor ${floor}`}>
                    {flats.filter(f => f.floor === floor).map(flat => (
                      <option key={flat.id} value={flat.id}>Flat {flat.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" required minLength={8} placeholder="Min 8 characters" value={form.password} onChange={e => set('password', e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary py-2.5 disabled:opacity-60 mt-2">
              {loading ? 'Submitting…' : 'Register'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-5">
            Already registered?{' '}
            <Link href="/login" className="text-navy-700 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
