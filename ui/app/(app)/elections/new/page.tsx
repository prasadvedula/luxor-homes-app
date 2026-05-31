'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useApi } from '@/lib/use-api'

export default function NewElectionPage() {
  const router = useRouter()
  const api = useApi()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    nominationStart: '',
    nominationEnd: '',
    votingStart: '',
    votingEnd: '',
  })

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await api('/elections', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        nominationStart: new Date(form.nominationStart).toISOString(),
        nominationEnd: new Date(form.nominationEnd).toISOString(),
        votingStart: new Date(form.votingStart).toISOString(),
        votingEnd: new Date(form.votingEnd).toISOString(),
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Failed'); return }
    router.push(`/elections/${data.id}`)
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/elections" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-xl font-bold text-navy-800">Create Election</h1>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

          <div><label className="label">Election Title</label>
            <input className="input" required placeholder="e.g. Founding Society Elections 2026" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>

          <div><label className="label">Description (optional)</label>
            <textarea className="input min-h-[80px]" placeholder="Brief description…" value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Nominations Open</label>
              <input type="datetime-local" className="input" required value={form.nominationStart} onChange={e => set('nominationStart', e.target.value)} />
            </div>
            <div><label className="label">Nominations Close</label>
              <input type="datetime-local" className="input" required value={form.nominationEnd} onChange={e => set('nominationEnd', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Voting Opens</label>
              <input type="datetime-local" className="input" required value={form.votingStart} onChange={e => set('votingStart', e.target.value)} />
            </div>
            <div><label className="label">Voting Closes</label>
              <input type="datetime-local" className="input" required value={form.votingEnd} onChange={e => set('votingEnd', e.target.value)} />
            </div>
          </div>

          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            The election will be saved as a draft. You can open nominations manually from the election detail page.
          </p>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-gold disabled:opacity-60">
              {loading ? 'Creating…' : 'Create Election'}
            </button>
            <Link href="/elections" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
