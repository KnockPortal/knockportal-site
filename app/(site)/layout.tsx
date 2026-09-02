import type { Metadata } from 'next'
import { display, body, mono } from '../fonts'
import '../globals.css'
import { StickyHeader } from '@/components/layout/StickyHeader'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'KnockPortal — where San Francisco roofing permits are clustering',
  description:
    'KnockPortal reads San Francisco building-permit records and shows where roofing work is clustering — the streets being re-roofed right now, and the houses on those blocks that are not.',
  icons: {
    icon: [
      { url: '/logo/logo-favicon-adaptive.svg', type: 'image/svg+xml' },
      { url: '/logo/logo-favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/logo/logo-app-icon-512.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      {/* Sticky footer: body is a full-height column, main takes the slack. A short
          page pushes the footer to the bottom edge; a long one lets it follow the
          content. `grow` keeps main's flex-basis at auto, so long pages are never
          compressed. Nothing here is tied to the header's height — it stays sticky
          as a flex item, and may change height freely. */}
      <body className="bg-ink text-hail font-sans antialiased min-h-dvh flex flex-col">
        <StickyHeader />
        <main className="grow">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
