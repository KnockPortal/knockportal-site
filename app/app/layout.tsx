import type { Metadata } from 'next'

// The workspace is not a marketing surface: keep it out of search indexes.
export const metadata: Metadata = {
  title: 'KnockPortal workspace',
  robots: { index: false, follow: false },
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
