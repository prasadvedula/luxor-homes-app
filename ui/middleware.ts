import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Redirect authenticated users away from landing/auth pages
    if (token && (pathname === '/' || pathname === '/login' || pathname === '/register')) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const { pathname } = req.nextUrl
        // These paths are always public
        if (
          pathname === '/' ||
          pathname.startsWith('/login') ||
          pathname.startsWith('/register') ||
          pathname.startsWith('/api/auth')
        ) {
          return true
        }
        return !!token
      },
    },
    pages: { signIn: '/login' },
  }
)

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
