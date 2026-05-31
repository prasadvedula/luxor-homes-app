'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, Vote, User, Check, Trophy, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useApi } from '@/lib/use-api'

type Candidate = { id:string; position:string; bio:string; approved:boolean; user:{name:string;id:string}; _count:{votes:number} }
type Election = { id:string; title:string; description:string; status:string; nominationStart:string; nominationEnd:string; votingStart:string; votingEnd:string; candidates:Candidate[]; _count:{votes:number} }

const POSITIONS = ['President','Vice President','Secretary','Treasurer','Committee Member']
const STATUS_FLOW: Record<string,string> = { DRAFT:'NOMINATIONS_OPEN', NOMINATIONS_OPEN:'VOTING_OPEN', VOTING_OPEN:'COMPLETED' }
const STATUS_LABEL: Record<string,string> = { DRAFT:'Open Nominations', NOMINATIONS_OPEN:'Start Voting', VOTING_OPEN:'Complete Election' }
const statusBadge: Record<string,string> = { DRAFT:'badge-gray', NOMINATIONS_OPEN:'badge-blue', VOTING_OPEN:'badge-gold', COMPLETED:'badge-green', CANCELLED:'badge-red' }

export default function ElectionDetailPage() {
  const params = useParams()
  const { data: session } = useSession()
  const api = useApi()
  const id = params.id as string
  const [election, setElection] = useState<Election|null>(null)
  const [nomForm, setNomForm] = useState({ position:POSITIONS[0], bio:'' })
  const [selectedVotes, setSelectedVotes] = useState<Record<string,string>>({})
  const [voted, setVoted] = useState(false)
  const [loading, setLoading] = useState(false)
  const isAdmin = session?.user.role==='ADMIN'

  const reload = () => api(`/elections/${id}`).then(r=>r.json()).then(setElection)
  useEffect(() => { reload() }, [api,id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function advanceStatus() {
    if (!election) return
    const next = STATUS_FLOW[election.status]; if (!next) return
    await api(`/elections/${id}`,{method:'PATCH',body:JSON.stringify({status:next})})
    reload()
  }
  async function nominate(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const res = await api(`/elections/${id}/candidates`,{method:'POST',body:JSON.stringify(nomForm)})
    setLoading(false); if (res.ok) reload()
  }
  async function approveCandidate(candidateId:string, approved:boolean) {
    await api(`/elections/${id}/candidates/${candidateId}`,{method:'PATCH',body:JSON.stringify({approved})}); reload()
  }
  async function castVote() {
    setLoading(true)
    await api(`/elections/${id}/vote`,{method:'POST',body:JSON.stringify({votes:Object.values(selectedVotes).map(c=>({candidateId:c}))})})
    setLoading(false); setVoted(true); reload()
  }

  if (!election) return <div className="glass p-8 text-center" style={{ color:'#4A5E7A' }}>Loading…</div>
  const positions = Array.from(new Set(election.candidates.filter(c=>c.approved).map(c=>c.position)))

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/elections" className="w-9 h-9 rounded-xl flex items-center justify-center mt-1 flex-shrink-0" style={{ background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.2)', color:'#C9A84C' }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="font-display text-2xl font-bold text-white">{election.title}</h1>
            <span className={cn('badge', statusBadge[election.status]??'badge-gray')}>{election.status.replace(/_/g,' ')}</span>
          </div>
          <p className="text-sm" style={{ color:'#7B8FAD' }}>
            Voting: {format(new Date(election.votingStart),'dd MMM')} – {format(new Date(election.votingEnd),'dd MMM yyyy')} · {election._count.votes} votes cast
          </p>
        </div>
        {isAdmin && STATUS_FLOW[election.status] && (
          <button onClick={advanceStatus} className="btn-gold flex-shrink-0">{STATUS_LABEL[election.status]} <ChevronRight className="w-4 h-4" /></button>
        )}
      </div>

      {election.description && (
        <div className="glass p-5">
          <p className="text-sm leading-relaxed" style={{ color:'#94a3b8' }}>{election.description}</p>
        </div>
      )}

      {/* Nominate form */}
      {election.status==='NOMINATIONS_OPEN' && !isAdmin && (
        <div className="glass p-6">
          <p className="text-xs font-semibold mb-4" style={{ color:'#4A5E7A', letterSpacing:'0.08em' }}>NOMINATE YOURSELF</p>
          <form onSubmit={nominate} className="flex gap-3 flex-wrap">
            <select className="lux-input flex-1 min-w-[160px]" value={nomForm.position} onChange={e=>setNomForm(f=>({...f,position:e.target.value}))}>
              {POSITIONS.map(p=><option key={p}>{p}</option>)}
            </select>
            <input className="lux-input flex-1 min-w-[200px]" placeholder="Brief bio (optional)" value={nomForm.bio} onChange={e=>setNomForm(f=>({...f,bio:e.target.value}))} />
            <button type="submit" disabled={loading} className="btn-gold">{loading?'Submitting…':'Nominate'}</button>
          </form>
        </div>
      )}

      {/* Candidates by position */}
      <div className="glass p-6">
        <p className="text-xs font-semibold mb-5" style={{ color:'#4A5E7A', letterSpacing:'0.08em' }}>CANDIDATES</p>
        {election.candidates.length===0 && <p className="text-sm" style={{ color:'#4A5E7A' }}>No nominations yet.</p>}
        {POSITIONS.map(pos => {
          const cands = election.candidates.filter(c=>c.position===pos)
          if (cands.length===0) return null
          return (
            <div key={pos} className="mb-6 last:mb-0">
              <p className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color:'#C9A84C', letterSpacing:'0.1em' }}>
                {pos.toUpperCase()}
              </p>
              <div className="space-y-2">
                {cands.map(c => {
                  const isSelected = selectedVotes[pos]===c.id
                  const canVote = election.status==='VOTING_OPEN' && c.approved
                  return (
                    <div key={c.id}
                      className={cn('flex items-center justify-between p-4 rounded-xl border transition-all', canVote?'cursor-pointer':'')}
                      style={isSelected ? { background:'rgba(201,168,76,0.1)', borderColor:'rgba(201,168,76,0.4)' } : { background:'rgba(7,16,30,0.5)', borderColor:'rgba(201,168,76,0.1)' }}
                      onClick={() => { if (canVote) setSelectedVotes(sv=>({...sv,[pos]:c.id})) }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold" style={{ background:'rgba(201,168,76,0.12)', color:'#C9A84C', border:'1px solid rgba(201,168,76,0.2)' }}>
                          {c.user.name[0]}
                        </div>
                        <div>
                          <div className="text-white font-medium text-sm">{c.user.name}</div>
                          {c.bio && <div className="text-xs mt-0.5" style={{ color:'#7B8FAD' }}>{c.bio}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {election.status==='COMPLETED' && (
                          <span className="font-display font-bold text-lg" style={{ color:'#E8C55A' }}>{c._count.votes}</span>
                        )}
                        {!c.approved && isAdmin && (
                          <button onClick={e=>{e.stopPropagation();approveCandidate(c.id,true)}} className="btn-gold py-1.5 px-3 text-xs">Approve</button>
                        )}
                        {c.approved && !isSelected && <span className="badge badge-green">Approved</span>}
                        {isSelected && <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background:'#C9A84C' }}><Check className="w-3.5 h-3.5" style={{ color:'#050D1A' }} /></div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Cast vote */}
      {election.status==='VOTING_OPEN' && !voted && Object.keys(selectedVotes).length>0 && (
        <div className="glass p-5 flex items-center justify-between" style={{ borderColor:'rgba(201,168,76,0.3)', background:'rgba(201,168,76,0.05)' }}>
          <div>
            <div className="text-white font-semibold">Ready to cast your vote?</div>
            <div className="text-sm mt-0.5" style={{ color:'#7B8FAD' }}>{Object.keys(selectedVotes).length} position{Object.keys(selectedVotes).length>1?'s':''} selected</div>
          </div>
          <button onClick={castVote} disabled={loading} className="btn-gold">
            <Vote className="w-4 h-4" /> {loading?'Submitting…':'Cast Vote'}
          </button>
        </div>
      )}

      {voted && (
        <div className="glass p-8 text-center" style={{ borderColor:'rgba(34,197,94,0.3)', background:'rgba(34,197,94,0.05)' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.3)' }}>
            <Check className="w-7 h-7" style={{ color:'#4ade80' }} />
          </div>
          <p className="font-display text-xl font-bold text-white mb-1">Vote Cast Successfully</p>
          <p className="text-sm" style={{ color:'#7B8FAD' }}>Thank you for participating in the election.</p>
        </div>
      )}

      {/* Results */}
      {election.status==='COMPLETED' && (
        <div className="glass p-6" style={{ borderColor:'rgba(201,168,76,0.25)', background:'rgba(201,168,76,0.04)' }}>
          <p className="text-xs font-semibold mb-5 flex items-center gap-2" style={{ color:'#C9A84C', letterSpacing:'0.08em' }}>
            <Trophy className="w-4 h-4" /> FINAL RESULTS
          </p>
          {positions.map(pos => {
            const winner = election.candidates.filter(c=>c.position===pos&&c.approved).sort((a,b)=>b._count.votes-a._count.votes)[0]
            return winner ? (
              <div key={pos} className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor:'rgba(201,168,76,0.1)' }}>
                <div>
                  <div className="text-xs font-semibold" style={{ color:'#4A5E7A' }}>{pos}</div>
                  <div className="text-white font-medium mt-0.5">{winner.user.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl font-bold gold-text">{winner._count.votes}</div>
                  <div className="text-xs" style={{ color:'#4A5E7A' }}>votes</div>
                </div>
              </div>
            ) : null
          })}
        </div>
      )}
    </div>
  )
}
