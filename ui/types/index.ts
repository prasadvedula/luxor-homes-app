import 'next-auth'

declare module 'next-auth' {
  interface User {
    role: string
    backendToken: string
    isPrimaryResident: boolean
  }

  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: string
      backendToken: string
      isPrimaryResident: boolean
    }
  }

  interface JWT {
    role: string
    backendToken: string
    isPrimaryResident: boolean
  }
}
