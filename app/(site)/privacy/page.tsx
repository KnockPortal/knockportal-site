import { Section } from '@/components/layout/Section'

export default function PrivacyPage() {
  return (
    <Section className="min-h-[60vh]">
      <div className="max-w-2xl">
        <h1 className="font-display text-5xl text-hail mb-4">Privacy Policy</h1>
        <p className="font-mono text-muted text-xs mb-8">Last updated 2 September 2026.</p>
        <div className="prose prose-invert prose-sm text-muted space-y-4 leading-relaxed">
          <p>
            <strong className="text-hail">What we collect.</strong> Your email address when
            you sign in, and what you do inside your workspace: the blocks you save, the
            addresses you collect into a mailing, and the subscription you hold. If you ask
            us for a city or a trade that is not open yet, we keep the email address you give
            on that form, together with the city and trade you asked for, so we can tell you
            when it opens. That is the only thing that form is used for. If you write to us,
            we keep the correspondence.
          </p>
          <p>
            <strong className="text-hail">What we do not collect.</strong> We do not collect
            information from homeowners and do not offer a service to homeowners. We do not
            buy personal data, and we do not add private information to the public permit
            record.
          </p>
          <p>
            <strong className="text-hail">Cookies and browser storage.</strong> Two cookies,
            both necessary. A sign-in cookie keeps you signed in. A second cookie, kp_anon,
            is set the first time you collect addresses without an account: it is what makes
            the draft yours before you sign in, it holds a random identifier and nothing
            else, it is not readable by scripts, and it lasts 180 days. When you sign in, the
            draft moves to your workspace. Separately, if you save a selection before signing
            in, the selection is held in your browser’s own storage for that tab alone and is
            erased the moment your workspace has read it. There is no advertising or
            analytics tracking on this site.
          </p>
          <p>
            <strong className="text-hail">Permit information.</strong> The permit records
            shown here come from the public records of the City and County of San Francisco.
            We process and display them; the addresses in them are public record, not
            information collected from the people who live there.
          </p>
          <p>
            <strong className="text-hail">Payments.</strong> Card details are handled by
            Stripe and never reach our servers. We store the identifiers Stripe gives us for
            you and for your subscription, and the subscription’s current state, so the site
            knows what you have access to.
          </p>
          <p>
            <strong className="text-hail">Service providers.</strong> We use providers to run
            the site and its parts: hosting and delivery, the database, payment processing,
            transactional email, and map rendering. They act on our instructions and only for
            those purposes.
          </p>
          <p>
            <strong className="text-hail">Sharing.</strong> We do not sell personal
            information and we do not pass email addresses to anyone for their own marketing.
          </p>
          <p>
            <strong className="text-hail">Retention and deletion.</strong> You may ask for
            your data to be deleted at any time by writing to info@knockportal.com. We remove
            the workspace and its saved work; records we are required to keep for accounting
            stay for as long as the law requires.
          </p>
          <p>
            <strong className="text-hail">Where we are.</strong> The company is in the United
            States and the service is operated from there.
          </p>
          <p>
            Operated by Abalon Construction Management LLC, 4030 Wake Forest Rd, Ste 349,
            Raleigh, NC 27609.
          </p>
        </div>
      </div>
    </Section>
  )
}
