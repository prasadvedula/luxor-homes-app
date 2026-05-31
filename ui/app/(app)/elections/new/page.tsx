'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Vote } from 'lucide-react'
import { useApi } from '@/lib/use-api'

export default function NewElectionPage() {
  const router = useRouter()
  const api = useApi()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title:'', description:'', nominationStart:'', nominationEnd:'', votingStart:'', votingEnd:'' })

  function set(key: string, val: string) { setForm(f=>({...f,[key]:val})) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    const res = await api('/elections', { method:'POST', body:JSON.stringify({
      ...form,
      nominationStart: new Date(form.nominationStart).toISOString(),
      nominationEnd:   new Date(form.nominationEnd).toISOString(),
      votingStart:     new Date(form.votingStart).toISOString(),
      votingEnd:       new Date(form.votingEnd).toISOString(),
    })})
    const data = await res.json(); setLoading(false)
    if (!res.ok) { setError(data.error||'Failed to create election'); return }
    router.push(`/elections/${data.id}`)
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/elections" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.2)', color:'#C9A84C' }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold mb-0.5" style={{ color:'#C9A84C', letterSpacing:'0.08em' }}>GOVERNANCE</p>
          <h1 className="font-display text-2xl font-bold text-white flex items-center gap-3">
            <Vote className="w-6 h-6" style={{ color:'#E8C55A' }} /> Create Election
          </h1>
        </div>
      </div>

      <div className="glass p-7">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="p-4 rounded-xl text-sm" style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', color:'#f87171' }}>{error}</div>}

          <div>
            <label className="lux-label">Election Title</label>
            <input className="lux-input" required placeholder="e.g. Founding Society Elections 2026"
              value={form.title} onChange={e=>set('title',e.target.value)} />
          </div>

          <div>
            <label className="lux-label">Description (optional)</label>
            <textarea className="lux-input min-h-[80px]" placeholder="Brief overview of this election…"
              value={form.description} onChange={e=>set('description',e.target.value)} />
          </div>

          <div>
            <p className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color:'#4A5E7A', letterSpacing:'0.06em' }}>
              NOMINATION PERIOD
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="lux-label">Opens</label><input type="datetime-local" className="lux-input" required value={form.nominationStart} onChange={e=>set('nominationStart',e.target.value)} /></div>
              <div><label className="lux-label">Closes</label><input type="datetime-local" className="lux-input" required value={form.nominationEnd} onChange={e=>set('nominationEnd',e.target.value)} /></div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color:'#4A5E7A', letterSpacing:'0.06em' }}>
              VOTING PERIOD
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="lux-label">Opens</label><input type="datetime-local" className="lux-input" required value={form.votingStart} onChange={e=>set('votingStart',e.target.value)} /></div>
              <div><label className="lux-label">Closes</label><input type="datetime-local" className="lux-input" required value={form.votingEnd} onChange={e=>set('votingEnd',e.target.value)} /></div>
            </div>
          </div>

          <div className="p-4 rounded-xl text-xs leading-relaxed" style={{ background:'rgba(201,168,76,0.06)', border:'1px solid rgba(201,168,76,0.15)', color:'#7B8FAD' }}>
            The election will be saved as a <span style={{ color:'#E8C55A' }}>draft</span>. Open nominations manually from the election detail page when ready.
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="btn-gold">{loading?'Creating…':'Create Election'}</button>
            <Link href="/elections" className="btn-ghost">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
