import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

const API_BASE = process.env.API_URL || 'https://luxor-homes-api-production.up.railway.app'

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: credentials.email, password: credentials.password }),
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
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role         = (user as unknown as { role: string }).role
        token.backendToken = (user as unknown as { backendToken: string }).backendToken
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id            = token.sub as string
        session.user.role          = token.role as string
        session.user.backendToken  = token.backendToken as string
      }
      return session
    },
  },
  pages: { signIn: '/login' },
})
