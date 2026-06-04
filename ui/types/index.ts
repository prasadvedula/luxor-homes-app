import 'next-auth'

declare module 'next-auth' {
  interface User {
    role: string
    backendToken: string
  }

  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: string
      backendToken: string
    }
  }

  interface JWT {
    role: string
    backendToken: string
  }
}
