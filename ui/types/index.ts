import 'next-auth'

declare module 'next-auth' {
  interface User {
    role: string
    backendToken: string
  }

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
