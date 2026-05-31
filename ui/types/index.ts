import 'next-auth'

declare module 'next-auth' {
  interface Session {
    backendToken: string
    user: {
      id: string
      name: string
      email: string
      role: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    backendToken: string
  }
}
