'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Building2, LayoutDashboard, Users, Vote, Wrench, ShieldCheck, LogOut, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const nav = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/residents',   label: 'Residents',   icon: Users },
  { href: '/elections',   label: 'Elections',   icon: Vote },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/visitors',    label: 'Visitors',    icon: ShieldCheck },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [showSignOut, setShowSignOut] = useState(false)

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <aside className="w-64 min-h-screen flex flex-col border-r" style={{ background: '#060E1C', borderColor: 'rgba(201,168,76,0.1)' }}>

      {/* Logo */}
      <div className="px-5 py-6 border-b" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C55A)' }}>
            <Building2 className="w-5 h-5" style={{ color: '#050D1A' }} />
          </div>
          <div>
            <div className="font-display font-bold text-white text-base leading-tight">Luxor Homes</div>
            <div className="text-xs mt-0.5" style={{ color: '#4A5E7A' }}>Society Portal</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        <p className="text-xs font-semibold px-3 mb-3" style={{ color: '#3A4E6A', letterSpacing: '0.08em' }}>NAVIGATION</p>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative"
              style={active ? {
                background: 'rgba(201,168,76,0.12)',
                color: '#E8C55A',
                borderLeft: '2px solid #C9A84C',
              } : {
                color: '#7B8FAD',
                borderLeft: '2px solid transparent',
              }}
            >
              {!active && (
                <span className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(201,168,76,0.05)' }} />
              )}
              <Icon className={cn('w-4 h-4 flex-shrink-0 transition-colors', active ? '' : 'group-hover:text-gold-400')}
                style={active ? { color: '#C9A84C' } : {}} />
              <span className={active ? '' : 'group-hover:text-white transition-colors'}>{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" style={{ color: '#C9A84C' }} />}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t p-4" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
        <button onClick={() => setShowSignOut(v => !v)}
          className="w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group"
          style={{ background: showSignOut ? 'rgba(201,168,76,0.08)' : 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.06)')}
          onMouseLeave={e => (e.currentTarget.style.background = showSignOut ? 'rgba(201,168,76,0.08)' : 'transparent')}
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
            style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C55A)', color: '#050D1A' }}>
            {session?.user.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-sm font-medium truncate text-white">{session?.user.name}</div>
            <div className="text-xs mt-0.5 capitalize" style={{ color: '#4A5E7A' }}>
              {session?.user.role?.toLowerCase()}
            </div>
          </div>
        </button>

        {showSignOut && (
          <button onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full mt-2 flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        )}
      </div>
    </aside>
  )
}
