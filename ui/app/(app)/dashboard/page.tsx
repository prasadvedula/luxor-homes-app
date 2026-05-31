import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { serverApi } from '@/lib/api-client'
import Link from 'next/link'
import { Users, Vote, Wrench, ShieldCheck, Clock, AlertTriangle, ArrowRight, TrendingUp, KeyRound } from 'lucide-react'

type Stats = {
  residents: number; rentedFlats: number; pendingUsers: number; openMaintenance: number
  pendingVisitors: number; activeElection: { id: string; title: string; status: string } | null
}

function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening'
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const isAdmin = session?.user.role === 'ADMIN'
  const res = await serverApi('/admin/stats').catch(() => null)
  const stats: Stats = res?.ok ? await res.json() : { residents: 0, rentedFlats: 0, pendingUsers: 0, openMaintenance: 0, pendingVisitors: 0, activeElection: null }
  const { residents, rentedFlats, pendingUsers, openMaintenance, pendingVisitors, activeElection } = stats

  const cards = [
    { label: 'Residents',        value: residents,       sub: 'of 70 flats',       icon: Users,       href: '/residents',  color: '#60a5fa', bg: 'rgba(59,130,246,0.1)'  },
    { label: 'Rented Flats',     value: rentedFlats,     sub: 'with active tenant', icon: KeyRound,    href: '/residents',  color: '#fb923c', bg: 'rgba(249,115,22,0.1)'  },
    { label: 'Open Maintenance', value: openMaintenance, sub: 'active issues',      icon: Wrench,      href: '/maintenance',color: '#c084fc', bg: 'rgba(168,85,247,0.1)'  },
    { label: 'Pending Visitors', value: pendingVisitors, sub: 'awaiting approval',  icon: ShieldCheck, href: '/visitors',   color: '#4ade80', bg: 'rgba(34,197,94,0.1)'   },
    ...(isAdmin ? [{ label: 'Pending Approvals', value: pendingUsers, sub: 'new residents', icon: Clock, href: '/residents', color: '#facc15', bg: 'rgba(234,179,8,0.1)' }] : []),
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: '#C9A84C' }}>{getGreeting()}</p>
          <h1 className="font-display text-3xl font-bold text-white">
            {session?.user.name?.split(' ')[0]}
          </h1>
          <p className="text-sm mt-1" style={{ color: '#7B8FAD' }}>
            Here&apos;s what&apos;s happening at Luxor Homes
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)', color: '#E8C55A' }}>
          <TrendingUp className="w-3.5 h-3.5" />
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href}
            className="glass p-5 group cursor-pointer"
            style={{ textDecoration: 'none' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: c.bg, border: `1px solid ${c.color}30` }}>
                <c.icon className="w-5 h-5" style={{ color: c.color }} />
              </div>
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: c.color }} />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{c.value}</div>
            <div className="text-xs font-medium text-white mb-0.5">{c.label}</div>
            <div className="text-xs" style={{ color: '#4A5E7A' }}>{c.sub}</div>
          </Link>
        ))}
      </div>

      {/* Election banner */}
      {activeElection && (
        <div className="relative overflow-hidden rounded-2xl p-6 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg,rgba(201,168,76,0.15) 0%,rgba(232,197,90,0.08) 100%)', border: '1px solid rgba(201,168,76,0.3)' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 80% 50%,rgba(201,168,76,0.08),transparent 60%)' }} />
          <div className="flex items-center gap-4 relative">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.2)', border: '1px solid rgba(201,168,76,0.3)' }}>
              <Vote className="w-6 h-6" style={{ color: '#E8C55A' }} />
            </div>
            <div>
              <p className="text-xs font-semibold mb-0.5" style={{ color: '#C9A84C', letterSpacing: '0.06em' }}>ACTIVE ELECTION</p>
              <h3 className="text-white font-semibold text-lg">{activeElection.title}</h3>
              <p className="text-sm" style={{ color: '#7B8FAD' }}>
                {activeElection.status === 'VOTING_OPEN' ? 'Voting is now open — cast your vote today' : 'Nominations are open — put yourself forward'}
              </p>
            </div>
          </div>
          <Link href={`/elections/${activeElection.id}`} className="btn-gold relative flex-shrink-0">
            {activeElection.status === 'VOTING_OPEN' ? 'Vote Now' : 'Nominate'}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Quick actions grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass p-6">
          <p className="text-xs font-semibold mb-4" style={{ color: '#4A5E7A', letterSpacing: '0.08em' }}>QUICK ACTIONS</p>
          <div className="space-y-3">
            {[
              { href: '/maintenance', icon: AlertTriangle, label: 'Report a maintenance issue', color: '#fb923c' },
              { href: '/visitors',    icon: ShieldCheck,   label: 'Manage visitor approvals',   color: '#c084fc' },
              { href: '/residents',   icon: Users,         label: 'Browse resident directory',  color: '#60a5fa' },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className="quick-action-link flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium text-white transition-all group"
                style={{ textDecoration: 'none' }}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" style={{ color: item.color }} />
                <span style={{ color: '#94a3b8' }} className="group-hover:text-white transition-colors">{item.label}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: item.color }} />
              </Link>
            ))}
          </div>
        </div>

        <div className="glass p-6">
          <p className="text-xs font-semibold mb-4" style={{ color: '#4A5E7A', letterSpacing: '0.08em' }}>SOCIETY INFO</p>
          <div className="space-y-3">
            {[
              { label: 'Total Flats',       value: '70',                                  sub: 'across 5 floors' },
              { label: 'Owner-Occupied',   value: `${residents - rentedFlats}`,          sub: `${rentedFlats} rented out` },
              { label: 'Rented Out',        value: `${rentedFlats}`,                      sub: 'with active tenants' },
              { label: 'Occupancy',         value: `${Math.round((residents / 70) * 100)}%`, sub: 'of flats registered' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(201,168,76,0.08)' }}>
                <div>
                  <div className="text-sm font-medium text-white">{item.label}</div>
                  <div className="text-xs" style={{ color: '#4A5E7A' }}>{item.sub}</div>
                </div>
                <div className="font-display text-xl font-bold gold-text">{item.value}</div>
              </div>
            ))}
          </div>
          {isAdmin && (
            <Link href="/elections/new" className="btn-ghost w-full justify-center mt-4 py-2.5 text-sm">
              + Create New Election
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
