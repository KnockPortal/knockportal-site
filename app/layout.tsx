import type { Metadata } from 'next'
import { display, body, mono } from './fonts'
import './globals.css'
import { StickyHeader } from '@/components/layout/StickyHeader'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'KnockPortal — where San Francisco roofing permits are clustering',
  description:
    'KnockPortal reads San Francisco building-permit records daily and shows where roofing work is clustering — the streets being re-roofed right now, and the houses on those blocks that are not.',
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
      <body className="bg-ink text-hail font-sans antialiased">
        <StickyHeader />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
