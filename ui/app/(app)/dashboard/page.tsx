import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { serverApi } from '@/lib/api-client'
import Link from 'next/link'
import { Users, Vote, Wrench, ShieldCheck, Clock, AlertTriangle } from 'lucide-react'

type Stats = {
  residents: number
  pendingUsers: number
  openMaintenance: number
  pendingVisitors: number
  activeElection: { id: string; title: string; status: string } | null
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const isAdmin = session?.user.role === 'ADMIN'

  const res = await serverApi('/admin/stats').catch(() => null)
  const data: Stats = res?.ok ? await res.json() : { residents: 0, pendingUsers: 0, openMaintenance: 0, pendingVisitors: 0, activeElection: null }

  const { residents, pendingUsers, openMaintenance, pendingVisitors, activeElection } = data

  const stats = [
    { label: 'Registered Residents', value: residents, of: '/70 flats', icon: Users, href: '/residents', color: 'bg-blue-50 text-blue-600' },
    { label: 'Open Maintenance', value: openMaintenance, of: 'issues', icon: Wrench, href: '/maintenance', color: 'bg-orange-50 text-orange-600' },
    { label: 'Pending Visitors', value: pendingVisitors, of: 'awaiting approval', icon: ShieldCheck, href: '/visitors', color: 'bg-purple-50 text-purple-600' },
    ...(isAdmin ? [{ label: 'Pending Approvals', value: pendingUsers, of: 'new residents', icon: Clock, href: '/residents?tab=pending', color: 'bg-yellow-50 text-yellow-600' }] : []),
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy-800">
          Good {getGreeting()}, {session?.user.name?.split(' ')[0]}
        </h1>
        <p className="text-gray-500 text-sm mt-1">Here&apos;s what&apos;s happening at Luxor Homes today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card hover:shadow-md transition-shadow">
            <div className={`inline-flex p-2.5 rounded-lg mb-3 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-navy-800">{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            <div className="text-xs text-gray-400">{s.of}</div>
          </Link>
        ))}
      </div>

      {/* Active Election Banner */}
      {activeElection && (
        <div className="mb-6 bg-gold-500 rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Vote className="w-6 h-6 text-white" />
            <div>
              <div className="text-white font-semibold">{activeElection.title}</div>
              <div className="text-gold-100 text-sm">
                {activeElection.status === 'VOTING_OPEN' ? 'Voting is currently open!' : 'Nominations are open'}
              </div>
            </div>
          </div>
          <Link href={`/elections/${activeElection.id}`} className="bg-white text-gold-600 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-gold-50 transition-colors">
            {activeElection.status === 'VOTING_OPEN' ? 'Vote Now' : 'Nominate'}
          </Link>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-navy-800 mb-3 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-orange-500" /> Quick Actions
          </h3>
          <div className="space-y-2">
            <Link href="/maintenance" className="flex items-center gap-2 text-sm text-gray-600 hover:text-navy-800 py-1.5 border-b border-gray-50 last:border-0">
              <AlertTriangle className="w-4 h-4 text-orange-400" /> Report a maintenance issue
            </Link>
            <Link href="/visitors" className="flex items-center gap-2 text-sm text-gray-600 hover:text-navy-800 py-1.5 border-b border-gray-50 last:border-0">
              <ShieldCheck className="w-4 h-4 text-purple-400" /> View visitor requests
            </Link>
            <Link href="/residents" className="flex items-center gap-2 text-sm text-gray-600 hover:text-navy-800 py-1.5">
              <Users className="w-4 h-4 text-blue-400" /> Browse resident directory
            </Link>
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold text-navy-800 mb-3 flex items-center gap-2">
            <Vote className="w-4 h-4 text-gold-500" /> Elections
          </h3>
          <Link href="/elections" className="text-sm text-gray-600 hover:text-navy-800 block">
            View all elections and results →
          </Link>
          {isAdmin && (
            <Link href="/elections/new" className="text-sm text-gold-600 hover:text-gold-700 block mt-2 font-medium">
              + Create new election
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
