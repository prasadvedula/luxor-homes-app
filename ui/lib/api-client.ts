import { auth } from './auth'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// ── Server-side (Server Components, Route Handlers) ─────────────────────────
export async function serverApi(path: string, options: RequestInit = {}) {
  const session = await auth()
  const token = (session as { backendToken?: string } | null)?.backendToken

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
  })
}

// ── Client-side helper (pass token from useSession()) ───────────────────────
export function makeClientApi(token: string | null | undefined) {
  return async function clientApi(path: string, options: RequestInit = {}) {
    return fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string> | undefined),
      },
    })
  }
}
