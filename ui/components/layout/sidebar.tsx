'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Building2, LayoutDashboard, Users, Vote, Wrench, ShieldCheck, LogOut, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/residents', label: 'Residents', icon: Users },
  { href: '/elections', label: 'Elections', icon: Vote },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/visitors', label: 'Visitors', icon: ShieldCheck },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)

  return (
    <aside className="w-60 min-h-screen bg-navy-800 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-navy-700">
        <Building2 className="w-7 h-7 text-gold-500 flex-shrink-0" />
        <div>
          <div className="text-white font-bold text-sm leading-tight">Luxor Homes</div>
          <div className="text-navy-400 text-xs">Society App</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/')) || (href !== '/dashboard' && pathname === href)
                ? 'bg-gold-500 text-white'
                : 'text-navy-200 hover:bg-navy-700 hover:text-white'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-navy-700 p-3">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-navy-700 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {session?.user.name?.[0] ?? '?'}
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-white text-xs font-medium truncate">{session?.user.name}</div>
            <div className="text-navy-400 text-xs capitalize">{session?.user.role?.toLowerCase()}</div>
          </div>
          <ChevronDown className="w-3 h-3 text-navy-400" />
        </button>
        {open && (
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-navy-700 text-sm"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        )}
      </div>
    </aside>
  )
}
