'use client'
import { signOut, useSession } from 'next-auth/react'
import { useMemo } from 'react'
import { makeClientApi } from './api-client'

const emptyApi = (_path: string, _options?: RequestInit) =>
  Promise.resolve(new Response('[]', {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }))

export function useApi() {
  const { data: session } = useSession()
  const token = session?.user?.backendToken ?? null

  return useMemo(() => {
    if (!token) return emptyApi

    const base = makeClientApi(token)

    // Wrap every call: if the API rejects with 401 the session/token is stale
    // — sign out immediately so the user can log back in cleanly.
    return async function guardedApi(path: string, options?: RequestInit) {
      const res = await base(path, options)
      if (res.status === 401) {
        await signOut({ callbackUrl: '/login' })
      }
      return res
    }
  }, [token])
}
