import { Section } from '@/components/layout/Section'

export default function TermsPage() {
  return (
    <Section className="min-h-[60vh]">
      <div className="max-w-2xl">
        <h1 className="font-display text-5xl text-hail mb-4">Terms of Service</h1>
        <p className="font-mono text-muted text-xs mb-8">Under legal review — final text from attorney before publication.</p>
        <div className="prose prose-invert prose-sm text-muted space-y-4 leading-relaxed">
          <p>
            KnockPortal provides access to processed public building-permit records so that a
            licensed contractor can decide where to direct their own marketing.
          </p>
          <p>
            KnockPortal does not introduce homeowners to contractors, does not sell leads, and does
            not promise work, calls or results. An issued permit means the work at that address has
            already been sold; it indicates activity in the surrounding area, not the needs of any
            household.
          </p>
          <p>
            Permit records come from the City and may be incomplete, delayed or inaccurate. The
            absence of a permit does not mean that no work was performed. You are responsible for
            how you use the information.
          </p>
          <p>
            If you use KnockPortal to plan a mailing, you are the sender. You remain responsible for
            complying with the law that applies to you, including licence-disclosure requirements in
            advertising.
          </p>
          <p>
            This service is in early development. We may modify or discontinue features with
            reasonable notice.
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
