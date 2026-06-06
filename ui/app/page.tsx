import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Building2, Users, Vote, Wrench, ShieldCheck, Star, ArrowRight } from 'lucide-react'

const features = [
  { icon: Users, title: 'Resident Directory', desc: 'Complete profiles for all 70 flats — emergency contacts, vehicles, and owner details in one place.' },
  { icon: Vote, title: 'Society Elections', desc: 'Transparent annual elections with nominations, one-vote-per-flat system, and live results.' },
  { icon: Wrench, title: 'Maintenance Tracking', desc: 'Report and resolve issues across lifts, gymnasium, parking, and play area instantly.' },
  { icon: ShieldCheck, title: 'Visitor Management', desc: 'Security logs visitors, residents approve entries in real time with full audit trail.' },
]

export default async function LandingPage() {
  const session = await auth()
  if (session?.user) {
    const role = session.user.role as string | undefined
    if (role === 'SECURITY')  redirect('/visitors')
    if (role === 'ACCOUNTS')  redirect('/accounts')
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg,#050D1A 0%,#081422 50%,#0B1628 100%)' }}>

      {/* Subtle grid overlay */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(201,168,76,0.04) 1px, transparent 0)',
        backgroundSize: '40px 40px',
      }} />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: 'rgba(201,168,76,0.12)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C55A)' }}>
            <Building2 className="w-5 h-5 text-midnight-900" style={{ color: '#050D1A' }} />
          </div>
          <div>
            <div className="text-white font-display font-bold text-lg leading-none">Luxor Homes</div>
            <div className="text-xs mt-0.5" style={{ color: '#7B8FAD' }}>Residents Society</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost text-sm py-2 px-5">Sign In</Link>
          <Link href="/register" className="btn-gold text-sm py-2 px-5">Register</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 text-center py-28 px-4">
        {/* Gold glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(201,168,76,0.08) 0%, transparent 70%)' }} />

        <div className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full mb-8 border" style={{ background: 'rgba(201,168,76,0.08)', borderColor: 'rgba(201,168,76,0.25)', color: '#E8C55A' }}>
          <Star className="w-3 h-3 fill-current" />
          Premium Society Management Platform
        </div>

        <h1 className="font-display text-6xl font-bold text-white mb-5 leading-[1.1] relative">
          Where Luxury Meets<br />
          <span className="gold-text">Community Living</span>
        </h1>
        <p className="text-lg max-w-xl mx-auto mb-10 leading-relaxed" style={{ color: '#7B8FAD' }}>
          A unified platform for Luxor Homes — managing 70 residences across 5 floors with elegance and efficiency.
        </p>

        <div className="flex gap-4 justify-center items-center flex-wrap">
          <Link href="/register" className="btn-gold px-8 py-3 text-base">
            Join as Resident <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/login" className="btn-ghost px-8 py-3 text-base">Sign In</Link>
        </div>

        {/* Stats row */}
        <div className="flex justify-center gap-12 mt-16">
          {[['70', 'Residences'], ['5', 'Floors'], ['3', 'User Roles']].map(([n, l]) => (
            <div key={l} className="text-center">
              <div className="font-display text-3xl font-bold gold-text">{n}</div>
              <div className="text-xs mt-1" style={{ color: '#7B8FAD' }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-28">
        <div className="text-center mb-12">
          <p className="lux-label mb-3">Platform Features</p>
          <h2 className="font-display text-3xl font-bold text-white">Everything your society needs</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {features.map((f) => (
            <div key={f.title} className="glass p-7 group">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110" style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.2)' }}>
                <f.icon className="w-5 h-5" style={{ color: '#C9A84C' }} />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#7B8FAD' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 text-center pb-10 border-t py-8" style={{ borderColor: 'rgba(201,168,76,0.1)', color: '#4A5E7A', fontSize: '0.8rem' }}>
        © {new Date().getFullYear()} Luxor Homes Residents&apos; Society · All rights reserved
      </footer>
    </div>
  )
}
