import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'
import { prisma } from './prisma'

let _app: App | null = null

function getApp(): App | null {
  if (_app) return _app
  if (getApps().length > 0) { _app = getApps()[0]; return _app }

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64
  if (!b64) return null

  try {
    const raw = Buffer.from(b64, 'base64').toString('utf-8')
    _app = initializeApp({ credential: cert(JSON.parse(raw)) })
    return _app
  } catch (err) {
    console.error('[FCM] Init failed:', err)
    return null
  }
}

// Gate pass: DATA-ONLY message so LuxorMessagingService creates the full-screen alert.
// Regular notification messages are handled by the Firebase SDK in background and
// cannot trigger full-screen intents — only data messages reach onMessageReceived.
export async function sendGatePassPush(
  userId: string,
  title: string,
  body: string,
  visitorId: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { fcmToken: true } })
  if (!user?.fcmToken) return

  const app = getApp()
  if (!app) { console.log('[FCM] Not configured — skipping gate pass push'); return }

  try {
    await getMessaging(app).send({
      token: user.fcmToken,
      // NO notification field — data-only so our custom service handles it
      data: { type: 'gate_pass', title, body, visitorId },
      android: { priority: 'high' },
    })
    console.log(`[FCM] Gate pass push → ${user.fcmToken.slice(0, 20)}…`)
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code
    if (code === 'messaging/registration-token-not-registered') {
      await prisma.user.updateMany({ where: { fcmToken: user.fcmToken }, data: { fcmToken: null } })
    }
    console.error('[FCM] Gate pass push failed:', code ?? err)
  }
}

// General push (payment reminders etc.) — standard notification message
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>,
) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { fcmToken: true } })
  if (!user?.fcmToken) return
  await sendPush(user.fcmToken, title, body, data)
}

export async function sendPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
) {
  const app = getApp()
  if (!app) { console.log(`[FCM] Not configured — skipping push: "${title}"`); return }

  try {
    await getMessaging(app).send({
      token,
      notification: { title, body },
      ...(data && { data }),
      android: {
        priority: 'high',
        notification: {
          channelId: 'gate-alerts',
          sound: 'chime',
          priority: 'max',
          color: '#C9A84C',
          vibrateTimingsMillis: [0, 400, 200, 400],
        },
      },
    })
    console.log(`[FCM] Sent "${title}" → ${token.slice(0, 20)}…`)
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code
    if (code === 'messaging/registration-token-not-registered') {
      await prisma.user.updateMany({ where: { fcmToken: token }, data: { fcmToken: null } })
    }
    console.error('[FCM] Failed:', code ?? err)
  }
}
