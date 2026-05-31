'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, Vote, Check, Trophy, Users, ChevronRight, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useApi } from '@/lib/use-api'

type Candidate = { id:string; position:string; bio:string; approved:boolean; user:{name:string;id:string}; _count:{votes:number} }
type Election  = { id:string; title:string; description:string; status:string; nominationStart:string; nominationEnd:string; votingStart:string; votingEnd:string; candidates:Candidate[]; _count:{votes:number} }

const POSITIONS = ['President','Vice President','Secretary','Treasurer','Committee Member']
const STAGE_FLOW: Record<string,string>  = { DRAFT:'NOMINATIONS_OPEN', NOMINATIONS_OPEN:'VOTING_OPEN', VOTING_OPEN:'COMPLETED' }
const STAGE_BTN:  Record<string,string>  = { DRAFT:'Open Nominations', NOMINATIONS_OPEN:'Open Voting', VOTING_OPEN:'Finalise Results' }

const STAGES = [
  { key:'DRAFT',            short:'Draft',       index:0 },
  { key:'NOMINATIONS_OPEN', short:'Nominations', index:1 },
  { key:'VOTING_OPEN',      short:'Voting',      index:2 },
  { key:'COMPLETED',        short:'Results',     index:3 },
]

function stageIndex(status: string) { return STAGES.findIndex(s => s.key === status) }

export default function ElectionDetailPage() {
  const params = useParams()
  const { data: session } = useSession()
  const api = useApi()
  const id = params.id as string
  const [election, setElection] = useState<Election|null>(null)
  const [nomPos, setNomPos] = useState(POSITIONS[0])
  const [nomBio, setNomBio] = useState('')
  const [selected, setSelected] = useState<Record<string,string>>({})
  const [voted, setVoted] = useState(false)
  const [nomLoading, setNomLoading] = useState(false)
  const [voteLoading, setVoteLoading] = useState(false)
  const [advLoading, setAdvLoading] = useState(false)
  const isAdmin = session?.user.role === 'ADMIN'

  const reload = () => api(`/elections/${id}`).then(r=>r.json()).then(setElection)
  useEffect(() => { reload() }, [api, id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function advance() {
    if (!election || !STAGE_FLOW[election.status]) return
    setAdvLoading(true)
    await api(`/elections/${id}`, { method:'PATCH', body:JSON.stringify({ status:STAGE_FLOW[election.status] }) })
    setAdvLoading(false); reload()
  }
  async function nominate(e: React.FormEvent) {
    e.preventDefault(); setNomLoading(true)
    const res = await api(`/elections/${id}/candidates`, { method:'POST', body:JSON.stringify({ position:nomPos, bio:nomBio }) })
    setNomLoading(false)
    if (res.ok) { setNomBio(''); reload() }
  }
  async function approveCandidate(candidateId: string, approved: boolean) {
    await api(`/elections/${id}/candidates/${candidateId}`, { method:'PATCH', body:JSON.stringify({ approved }) })
    reload()
  }
  async function castVote() {
    setVoteLoading(true)
    await api(`/elections/${id}/vote`, { method:'POST', body:JSON.stringify({ votes:Object.values(selected).map(c=>({candidateId:c})) }) })
    setVoteLoading(false); setVoted(true); reload()
  }

  if (!election) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor:'rgba(201,168,76,0.3)', borderTopColor:'#C9A84C' }} />
    </div>
  )

  const si = stageIndex(election.status)
  const positions = Array.from(new Set(election.candidates.filter(c=>c.approved).map(c=>c.position)))
  const totalVotes = election._count.votes
  const maxVotes   = Math.max(...election.candidates.map(c=>c._count.votes), 1)

  return (
    <div className="max-w-3xl space-y-6">

      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/elections" className="w-9 h-9 rounded-xl flex items-center justify-center mt-1 flex-shrink-0 transition-all"
          style={{ background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.2)', color:'#C9A84C' }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <p className="text-xs font-bold mb-1" style={{ color:'#C9A84C', letterSpacing:'0.08em' }}>ELECTION</p>
          <h1 className="font-display text-2xl font-bold text-white">{election.title}</h1>
          {election.description && <p className="text-sm mt-1" style={{ color:'#7B8FAD' }}>{election.description}</p>}
        </div>
      </div>

      {/* ── Visual Stage Timeline ───────────────────── */}
      <div className="glass p-6">
        <div className="flex items-start justify-between relative">
          {/* connector line */}
          <div className="absolute left-0 right-0 top-[18px] mx-14" style={{ height:'2px', background:'rgba(201,168,76,0.1)' }} />
          <div className="absolute left-0 top-[18px] mx-14" style={{ height:'2px', background:'linear-gradient(90deg,#C9A84C,rgba(201,168,76,0.3))', width:`${(si / 3) * 100}%`, transition:'width 0.8s ease' }} />

          {STAGES.map((stage, i) => {
            const done = i < si; const active = i === si
            return (
              <div key={stage.key} className="stage-pill flex-1 relative z-10">
                <div className={cn('stage-dot', done?'done': active?'active':'pending')}>
                  {done ? <Check className="w-4 h-4" /> : <span>{i + 1}</span>}
                </div>
                <span className="text-xs font-semibold text-center leading-tight"
                  style={{ color: done?'#C9A84C': active?'#E8C55A':'#3A4E6A' }}>
                  {stage.short}
                </span>
                {active && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ background:'#C9A84C' }} />}
              </div>
            )
          })}
        </div>

        {/* Stage info */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm" style={{ color:'#7B8FAD' }}>
            {election.status === 'NOMINATIONS_OPEN' && `Nominations close ${format(new Date(election.nominationEnd),'dd MMM yyyy')}`}
            {election.status === 'VOTING_OPEN' && `Voting closes ${format(new Date(election.votingEnd),'dd MMM yyyy')}`}
            {election.status === 'COMPLETED' && `${totalVotes} total votes cast`}
            {election.status === 'DRAFT' && `Nominations open ${format(new Date(election.nominationStart),'dd MMM yyyy')}`}
          </div>
          {isAdmin && STAGE_FLOW[election.status] && (
            <button onClick={advance} disabled={advLoading} className="btn-gold btn-sm">
              <Zap className="w-3.5 h-3.5" />
              {advLoading ? 'Updating…' : STAGE_BTN[election.status]}
            </button>
          )}
        </div>
      </div>

      {/* ── NOMINATIONS PHASE ────────────────────────── */}
      {election.status === 'NOMINATIONS_OPEN' && (
        <div className="space-y-4">
          {/* Resident: nominate yourself */}
          {!isAdmin && (
            <div className="glass-gold p-6">
              <p className="text-xs font-bold mb-4" style={{ color:'#C9A84C', letterSpacing:'0.08em' }}>PUT YOURSELF FORWARD</p>
              <form onSubmit={nominate}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="lux-label">Position</label>
                    <select className="lux-input" value={nomPos} onChange={e=>setNomPos(e.target.value)}>
                      {POSITIONS.map(p=><option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="lux-label">Short Bio (optional)</label>
                    <input className="lux-input" placeholder="Why should residents vote for you?" value={nomBio} onChange={e=>setNomBio(e.target.value)} />
                  </div>
                </div>
                <button type="submit" disabled={nomLoading} className="btn-gold">
                  <Vote className="w-4 h-4" />
                  {nomLoading ? 'Submitting…' : 'Submit Nomination'}
                </button>
              </form>
            </div>
          )}

          {/* Candidates list with admin approve buttons */}
          {POSITIONS.map(pos => {
            const cands = election.candidates.filter(c=>c.position===pos)
            if (!cands.length) return null
            return (
              <div key={pos} className="glass p-5">
                <p className="text-xs font-bold mb-3" style={{ color:'#4A5E7A', letterSpacing:'0.1em' }}>{pos.toUpperCase()}</p>
                <div className="space-y-2">
                  {cands.map(c=>(
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background:'rgba(7,16,30,0.5)', border:'1px solid rgba(201,168,76,0.1)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" style={{ background:'rgba(201,168,76,0.12)', color:'#C9A84C', border:'1px solid rgba(201,168,76,0.2)' }}>{c.user.name[0]}</div>
                        <div>
                          <p className="text-white font-medium text-sm">{c.user.name}</p>
                          {c.bio && <p className="text-xs mt-0.5" style={{ color:'#7B8FAD' }}>{c.bio}</p>}
                        </div>
                      </div>
                      {isAdmin ? (
                        c.approved
                          ? <span className="badge badge-green">Approved</span>
                          : <button onClick={()=>approveCandidate(c.id,true)} className="btn-gold btn-sm">Approve</button>
                      ) : (
                        c.approved ? <span className="badge badge-green">Approved</span> : <span className="badge badge-yellow">Pending</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {election.candidates.length === 0 && (
            <div className="glass p-10 text-center">
              <Users className="w-10 h-10 mx-auto mb-3" style={{ color:'#3A4E6A' }} />
              <p className="text-white font-medium mb-1">No nominations yet</p>
              <p className="text-sm" style={{ color:'#7B8FAD' }}>Be the first to put yourself forward for the society committee.</p>
            </div>
          )}
        </div>
      )}

      {/* ── VOTING PHASE ─────────────────────────────── */}
      {election.status === 'VOTING_OPEN' && !voted && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color:'#7B8FAD' }}>Select one candidate per position · {Object.keys(selected).length} of {positions.length} selected</p>
            {Object.keys(selected).length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.25)' }}>
                <div className="w-2 h-2 rounded-full" style={{ background:'#C9A84C' }} />
                <span className="text-xs font-semibold" style={{ color:'#E8C55A' }}>{Object.keys(selected).length} selected</span>
              </div>
            )}
          </div>

          {POSITIONS.map(pos => {
            const cands = election.candidates.filter(c=>c.position===pos&&c.approved)
            if (!cands.length) return null
            return (
              <div key={pos}>
                <p className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color:'#C9A84C', letterSpacing:'0.1em' }}>
                  <span>{pos.toUpperCase()}</span>
                  {selected[pos] && <span className="badge badge-gold normal-case font-normal" style={{ letterSpacing:'normal' }}>Selected ✓</span>}
                </p>
                <div className="grid gap-3" style={{ gridTemplateColumns: cands.length === 1 ? '1fr' : 'repeat(auto-fill,minmax(200px,1fr))' }}>
                  {cands.map(c=>(
                    <div key={c.id}
                      className={cn('vote-card', selected[pos]===c.id?'selected':'')}
                      onClick={()=>setSelected(s=>({...s,[pos]:c.id}))}>
                      <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center font-display font-bold text-2xl mb-3"
                          style={{ background: selected[pos]===c.id ? 'linear-gradient(135deg,#C9A84C,#E8C55A)' : 'rgba(201,168,76,0.12)', color: selected[pos]===c.id ? '#050D1A' : '#C9A84C', border: selected[pos]===c.id ? 'none' : '2px solid rgba(201,168,76,0.2)', transition:'all .25s' }}>
                          {c.user.name[0]}
                        </div>
                        <p className="text-white font-semibold text-base">{c.user.name}</p>
                        {c.bio && <p className="text-xs mt-1.5 leading-relaxed" style={{ color:'#7B8FAD' }}>{c.bio}</p>}
                        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold" style={{ color: selected[pos]===c.id?'#E8C55A':'#4A5E7A' }}>
                          {selected[pos]===c.id ? <><Check className="w-3.5 h-3.5" /> Selected</> : 'Tap to select'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Cast ballot CTA */}
          {Object.keys(selected).length > 0 && (
            <div className="glass-gold p-6 flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">Ready to cast your ballot?</p>
                <p className="text-sm mt-0.5" style={{ color:'#7B8FAD' }}>{Object.keys(selected).length} position{Object.keys(selected).length>1?'s':''} selected — this action is final.</p>
              </div>
              <button onClick={castVote} disabled={voteLoading} className="btn-gold">
                <Vote className="w-4 h-4" />
                {voteLoading ? 'Submitting…' : 'Cast Ballot'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── VOTED CONFIRMATION ───────────────────────── */}
      {voted && (
        <div className="glass p-10 text-center" style={{ borderColor:'rgba(34,197,94,0.3)', background:'rgba(34,197,94,0.04)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background:'rgba(34,197,94,0.15)', border:'2px solid rgba(34,197,94,0.4)' }}>
            <Check className="w-8 h-8" style={{ color:'#4ade80' }} />
          </div>
          <p className="font-display text-xl font-bold text-white mb-2">Your Vote Has Been Cast</p>
          <p className="text-sm" style={{ color:'#7B8FAD' }}>Thank you for participating in the democratic process of Luxor Homes.</p>
        </div>
      )}

      {/* ── RESULTS ──────────────────────────────────── */}
      {election.status === 'COMPLETED' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6" style={{ color:'#E8C55A' }} />
            <h2 className="font-display text-xl font-bold text-white">Election Results</h2>
            <span className="text-sm ml-2" style={{ color:'#7B8FAD' }}>{totalVotes} total votes</span>
          </div>

          {POSITIONS.map(pos => {
            const cands = election.candidates.filter(c=>c.position===pos&&c.approved).sort((a,b)=>b._count.votes-a._count.votes)
            if (!cands.length) return null
            const winner = cands[0]
            return (
              <div key={pos} className="glass p-6">
                <p className="text-xs font-bold mb-4" style={{ color:'#4A5E7A', letterSpacing:'0.1em' }}>{pos.toUpperCase()}</p>
                <div className="space-y-3">
                  {cands.map((c, i) => {
                    const pct = totalVotes > 0 ? Math.round((c._count.votes / totalVotes) * 100) : 0
                    const isWinner = i === 0
                    return (
                      <div key={c.id}>
                        <div className="flex items-center gap-3 mb-1.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                            style={ isWinner ? { background:'linear-gradient(135deg,#C9A84C,#E8C55A)', color:'#050D1A', boxShadow:'0 2px 8px rgba(201,168,76,0.4)' } : { background:'rgba(255,255,255,0.06)', color:'#94a3b8' }}>
                            {isWinner ? '👑' : c.user.name[0]}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className={cn('font-semibold text-sm', isWinner?'text-white':'text-slate-300')}>{c.user.name}</span>
                              <span className="font-display font-bold" style={{ color: isWinner?'#E8C55A':'#7B8FAD' }}>{c._count.votes} <span className="text-xs font-sans" style={{ color:'#4A5E7A' }}>({pct}%)</span></span>
                            </div>
                            <div className="vote-bar-track">
                              <div className="vote-bar-fill" style={{ width:`${(c._count.votes/maxVotes)*100}%`, opacity: isWinner?1:0.4 }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
