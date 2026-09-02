import Link from 'next/link'
import Image from 'next/image'

export function Footer() {
  return (
    <footer className="bg-ink border-t border-hairline">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          {/* Logo + tagline */}
          <div className="md:col-span-1">
            <Link href="/">
              <Image
                src="/logo/logo-lockup-color-on-dark-outlined.svg"
                alt="KnockPortal"
                width={135}
                height={28}
                className="h-7 w-auto mb-3"
              />
            </Link>
            <p className="text-hail font-semibold text-sm">Know before you knock.</p>
          </div>

          {/* Company */}
          <div>
            <p className="text-muted font-mono text-xs uppercase tracking-widest mb-4">Company</p>
            <ul className="space-y-2.5 text-sm text-hail/80">
              <li><Link href="/about" className="hover:text-hail transition-colors duration-150">About</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-muted font-mono text-xs uppercase tracking-widest mb-4">Legal</p>
            <ul className="space-y-2.5 text-sm text-hail/80">
              <li><Link href="/terms" className="hover:text-hail transition-colors duration-150">Terms</Link></li>
              <li><Link href="/privacy" className="hover:text-hail transition-colors duration-150">Privacy</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-hairline pt-6 flex flex-col sm:flex-row justify-between gap-2 text-xs text-muted">
          <span>KnockPortal is operated by Abalon Construction Management LLC.</span>
          <span>4030 Wake Forest Rd, Ste 349, Raleigh, NC 27609</span>
        </div>
      </div>
    </footer>
  )
}
