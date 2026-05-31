'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Vote, Plus, ChevronRight } from 'lucide-react'
import { cn, statusColor } from '@/lib/utils'
import { format } from 'date-fns'
import { useApi } from '@/lib/use-api'

type Election = {
  id: string
  title: string
  description: string
  status: string
  votingStart: string
  votingEnd: string
  nominationEnd: string
  _count: { votes: number }
  candidates: { id: string; position: string; approved: boolean }[]
}

const statusLabel: Record<string, string> = {
  DRAFT: 'Draft',
  NOMINATIONS_OPEN: 'Nominations Open',
  VOTING_OPEN: 'Voting Open',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export default function ElectionsPage() {
  const { data: session } = useSession()
  const api = useApi()
  const [elections, setElections] = useState<Election[]>([])
  const isAdmin = session?.user.role === 'ADMIN'

  useEffect(() => {
    api('/elections').then(r => r.json()).then(setElections)
  }, [api])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-800 flex items-center gap-2">
            <Vote className="w-6 h-6 text-gold-500" /> Elections
          </h1>
          <p className="text-gray-500 text-sm mt-1">Society elections — one vote per flat</p>
        </div>
        {isAdmin && (
          <Link href="/elections/new" className="btn-gold flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Election
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {elections.length === 0 && <p className="text-gray-500 text-sm">No elections yet.</p>}
        {elections.map(e => (
          <Link key={e.id} href={`/elections/${e.id}`}
            className="card flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className="font-semibold text-navy-800">{e.title}</span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusColor(e.status))}>
                  {statusLabel[e.status]}
                </span>
              </div>
              <div className="text-xs text-gray-500 flex gap-4">
                <span>Voting: {format(new Date(e.votingStart), 'dd MMM')} – {format(new Date(e.votingEnd), 'dd MMM yyyy')}</span>
                <span>{e._count.votes} votes cast</span>
                <span>{e.candidates.filter(c => c.approved).length} candidates</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 ml-4" />
          </Link>
        ))}
      </div>
    </div>
  )
}
