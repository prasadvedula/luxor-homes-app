'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export function ProgressBar() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 600)
    return () => clearTimeout(t)
  }, [pathname])

  if (!visible) return null
  return <div className="progress-bar" />
}
