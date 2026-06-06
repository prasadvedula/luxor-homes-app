import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth
  const user = session?.user

  // Public routes — no auth needed
  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/debug')

  if (isPublic) return

  // Require login for all app routes
  if (!session) {
    return Response.redirect(new URL('/login', req.url))
  }

  // /change-password is accessible to any logged-in user
  if (pathname.startsWith('/change-password')) return

  // Force password change before accessing anything else
  if (user?.mustChangePassword) {
    return Response.redirect(new URL('/change-password', req.url))
  }

  // Security officers can only access /visitors
  if (user?.role === 'SECURITY' && !pathname.startsWith('/visitors')) {
    return Response.redirect(new URL('/visitors', req.url))
  }

  // Accounts managers can only access /accounts
  if (user?.role === 'ACCOUNTS' && !pathname.startsWith('/accounts')) {
    return Response.redirect(new URL('/accounts', req.url))
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
