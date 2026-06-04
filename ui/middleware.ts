import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  if (session && (pathname === '/' || pathname === '/login' || pathname === '/register')) {
    return Response.redirect(new URL('/dashboard', req.url))
  }

  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/debug')

  if (!isPublic && !session) {
    return Response.redirect(new URL('/login', req.url))
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
