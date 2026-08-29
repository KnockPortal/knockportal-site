import { Section } from '@/components/layout/Section'

export default function PrivacyPage() {
  return (
    <Section className="min-h-[60vh]">
      <div className="max-w-2xl">
        <h1 className="font-display text-5xl text-hail mb-4">Privacy Policy</h1>
        <p className="font-mono text-muted text-xs mb-8">Under legal review — final text from attorney before publication.</p>
        <div className="prose prose-invert prose-sm text-muted space-y-4 leading-relaxed">
          <p>
            <strong className="text-hail">What we collect:</strong> your email address when you sign
            in, and what you do inside your workspace.
          </p>
          <p>
            <strong className="text-hail">What we do not collect:</strong> we do not collect
            information from homeowners, and we do not offer a service to homeowners.
          </p>
          <p>
            <strong className="text-hail">Permit information:</strong> the permit records shown on
            this site come from the public records of the City and County of San Francisco. We
            process and display them; we do not add private information to them.
          </p>
          <p>
            <strong className="text-hail">Sharing:</strong> we do not sell personal information and
            we do not pass email addresses to third parties for their own marketing. We use service
            providers to host the site, deliver email and process payments; they act on our
            instructions.
          </p>
          <p>
            <strong className="text-hail">Retention and deletion:</strong> you may request deletion
            of your data at any time by emailing knockportal@gmail.com.
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
