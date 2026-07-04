import { Section } from '@/components/layout/Section'

export default function AboutPage() {
  return (
    <Section className="min-h-[60vh]">
      <div className="max-w-2xl">
        <h1 className="font-display text-5xl sm:text-6xl text-hail mb-6">About KnockPortal</h1>
        <p className="text-hail text-lg leading-relaxed mb-4">
          KnockPortal is operated by <strong>Abalon Construction Management LLC</strong>, a licensed
          North Carolina company based in Raleigh.
        </p>
        <p className="text-muted text-base leading-relaxed mb-4">
          We built KnockPortal because we know how contracting works. Public building-permit records
          are the clearest signal of real, approved, budget-confirmed work — and most contractors
          never see them. We pull those records daily and put them in your inbox.
        </p>
        <p className="text-muted text-base leading-relaxed mb-8">
          Currently live in San Francisco for roofing and solar. Expanding trade categories and
          metros as we grow.
        </p>
        <p className="font-mono text-muted text-xs">
          4030 Wake Forest Rd, Ste 349, Raleigh, NC 27609
        </p>
      </div>
    </Section>
  )
}
