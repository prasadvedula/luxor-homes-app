'use client'
import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useApi } from '@/lib/use-api'

export default function ChangePasswordPage() {
  const { data: session } = useSession()
  const api = useApi()
  const router = useRouter()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const mustChange = session?.user?.mustChangePassword ?? false

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.newPassword !== form.confirm) { setError('Passwords do not match'); return }
    if (form.newPassword.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true); setError('')

    const body: Record<string, string> = { newPassword: form.newPassword }
    if (!mustChange) body.currentPassword = form.currentPassword

    const res = await api('/auth/change-password', { method: 'POST', body: JSON.stringify(body) })
    setLoading(false)
    if (res.ok) {
      // Sign out so session refreshes with mustChangePassword = false
      await signOut({ callbackUrl: '/login' })
    } else {
      const err = await res.json().catch(() => ({}))
      setError(err.error || 'Failed to change password')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(160deg,#050D1A 0%,#0B1628 100%)' }}>
      <div className="w-full max-w-md animate-scale-in">
        <div className="glass p-8 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)' }}>
              <ShieldCheck className="w-8 h-8" style={{ color: '#C9A84C' }} />
            </div>
            <h1 className="font-display text-2xl font-bold text-white">
              {mustChange ? 'Set Your Password' : 'Change Password'}
            </h1>
            <p className="text-sm mt-2" style={{ color: '#7B8FAD' }}>
              {mustChange
                ? 'This is your first login. Please set a personal password to continue.'
                : 'Enter your current password and choose a new one.'}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl text-sm animate-fade-in"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!mustChange && (
              <div>
                <label className="lux-label">Current Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#4A5E7A' }} />
                  <input type={showPwd ? 'text' : 'password'} className="lux-input pl-10" required
                    placeholder="••••••••" value={form.currentPassword}
                    onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))} />
                </div>
              </div>
            )}
            <div>
              <label className="lux-label">New Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#4A5E7A' }} />
                <input type={showPwd ? 'text' : 'password'} className="lux-input pl-10 pr-10" required minLength={6}
                  placeholder="Min 6 characters" value={form.newPassword}
                  onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#4A5E7A' }}>
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="lux-label">Confirm New Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#4A5E7A' }} />
                <input type={showPwd ? 'text' : 'password'} className="lux-input pl-10" required minLength={6}
                  placeholder="Repeat new password" value={form.confirm}
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-gold w-full justify-center py-3 mt-2">
              {loading ? <><span className="spinner-sm spinner" /> Saving…</> : 'Set New Password'}
            </button>
          </form>

          {!mustChange && (
            <button onClick={() => router.back()} className="w-full text-center text-sm" style={{ color: '#4A5E7A' }}>
              ← Back
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
