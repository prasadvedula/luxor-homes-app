'use client'
import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useApi } from '@/lib/use-api'

type RawNotification = { id: string; title: string; body: string }

export function NotificationPoller() {
  const { data: session } = useSession()
  const api = useApi()
  const seenIds = useRef(new Set<string>())
  const channelCreated = useRef(false)

  useEffect(() => {
    if (session?.user?.role !== 'RESIDENT') return

    async function setupChannel() {
      if (channelCreated.current) return
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications')
        await LocalNotifications.requestPermissions()
        await LocalNotifications.createChannel({
          id: 'payment-reminders',
          name: 'Payment Reminders',
          description: 'Maintenance payment reminders from admin',
          importance: 5,
          sound: 'chime.wav',
          vibration: true,
        })
        channelCreated.current = true
      } catch { /* web or permissions denied — silent */ }
    }
    setupChannel()

    const poll = async () => {
      try {
        const res = await api('/notifications/pending')
        if (!res.ok) return
        const { notifications }: { notifications: RawNotification[] } = await res.json()

        const fresh = notifications.filter(n => !seenIds.current.has(n.id))
        if (fresh.length === 0) return

        fresh.forEach(n => seenIds.current.add(n.id))
        await api('/notifications/ack', { method: 'POST', body: JSON.stringify({ ids: fresh.map(n => n.id) }) })

        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications')
          await LocalNotifications.schedule({
            notifications: fresh.map((n, i) => ({
              id: Math.abs((Date.now() + i) % 2147483647),
              channelId: 'payment-reminders',
              title: n.title,
              body: n.body,
              sound: 'chime.wav',
              smallIcon: 'ic_stat_icon_config_sample',
              iconColor: '#C9A84C',
            })),
          })
        } catch { /* web fallback — no-op */ }
      } catch { /* network error — silent */ }
    }

    const timer = setInterval(poll, 8000)
    return () => clearInterval(timer)
  }, [session?.user?.role, api])

  return null
}
