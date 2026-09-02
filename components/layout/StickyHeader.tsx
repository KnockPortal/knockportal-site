'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabaseBrowser } from '@/lib/supabase-browser'

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
]

const AUTH_HREF = '/app'
const SIGNED_OUT_LABEL = 'Sign in'
const SIGNED_IN_LABEL = 'Workspace'

export function StickyHeader() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hasSession, setHasSession] = useState(false)

  // The slot starts signed-out and flips once a session is found: the header
  // renders long before auth resolves, and there is no third state to show.
  // Same browser client the workspace already uses — no second token store.
  useEffect(() => {
    let supabase
    try {
      supabase = supabaseBrowser()
    } catch {
      // Public env missing: the header still has to render the rest of the site.
      return
    }
    let alive = true
    void supabase.auth.getSession().then(({ data }) => {
      if (alive) setHasSession(Boolean(data.session))
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session))
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const authLabel = hasSession ? SIGNED_IN_LABEL : SIGNED_OUT_LABEL

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

            {/* Auth slot */}
            <Link
              href={AUTH_HREF}
              className={cn(
                'rounded border px-3 py-1.5 transition-colors duration-150 focus-visible:outline-orange focus-visible:outline-2 focus-visible:rounded-sm',
                isActive(AUTH_HREF)
                  ? 'border-orange text-orange'
                  : 'border-hairline text-hail hover:border-orange hover:text-orange'
              )}
            >
              {authLabel}
            </Link>
          </nav>

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

            {/* Auth slot */}
            <Link
              href={AUTH_HREF}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'py-2 text-sm transition-colors duration-150',
                isActive(AUTH_HREF) ? 'text-orange' : 'text-hail'
              )}
            >
              {authLabel}
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
