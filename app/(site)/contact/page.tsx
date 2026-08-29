import { Section } from '@/components/layout/Section'

export default function ContactPage() {
  return (
    <Section className="min-h-[60vh]">
      <div className="max-w-lg">
        <h1 className="font-display text-5xl sm:text-6xl text-hail mb-6">Contact</h1>
        <p className="text-muted text-base leading-relaxed mb-8">
          Questions about KnockPortal — reach us at:
        </p>
        <div className="bg-slate border border-hairline rounded-lg p-6 space-y-4">
          <div>
            <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-1">Email</p>
            <p className="text-hail">knockportal@gmail.com</p>
          </div>
          <div>
            <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-1">Address</p>
            <p className="text-hail">4030 Wake Forest Rd, Ste 349, Raleigh, NC 27609</p>
          </div>
          <div>
            <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-1">Operated by</p>
            <p className="text-hail">Abalon Construction Management LLC</p>
          </div>
        </div>
      </div>
    </Section>
  )
}
