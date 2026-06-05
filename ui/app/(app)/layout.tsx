import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="flex min-h-screen" style={{ background: '#050D1A' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-auto">
          {/* pt-16 on mobile for top header, pb-20 for bottom nav; desktop unchanged */}
          <div className="max-w-5xl mx-auto px-4 lg:px-8 py-4 lg:py-8 pt-20 lg:pt-8 pb-24 lg:pb-8 animate-fade-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
