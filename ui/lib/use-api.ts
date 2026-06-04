'use client'
import { useSession } from 'next-auth/react'
import { useMemo } from 'react'
import { makeClientApi } from './api-client'

export function useApi() {
  const { data: session } = useSession()
  const token = session?.user?.backendToken ?? null
  return useMemo(() => makeClientApi(token), [token])
}
