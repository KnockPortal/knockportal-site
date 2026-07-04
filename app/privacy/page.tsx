import { Section } from '@/components/layout/Section'

export default function PrivacyPage() {
  return (
    <Section className="min-h-[60vh]">
      <div className="max-w-2xl">
        <h1 className="font-display text-5xl text-hail mb-4">Privacy Policy</h1>
        <p className="font-mono text-muted text-xs mb-8">Under legal review — final text from attorney before publication.</p>
        <div className="prose prose-invert prose-sm text-muted space-y-4 leading-relaxed">
          <p>
            <strong className="text-hail">What we collect:</strong> email address, trade category,
            optional job description (homeowners); company name, contact details, trade categories,
            service areas (contractors).
          </p>
          <p>
            <strong className="text-hail">How we use it:</strong> to deliver the permit registry to
            contractors and to send homeowners a list of contractors in their category and area.
          </p>
          <p>
            <strong className="text-hail">What we do not do:</strong> we do not sell, share, or
            transfer homeowner email addresses to any third party, including contractors. Homeowners
            initiate contact with contractors themselves.
          </p>
          <p>
            <strong className="text-hail">Retention and deletion:</strong> you may request deletion
            of your data at any time by emailing knockportal@gmail.com.
          </p>
          <p>
            <strong className="text-hail">CAN-SPAM:</strong> each email we send includes our
            physical address and a working unsubscribe mechanism.
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
