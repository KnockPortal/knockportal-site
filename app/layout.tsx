import type { Metadata } from 'next'
import { display, body, mono } from './fonts'
import './globals.css'
import { StickyHeader } from '@/components/layout/StickyHeader'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'KnockPortal — Fresh local permits before your competitors',
  description:
    'KnockPortal turns public building-permit data into a daily list of fresh jobs in your area — full address, job value, issued date. Be the first contractor at the door.',
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
