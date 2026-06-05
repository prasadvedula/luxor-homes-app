import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from './auth.config'

const API_BASE = process.env.API_URL || 'https://luxor-homes-api-production.up.railway.app'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        phone:    { label: 'Mobile',   type: 'tel' },
        email:    { label: 'Email',    type: 'email' },   // kept for admin fallback
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if ((!credentials?.phone && !credentials?.email) || !credentials?.password) return null

        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: credentials.phone, email: credentials.email, password: credentials.password }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Login failed')
        }

        const data = await res.json()
        return { ...data.user, backendToken: data.token }
      },
    }),
  ],
})
