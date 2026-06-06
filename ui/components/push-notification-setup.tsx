'use client'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useApi } from '@/lib/use-api'

export function PushNotificationSetup() {
  const { data: session } = useSession()
  const api = useApi()

  useEffect(() => {
    if (!session?.user) return

    async function register() {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications')

        const perm = await PushNotifications.checkPermissions()
        const granted = perm.receive === 'granted'
          ? perm
          : await PushNotifications.requestPermissions()
        if (granted.receive !== 'granted') return

        await PushNotifications.register()

        // Send token to backend once received
        await PushNotifications.addListener('registration', async ({ value: token }) => {
          try {
            await api('/auth/fcm-token', { method: 'POST', body: JSON.stringify({ token }) })
          } catch { /* ignore */ }
        })

        // Tapping a notification while app is in background/closed
        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const route = action.notification.data?.route
          if (route && typeof window !== 'undefined') {
            window.location.href = route
          }
        })
      } catch {
        // Not running inside Capacitor (web browser) — skip silently
      }
    }

    register()
  }, [session?.user?.id]) // re-register if user changes

  return null
}
