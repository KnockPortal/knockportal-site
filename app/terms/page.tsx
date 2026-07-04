import { Section } from '@/components/layout/Section'

export default function TermsPage() {
  return (
    <Section className="min-h-[60vh]">
      <div className="max-w-2xl">
        <h1 className="font-display text-5xl text-hail mb-4">Terms of Service</h1>
        <p className="font-mono text-muted text-xs mb-8">Under legal review — final text from attorney before publication.</p>
        <div className="prose prose-invert prose-sm text-muted space-y-4 leading-relaxed">
          <p>
            KnockPortal is an informational service providing access to public building-permit data.
            We do not guarantee the quality, accuracy, or outcome of work performed by any contractor.
          </p>
          <p>
            Contractor profiles are self-submitted. The accuracy of profile information is the
            responsibility of the contractor. KnockPortal performs basic moderation but does not
            verify licenses, insurance, or claims made by contractors.
          </p>
          <p>
            Homeowners initiate contact with contractors directly. KnockPortal is not a party to any
            agreement between a homeowner and a contractor.
          </p>
          <p>
            This service is in early development and coverage is expanding. We may modify or
            discontinue features with reasonable notice.
          </p>
          <p>
            Operated by Abalon Construction Management LLC, 4030 Wake Forest Rd, Ste 349, Raleigh,
            NC 27609.
          </p>
        </div>
      </div>
    </Section>
  )
}
