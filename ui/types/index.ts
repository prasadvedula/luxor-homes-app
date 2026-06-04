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

  interface JWT {
    role: string
    backendToken: string
  }
}
