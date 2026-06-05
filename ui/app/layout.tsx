import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from './session-provider'

export const metadata: Metadata = {
  title: 'Luxor Homes — Residents Society',
  description: 'Premium apartment society management for Luxor Homes',
  icons: { icon: '/luxor-icon.png', apple: '/luxor-icon.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
