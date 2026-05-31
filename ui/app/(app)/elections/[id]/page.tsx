'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, Vote, User, Check } from 'lucide-react'
import { cn, statusColor } from '@/lib/utils'
import { format } from 'date-fns'
import { useApi } from '@/lib/use-api'

type Candidate = {
  id: string
  position: string
  bio: string
  approved: boolean
  user: { name: string; id: string }
  _count: { votes: number }
}

type Election = {
  id: string
  title: string
  description: string
  status: string
  nominationStart: string
  nominationEnd: string
  votingStart: string
  votingEnd: string
  candidates: Candidate[]
  _count: { votes: number }
}

const POSITIONS = ['President', 'Vice President', 'Secretary', 'Treasurer', 'Committee Member']

const STATUS_FLOW: Record<string, string> = {
  DRAFT: 'NOMINATIONS_OPEN',
  NOMINATIONS_OPEN: 'VOTING_OPEN',
  VOTING_OPEN: 'COMPLETED',
}
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Open Nominations',
  NOMINATIONS_OPEN: 'Start Voting',
  VOTING_OPEN: 'Close & Complete',
}

export default function ElectionDetailPage() {
  const params = useParams()
  const { data: session } = useSession()
  const api = useApi()
  const id = params.id as string
  const [election, setElection] = useState<Election | null>(null)
  const [nomForm, setNomForm] = useState({ position: POSITIONS[0], bio: '' })
  const [selectedVotes, setSelectedVotes] = useState<Record<string, string>>({})
  const [voted, setVoted] = useState(false)
  const [loading, setLoading] = useState(false)
  const isAdmin = session?.user.role === 'ADMIN'

  const reload = () => api(`/elections/${id}`).then(r => r.json()).then(setElection)
  useEffect(() => { reload() }, [api, id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function advanceStatus() {
    if (!election) return
    const next = STATUS_FLOW[election.status]
    if (!next) return
    await api(`/elections/${id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) })
    reload()
  }

  async function nominate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await api(`/elections/${id}/candidates`, { method: 'POST', body: JSON.stringify(nomForm) })
    setLoading(false)
    if (res.ok) reload()
  }

  async function approveCandidate(candidateId: string, approved: boolean) {
    await api(`/elections/${id}/candidates/${candidateId}`, { method: 'PATCH', body: JSON.stringify({ approved }) })
    reload()
  }

  async function castVote() {
    setLoading(true)
    const votes = Object.values(selectedVotes).map(candidateId => ({ candidateId }))
    await api(`/elections/${id}/vote`, { method: 'POST', body: JSON.stringify({ votes }) })
    setLoading(false)
    setVoted(true)
    reload()
  }

  if (!election) return <div className="text-gray-400 text-sm">Loading…</div>

  const positions = Array.from(new Set(election.candidates.filter(c => c.approved).map(c => c.position)))
  const totalFlatsVoted = election.status === 'COMPLETED' ? election._count.votes : null

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/elections" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-navy-800">{election.title}</h1>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusColor(election.status))}>
              {election.status.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Voting: {format(new Date(election.votingStart), 'dd MMM')} – {format(new Date(election.votingEnd), 'dd MMM yyyy')}
          </p>
        </div>
        {isAdmin && STATUS_FLOW[election.status] && (
          <button onClick={advanceStatus} className="btn-gold text-sm">{STATUS_LABEL[election.status]}</button>
        )}
      </div>

      {election.description && <p className="text-gray-600 text-sm mb-5 card">{election.description}</p>}

      {/* Nominate */}
      {election.status === 'NOMINATIONS_OPEN' && !isAdmin && (
        <div className="card mb-5">
          <h2 className="font-semibold text-navy-800 mb-3">Nominate Yourself</h2>
          <form onSubmit={nominate} className="flex gap-3 flex-wrap">
            <select className="input flex-1 min-w-[160px]" value={nomForm.position} onChange={e => setNomForm(f => ({ ...f, position: e.target.value }))}>
              {POSITIONS.map(p => <option key={p}>{p}</option>)}
            </select>
            <input className="input flex-1 min-w-[200px]" placeholder="Brief bio (optional)" value={nomForm.bio} onChange={e => setNomForm(f => ({ ...f, bio: e.target.value }))} />
            <button type="submit" disabled={loading} className="btn-primary text-sm">Submit Nomination</button>
          </form>
        </div>
      )}

      {/* Candidates */}
      <div className="card mb-5">
        <h2 className="font-semibold text-navy-800 mb-4">Candidates</h2>
        {election.candidates.length === 0 && <p className="text-sm text-gray-400">No nominations yet.</p>}
        {POSITIONS.map(pos => {
          const cands = election.candidates.filter(c => c.position === pos)
          if (cands.length === 0) return null
          return (
            <div key={pos} className="mb-4 last:mb-0">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{pos}</h3>
              <div className="space-y-2">
                {cands.map(c => (
                  <div key={c.id} className={cn('flex items-center justify-between p-3 rounded-lg border', election.status === 'VOTING_OPEN' && c.approved ? 'cursor-pointer hover:border-gold-400' : 'border-gray-100',
                    selectedVotes[pos] === c.id ? 'border-gold-500 bg-gold-50' : ''
                  )}
                    onClick={() => {
                      if (election.status === 'VOTING_OPEN' && c.approved) {
                        setSelectedVotes(sv => ({ ...sv, [pos]: c.id }))
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-xs font-bold">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-navy-800">{c.user.name}</div>
                        {c.bio && <div className="text-xs text-gray-500">{c.bio}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {election.status === 'COMPLETED' && (
                        <span className="text-sm font-semibold text-navy-800">{c._count.votes} votes</span>
                      )}
                      {!c.approved && isAdmin && (
                        <button onClick={() => approveCandidate(c.id, true)} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">Approve</button>
                      )}
                      {c.approved && <span className="text-xs text-green-600 flex items-center gap-1"><Check className="w-3 h-3" /> Approved</span>}
                      {selectedVotes[pos] === c.id && <Check className="w-4 h-4 text-gold-500" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Vote Button */}
      {election.status === 'VOTING_OPEN' && !voted && Object.keys(selectedVotes).length > 0 && (
        <div className="card flex items-center justify-between bg-gold-50 border-gold-200">
          <div>
            <div className="font-semibold text-navy-800">Ready to vote?</div>
            <div className="text-sm text-gray-600">{Object.keys(selectedVotes).length} position{Object.keys(selectedVotes).length > 1 ? 's' : ''} selected</div>
          </div>
          <button onClick={castVote} disabled={loading} className="btn-gold flex items-center gap-2">
            <Vote className="w-4 h-4" /> {loading ? 'Submitting…' : 'Cast Vote'}
          </button>
        </div>
      )}

      {voted && (
        <div className="card bg-green-50 border-green-200 text-center">
          <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="font-semibold text-green-800">Your vote has been cast!</p>
          <p className="text-sm text-green-600">Thank you for participating.</p>
        </div>
      )}

      {election.status === 'COMPLETED' && (
        <div className="card bg-navy-50 border-navy-200">
          <h3 className="font-semibold text-navy-800 mb-2 flex items-center gap-2"><Vote className="w-4 h-4 text-gold-500" /> Final Results</h3>
          {positions.map(pos => {
            const winner = election.candidates
              .filter(c => c.position === pos && c.approved)
              .sort((a, b) => b._count.votes - a._count.votes)[0]
            return winner ? (
              <div key={pos} className="flex items-center justify-between py-1.5 border-b border-navy-100 last:border-0 text-sm">
                <span className="text-gray-600">{pos}</span>
                <span className="font-semibold text-navy-800">{winner.user.name} ({winner._count.votes} votes)</span>
              </div>
            ) : null
          })}
        </div>
      )}
    </div>
  )
}
