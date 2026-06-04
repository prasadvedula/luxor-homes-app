import type { NextAuthConfig } from 'next-auth'

// Edge-compatible config — no Node.js APIs, no Credentials provider fetch
// Used by middleware only
export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [],
  callbacks: {
    authorized({ auth }) {
      return !!auth
    },
    async jwt({ token, user }) {
      if (user) {
        token.role         = user.role
        token.backendToken = user.backendToken
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id           = token.sub as string
        session.user.role         = token.role as string
        session.user.backendToken = token.backendToken as string
      }
      return session
    },
  },
}
