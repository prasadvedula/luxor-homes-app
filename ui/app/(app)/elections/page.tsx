'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Vote, Plus, ChevronRight, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useApi } from '@/lib/use-api'

type Election = {
  id: string; title: string; description: string; status: string
  votingStart: string; votingEnd: string; nominationEnd: string
  _count: { votes: number }
  candidates: { id: string; position: string; approved: boolean }[]
}

const statusBadge: Record<string,string> = { DRAFT:'badge-gray', NOMINATIONS_OPEN:'badge-blue', VOTING_OPEN:'badge-gold', COMPLETED:'badge-green', CANCELLED:'badge-red' }
const statusLabel: Record<string,string> = { DRAFT:'Draft', NOMINATIONS_OPEN:'Nominations Open', VOTING_OPEN:'Voting Open', COMPLETED:'Completed', CANCELLED:'Cancelled' }

export default function ElectionsPage() {
  const { data: session } = useSession()
  const api = useApi()
  const [elections, setElections] = useState<Election[]>([])
  const isAdmin = session?.user.role === 'ADMIN'

  useEffect(() => { api('/elections').then(r=>r.json()).then(setElections) }, [api])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color:'#C9A84C', letterSpacing:'0.08em' }}>GOVERNANCE</p>
          <h1 className="font-display text-3xl font-bold text-white flex items-center gap-3">
            <Vote className="w-7 h-7" style={{ color:'#E8C55A' }} /> Elections
          </h1>
          <p className="text-sm mt-1" style={{ color:'#7B8FAD' }}>Society elections · One vote per flat</p>
        </div>
        {isAdmin && (
          <Link href="/elections/new" className="btn-gold"><Plus className="w-4 h-4" /> New Election</Link>
        )}
      </div>

      <div className="space-y-3">
        {elections.length===0 && <div className="glass p-12 text-center" style={{ color:'#4A5E7A' }}>No elections yet. {isAdmin && 'Create the first one!'}</div>}
        {elections.map(e => {
          const active = e.status==='VOTING_OPEN'
          return (
            <Link key={e.id} href={`/elections/${e.id}`} className="glass p-5 flex items-center gap-5 group" style={{ textDecoration:'none', ...(active ? { borderColor:'rgba(201,168,76,0.3)', background:'rgba(201,168,76,0.04)' } : {}) }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: active?'rgba(201,168,76,0.15)':'rgba(59,130,246,0.1)', border: active?'1px solid rgba(201,168,76,0.3)':'1px solid rgba(59,130,246,0.2)' }}>
                <Vote className="w-5 h-5" style={{ color: active?'#E8C55A':'#60a5fa' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <span className="text-white font-semibold">{e.title}</span>
                  <span className={cn('badge', statusBadge[e.status]??'badge-gray')}>{statusLabel[e.status]}</span>
                </div>
                <div className="flex items-center gap-4 text-xs" style={{ color:'#7B8FAD' }}>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(e.votingStart),'dd MMM')} – {format(new Date(e.votingEnd),'dd MMM yyyy')}</span>
                  <span>{e._count.votes} votes cast</span>
                  <span>{e.candidates.filter(c=>c.approved).length} candidates</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color:'#C9A84C' }} />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
