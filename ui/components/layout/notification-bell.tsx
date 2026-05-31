'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Bell, Check, X, Clock, ChevronRight } from 'lucide-react'
import { useApi } from '@/lib/use-api'
import { format } from 'date-fns'

type Visitor = {
  id: string; name: string; phone: string; purpose: string
  flatToVisit: string; createdAt: string; status: string
}

function requestBrowserPermission() {
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

function pushBrowserNotification(visitor: Visitor) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  new Notification('🔔 Visitor at the Gate', {
    body: `${visitor.name} is at the gate and wants to visit Flat ${visitor.flatToVisit}.\nPurpose: ${visitor.purpose}`,
    icon: '/favicon.ico',
    tag: visitor.id,
  })
}

export function NotificationBell() {
  const { data: session } = useSession()
  const api = useApi()
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [open, setOpen] = useState(false)
  const [ringing, setRinging] = useState(false)
  const [toasts, setToasts] = useState<Visitor[]>([])
  const seenIds = useRef<Set<string>>(new Set())
  const panelRef = useRef<HTMLDivElement>(null)

  const canApprove = session?.user.role === 'RESIDENT' || session?.user.role === 'ADMIN'

  const fetchPending = useCallback(async () => {
    try {
      const res = await api('/visitors')
      if (!res.ok) return
      const data: Visitor[] = await res.json()
      const pending = data.filter(v => v.status === 'PENDING')

      const newOnes = pending.filter(v => !seenIds.current.has(v.id))
      if (newOnes.length > 0) {
        newOnes.forEach(v => {
          seenIds.current.add(v.id)
          pushBrowserNotification(v)
          setToasts(prev => [...prev, v])
          setTimeout(() => setToasts(prev => prev.filter(t => t.id !== v.id)), 8000)
        })
        setRinging(true)
        setTimeout(() => setRinging(false), 700)
      } else {
        pending.forEach(v => seenIds.current.add(v.id))
      }
      setVisitors(pending)
    } catch { /* ignore network errors */ }
  }, [api])

  useEffect(() => {
    requestBrowserPermission()
    fetchPending()
    const id = setInterval(fetchPending, 20000)
    return () => clearInterval(id)
  }, [fetchPending])

  // Close panel on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function act(id: string, action: 'APPROVED' | 'REJECTED') {
    await api(`/visitors/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) })
    setVisitors(prev => prev.filter(v => v.id !== id))
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  if (!canApprove) return null

  return (
    <>
      {/* Bell button */}
      <div ref={panelRef} className="relative">
        <button
          onClick={() => setOpen(v => !v)}
          className="relative p-2.5 rounded-xl transition-all duration-200"
          style={{ background: open ? 'rgba(201,168,76,0.12)' : 'transparent' }}
        >
          <Bell
            className={`w-5 h-5 transition-colors ${ringing ? 'bell-ring' : ''}`}
            style={{ color: visitors.length > 0 ? '#E8C55A' : '#4A5E7A' }}
          />
          {visitors.length > 0 && (
            <>
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold z-10"
                style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C55A)', color: '#050D1A' }}>
                {visitors.length}
              </span>
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full ping-once"
                style={{ background: 'rgba(201,168,76,0.5)' }} />
            </>
          )}
        </button>

        {/* Dropdown panel */}
        {open && (
          <div className="absolute right-0 top-12 w-80 glass-gold rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
              <div>
                <p className="text-white font-semibold text-sm">Visitor Requests</p>
                <p className="text-xs mt-0.5" style={{ color: '#7B8FAD' }}>
                  {visitors.length === 0 ? 'No pending approvals' : `${visitors.length} awaiting your approval`}
                </p>
              </div>
              {visitors.length > 0 && (
                <span className="badge badge-yellow">{visitors.length} pending</span>
              )}
            </div>

            {visitors.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 mx-auto mb-3" style={{ color: '#3A4E6A' }} />
                <p className="text-sm" style={{ color: '#4A5E7A' }}>All clear — no visitors waiting</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {visitors.map(v => (
                  <div key={v.id} className="px-5 py-4 border-b last:border-0 transition-colors hover:bg-white/5"
                    style={{ borderColor: 'rgba(201,168,76,0.08)' }}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                        style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.25)' }}>
                        {v.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm">{v.name}</p>
                        <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: '#7B8FAD' }}>
                          <span className="font-medium" style={{ color: '#C9A84C' }}>{v.purpose}</span>
                          · Flat {v.flatToVisit}
                        </p>
                        <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: '#4A5E7A' }}>
                          <Clock className="w-3 h-3" />
                          {format(new Date(v.createdAt), 'hh:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => act(v.id, 'APPROVED')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
                        style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.22)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.12)')}>
                        <Check className="w-3.5 h-3.5" /> Allow Entry
                      </button>
                      <button onClick={() => act(v.id, 'REJECTED')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
                        style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.22)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}>
                        <X className="w-3.5 h-3.5" /> Deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="px-5 py-3 border-t" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
              <a href="/visitors" className="flex items-center justify-center gap-1 text-xs font-medium" style={{ color: '#C9A84C' }}
                onClick={() => setOpen(false)}>
                View full visitor log <ChevronRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(v => (
          <div key={v.id} className="toast pointer-events-auto">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-sm"
                style={{ background: 'linear-gradient(135deg,rgba(201,168,76,0.3),rgba(232,197,90,0.2))', color: '#E8C55A', border: '1px solid rgba(201,168,76,0.4)' }}>
                {v.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">Visitor at the gate!</p>
                <p className="text-sm mt-0.5" style={{ color: '#7B8FAD' }}>
                  <span className="text-white">{v.name}</span> · {v.purpose} · Flat {v.flatToVisit}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => act(v.id, 'APPROVED')}
                className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>
                ✓ Allow Entry
              </button>
              <button onClick={() => act(v.id, 'REJECTED')}
                className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                ✗ Deny
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
