import Link from 'next/link'
import { DottedBg } from '@/components/sections/DottedBg'
import { Section } from '@/components/layout/Section'

export default function HomePage() {
  return (
    <DottedBg>
      <Section>
        <div className="max-w-2xl">
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl text-hail leading-[1.0] mb-6">
            KnockPortal
          </h1>
          <p className="text-hail/80 text-lg leading-relaxed mb-8">
            A marketing workspace for licensed residential contractors, built on public
            building-permit records.
          </p>
          <Link
            href="/sf"
            className="inline-flex items-center justify-center px-6 py-3 bg-orange text-ink font-semibold rounded hover:bg-[#E85D10] transition-colors duration-150 focus-visible:outline-orange focus-visible:outline-2"
          >
            Open the San Francisco roofing map
          </Link>
          <p className="text-muted text-xs mt-12">
            Operated by Abalon Construction Management LLC.
          </p>
        </div>
      </Section>
    </DottedBg>
  )
}
