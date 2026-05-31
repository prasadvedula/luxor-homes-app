import Link from 'next/link'
import { Building2, Users, Vote, Wrench, ShieldCheck } from 'lucide-react'

const features = [
  {
    icon: Users,
    title: 'Resident Directory',
    desc: 'Manage flat owners, emergency contacts, and vehicle registrations for all 70 flats.',
  },
  {
    icon: Vote,
    title: 'Society Elections',
    desc: 'Conduct annual elections — nominations, voting, and transparent results.',
  },
  {
    icon: Wrench,
    title: 'Maintenance Tracking',
    desc: 'Report and track issues across lifts, gym, parking, and play area.',
  },
  {
    icon: ShieldCheck,
    title: 'Visitor Management',
    desc: 'Security logs visitors; residents approve or deny entry in real time.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-navy-800">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-navy-700">
        <div className="flex items-center gap-3">
          <Building2 className="w-8 h-8 text-gold-500" />
          <span className="text-white text-xl font-bold tracking-wide">Luxor Homes</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="text-white border border-white/30 px-5 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm font-medium">
            Sign In
          </Link>
          <Link href="/register" className="bg-gold-500 text-white px-5 py-2 rounded-lg hover:bg-gold-600 transition-colors text-sm font-medium">
            Register
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="text-center py-24 px-4">
        <div className="inline-flex items-center gap-2 bg-gold-500/20 text-gold-300 text-sm px-4 py-1.5 rounded-full mb-6">
          <Building2 className="w-4 h-4" /> 5 Floors · 70 Flats
        </div>
        <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
          Your Society,<br />
          <span className="text-gold-400">Managed Beautifully</span>
        </h1>
        <p className="text-navy-100 text-lg max-w-xl mx-auto mb-10">
          One platform for resident info, elections, maintenance, and visitor management — built for Luxor Homes.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/register" className="bg-gold-500 text-white px-8 py-3 rounded-lg hover:bg-gold-600 transition-colors font-semibold text-base">
            Join as Resident
          </Link>
          <Link href="/login" className="text-white border border-white/40 px-8 py-3 rounded-lg hover:bg-white/10 transition-colors font-semibold text-base">
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((f) => (
          <div key={f.title} className="bg-navy-700/50 border border-navy-600 rounded-xl p-6 hover:border-gold-500/40 transition-colors">
            <div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center mb-4">
              <f.icon className="w-5 h-5 text-gold-400" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">{f.title}</h3>
            <p className="text-navy-200 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="text-center text-navy-400 text-sm pb-8">
        © {new Date().getFullYear()} Luxor Homes Residents&apos; Society
      </footer>
    </div>
  )
}
