import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from './session-provider'
import { auth } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Luxor Homes — Residents Society',
  description: 'Premium apartment society management for Luxor Homes',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
