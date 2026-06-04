'use client'
import { useSession } from 'next-auth/react'
import { useMemo } from 'react'
import { makeClientApi } from './api-client'

// Stub returned when session is still loading — returns empty array so
// components don't crash calling .map() on an error object from a 401.
// When the real token arrives, useMemo recreates the function and
// the page's useEffect re-fires with auth.
const emptyApi = (_path: string, _options?: RequestInit) =>
  Promise.resolve(new Response('[]', {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }))

export function useApi() {
  const { data: session } = useSession()
  const token = (session as { backendToken?: string } | null)?.backendToken ?? null
  return useMemo(() => token ? makeClientApi(token) : emptyApi, [token])
}
