'use client'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useApi } from '@/lib/use-api'

export function PushNotificationSetup() {
  const { data: session } = useSession()
  const api = useApi()

  useEffect(() => {
    if (!session?.user) return

    let removeListeners: (() => void) | undefined

    async function register() {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications')

        // Listeners MUST be added before register() — the 'registration' event
        // can fire synchronously before register() returns on some Android versions.
        const [regHandle, errHandle, tapHandle] = await Promise.all([
          PushNotifications.addListener('registration', async ({ value: token }) => {
            console.log('[FCM] Token received, saving…')
            try {
              const res = await api('/auth/fcm-token', { method: 'POST', body: JSON.stringify({ token }) })
              if (res.ok) console.log('[FCM] Token saved to backend')
              else console.error('[FCM] Backend rejected token:', await res.text())
            } catch (err) {
              console.error('[FCM] Token save failed:', err)
            }
          }),
          PushNotifications.addListener('registrationError', (err) => {
            console.error('[FCM] Registration error:', JSON.stringify(err))
          }),
          PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            const route = action.notification.data?.route
            if (route && typeof window !== 'undefined') {
              window.location.href = route
            }
          }),
        ])

        removeListeners = () => {
          regHandle.remove()
          errHandle.remove()
          tapHandle.remove()
        }

        const perm = await PushNotifications.checkPermissions()
        const status = perm.receive === 'granted' ? perm : await PushNotifications.requestPermissions()
        if (status.receive !== 'granted') {
          console.warn('[FCM] Notification permission denied')
          return
        }

        await PushNotifications.register()
        console.log('[FCM] register() called')
      } catch (err) {
        // Running in web browser or Capacitor not available — expected, not an error
        console.log('[FCM] Not available in this environment:', err)
      }
    }

    register()
    return () => removeListeners?.()
  }, [session?.user?.id, api]) // api in deps so we use the real API, not emptyApi

  return null
}
