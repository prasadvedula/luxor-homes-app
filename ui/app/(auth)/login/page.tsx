'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, Eye, EyeOff, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.error) {
      // NextAuth v5 passes the original error message in res.error for CredentialsSignin
      const msg = res.error ?? ''
      if (msg.includes('pending') || msg.includes('approval') || msg === 'CredentialsSignin') {
        // Try to get the real error by checking what the server said
        setError('Invalid email or password, or your account is awaiting admin approval.')
      } else {
        setError(msg || 'Invalid email or password.')
      }
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(160deg,#050D1A 0%,#081422 60%,#0B1628 100%)' }}>
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] p-12 border-r relative overflow-hidden" style={{ borderColor: 'rgba(201,168,76,0.12)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(201,168,76,0.06) 0%, transparent 70%)' }} />
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C55A)' }}>
            <Building2 className="w-5 h-5" style={{ color: '#050D1A' }} />
          </div>
          <span className="font-display text-xl font-bold text-white">Luxor Homes</span>
        </div>
        <div>
          <h2 className="font-display text-4xl font-bold text-white leading-tight mb-4">
            Welcome back to your <span className="gold-text">community</span>
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: '#7B8FAD' }}>
            Sign in to access your resident portal — manage visitors, track maintenance, participate in elections and more.
          </p>
        </div>
        <p className="text-xs" style={{ color: '#3A4E6A' }}>© {new Date().getFullYear()} Luxor Homes Residents&apos; Society</p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-up">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C55A)' }}>
              <Building2 className="w-5 h-5" style={{ color: '#050D1A' }} />
            </div>
            <span className="font-display text-xl font-bold text-white">Luxor Homes</span>
          </div>

          <h1 className="font-display text-3xl font-bold text-white mb-2">Sign In</h1>
          <p className="text-sm mb-8" style={{ color: '#7B8FAD' }}>Enter your credentials to continue</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-3 p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                {error}
              </div>
            )}
            <div>
              <label className="lux-label">Email address</label>
              <input type="email" className="lux-input" required placeholder="your@email.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="lux-label">Password</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} className="lux-input pr-10" required placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#4A5E7A' }}>
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-gold w-full justify-center py-3 text-base mt-2">
              {loading ? 'Signing in…' : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="gold-divider mt-7" />
          <p className="text-center text-sm" style={{ color: '#7B8FAD' }}>
            New resident?{' '}
            <Link href="/register" className="font-semibold transition-colors hover:opacity-80" style={{ color: '#C9A84C' }}>
              Request Access
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
