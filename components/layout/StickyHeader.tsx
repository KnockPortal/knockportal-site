'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'For contractors', href: '/contractors' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Coverage', href: '/coverage' },
]

export function StickyHeader() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <header className="sticky top-0 z-50 bg-ink border-b border-hairline">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-6">
          {/* Logo */}
          <Link href="/" className="shrink-0 flex items-center focus-visible:outline-orange focus-visible:outline-2 focus-visible:rounded-sm">
            <Image
              src="/logo/logo-lockup-color-on-dark-outlined.svg"
              alt="KnockPortal"
              width={154}
              height={32}
              className="h-8 w-auto"
              priority
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'transition-colors duration-150 focus-visible:outline-orange focus-visible:outline-2 focus-visible:rounded-sm',
                  isActive(link.href) ? 'text-orange' : 'text-hail hover:text-orange'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-end gap-3 shrink-0">
            <div className="flex flex-col items-end gap-0.5">
              <Link
                href="/request"
                className="inline-flex items-center px-4 py-2 border border-hail/60 text-hail text-sm font-medium rounded hover:bg-hail/10 transition-colors duration-150 focus-visible:outline-orange focus-visible:outline-2"
              >
                Submit a request
              </Link>
              <span className="text-muted text-[11px]">For homeowners — find a contractor</span>
            </div>
            <Link
              href="/pricing"
              className="inline-flex items-center px-4 py-2 bg-orange text-ink text-sm font-semibold rounded hover:bg-[#E85D10] transition-colors duration-150 focus-visible:outline-orange focus-visible:outline-2 whitespace-nowrap"
            >
              Subscribe — from $99/mo
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-hail p-1 rounded focus-visible:outline-orange focus-visible:outline-2"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-ink border-t border-hairline px-4 pb-4">
          <nav className="flex flex-col gap-1 pt-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'py-2 text-sm transition-colors duration-150',
                  isActive(link.href) ? 'text-orange' : 'text-hail'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-2 mt-4">
            <Link
              href="/request"
              onClick={() => setMobileOpen(false)}
              className="w-full text-center py-2.5 border border-hail/60 text-hail text-sm font-medium rounded"
            >
              Submit a request
            </Link>
            <Link
              href="/pricing"
              onClick={() => setMobileOpen(false)}
              className="w-full text-center py-2.5 bg-orange text-ink text-sm font-semibold rounded"
            >
              Subscribe — from $99/mo
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
