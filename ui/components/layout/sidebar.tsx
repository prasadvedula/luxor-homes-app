'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Building2, LayoutDashboard, Users, Vote, Wrench, ShieldCheck, UserCheck, LogOut, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { NotificationBell } from './notification-bell'

const nav = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/residents',   label: 'Residents',   icon: Users },
  { href: '/elections',   label: 'Elections',   icon: Vote },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/visitors',    label: 'Visitors',    icon: ShieldCheck },
  { href: '/maids',       label: 'Maids',       icon: UserCheck },
]

function useActive() {
  const pathname = usePathname()
  return (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
}

/* ── Desktop sidebar (lg+) ───────────────────────────────────────────────── */
export function Sidebar() {
  const isActive = useActive()
  const { data: session } = useSession()
  const [showSignOut, setShowSignOut] = useState(false)

  return (
    <>
      {/* ── Desktop ── */}
      <aside className="hidden lg:flex w-64 min-h-screen flex-col border-r relative" style={{ background: 'linear-gradient(180deg,#060E1C 0%,#050D1A 100%)', borderColor: 'rgba(201,168,76,0.1)' }}>
        <div className="absolute top-0 left-0 right-0 h-48 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%,rgba(201,168,76,0.06) 0%,transparent 70%)' }} />

        {/* Logo */}
        <div className="relative px-5 py-6 border-b" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C55A)', boxShadow: '0 4px 16px rgba(201,168,76,0.4)' }}>
              <Building2 className="w-5 h-5" style={{ color: '#050D1A' }} />
            </div>
            <div>
              <div className="font-display font-bold text-white text-base leading-tight">Luxor Homes</div>
              <div className="text-xs mt-0.5" style={{ color: '#4A5E7A' }}>Society Portal</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="relative flex-1 px-3 py-5 space-y-0.5">
          <p className="text-xs font-bold px-3 mb-4" style={{ color: '#3A4E6A', letterSpacing: '0.1em' }}>MENU</p>
          {nav.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href}
                className={cn('flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative group')}
                style={active ? {
                  background: 'linear-gradient(135deg,rgba(201,168,76,0.18),rgba(201,168,76,0.08))',
                  color: '#E8C55A', borderLeft: '3px solid #C9A84C', paddingLeft: '11px',
                  boxShadow: '0 2px 12px rgba(201,168,76,0.1)',
                } : { color: '#7B8FAD', borderLeft: '3px solid transparent', paddingLeft: '11px' }}
              >
                {!active && <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(201,168,76,0.05)' }} />}
                <Icon className="w-4 h-4 flex-shrink-0 relative" style={active ? { color: '#C9A84C' } : {}} />
                <span className="relative">{label}</span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#C9A84C', boxShadow: '0 0 6px rgba(201,168,76,0.8)' }} />}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="relative border-t p-3 space-y-1" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-bold" style={{ color: '#3A4E6A', letterSpacing: '0.1em' }}>NOTIFICATIONS</span>
            <NotificationBell />
          </div>
          <div className="gold-divider !my-2" />
          <button onClick={() => setShowSignOut(v => !v)}
            className="w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200"
            style={{ background: showSignOut ? 'rgba(201,168,76,0.08)' : 'transparent' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
              style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C55A)', color: '#050D1A' }}>
              {session?.user.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-semibold truncate text-white">{session?.user.name}</div>
              <div className="text-xs mt-0.5 capitalize" style={{ color: '#4A5E7A' }}>{session?.user.role?.toLowerCase()}</div>
            </div>
          </button>
          {showSignOut && (
            <button onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          )}
        </div>
      </aside>

      {/* ── Mobile top header ── */}
      <MobileHeader />

      {/* ── Mobile bottom nav ── */}
      <MobileBottomNav isActive={isActive} />
    </>
  )
}

/* ── Mobile top header ───────────────────────────────────────────────────── */
function MobileHeader() {
  const { data: session } = useSession()
  const [showMenu, setShowMenu] = useState(false)

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 border-b"
      style={{ background: 'rgba(5,13,26,0.95)', borderColor: 'rgba(201,168,76,0.12)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>

      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C55A)', boxShadow: '0 2px 8px rgba(201,168,76,0.4)' }}>
          <Building2 className="w-4 h-4" style={{ color: '#050D1A' }} />
        </div>
        <span className="font-display font-bold text-white text-base">Luxor Homes</span>
      </div>

      {/* Right: bell + avatar */}
      <div className="flex items-center gap-3">
        <NotificationBell />
        <button onClick={() => setShowMenu(v => !v)}
          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C55A)', color: '#050D1A' }}>
          {session?.user.name?.[0]?.toUpperCase() ?? '?'}
        </button>
      </div>

      {/* Avatar dropdown */}
      {showMenu && (
        <div className="absolute top-full right-3 mt-2 rounded-xl overflow-hidden shadow-2xl"
          style={{ background: '#0B1628', border: '1px solid rgba(201,168,76,0.2)', minWidth: '180px' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
            <div className="text-sm font-semibold text-white truncate">{session?.user.name}</div>
            <div className="text-xs capitalize mt-0.5" style={{ color: '#4A5E7A' }}>{session?.user.role?.toLowerCase()}</div>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium"
            style={{ color: '#f87171' }}>
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      )}
    </header>
  )
}

/* ── Mobile bottom nav ───────────────────────────────────────────────────── */
function MobileBottomNav({ isActive }: { isActive: (href: string) => boolean }) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t"
      style={{ background: 'rgba(5,13,26,0.97)', borderColor: 'rgba(201,168,76,0.15)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
      <div className="flex items-center justify-around px-1 py-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl flex-1 transition-all"
              style={active ? { color: '#E8C55A' } : { color: '#4A5E7A' }}>
              <div className="relative">
                <Icon className="w-5 h-5" />
                {active && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
                    style={{ background: '#C9A84C', boxShadow: '0 0 4px rgba(201,168,76,0.8)' }} />
                )}
              </div>
              <span className="text-[10px] font-medium leading-tight">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
