import { Section } from '@/components/layout/Section'

export default function TermsPage() {
  return (
    <Section className="min-h-[60vh]">
      <div className="max-w-2xl">
        <h1 className="font-display text-5xl text-hail mb-4">Terms of Service</h1>
        <p className="font-mono text-muted text-xs mb-8">Last updated 2 September 2026.</p>
        <div className="prose prose-invert prose-sm text-muted space-y-4 leading-relaxed">
          <p>
            <strong className="text-hail">What KnockPortal is.</strong> KnockPortal processes
            public building-permit records so that a licensed contractor can decide where to
            direct their own marketing. You are the one who decides, and you are the one who
            sends.
          </p>
          <p>
            <strong className="text-hail">What it is not.</strong> KnockPortal does not sell
            leads, does not introduce homeowners to contractors, and does not promise work,
            calls or results. It does not assign territories: every subscriber sees the same
            city and picks their own blocks. An issued permit means the work at that address
            has already been sold; it indicates activity around that address, not the needs
            of any household.
          </p>
          <p>
            <strong className="text-hail">About the data.</strong> Permit records come from
            the city and may be incomplete, delayed or inaccurate. A house shown as having no
            qualifying permit may still have had work done — the record is what is publicly
            available, not the history of the roof. Coverage of the public record is stated
            on the map itself. You are responsible for how you use the information, and for
            checking anything you intend to rely on.
          </p>
          <p>
            <strong className="text-hail">Subscription.</strong> Access to the paid actions
            is sold by combination of city and trade, at the monthly price shown before you
            subscribe, billed monthly through Stripe until cancelled. Downloading a list and
            sending a mailing are the paid actions; browsing the map, opening blocks and
            collecting addresses stay free and need no account. You can cancel at any time
            from your workspace; the subscription then runs to the end of the period already
            paid for and does not renew. We do not refund a period that has already started;
            cancelling stops the next charge, and your access runs to the end of the period
            you have paid for.
          </p>
          <p>
            <strong className="text-hail">Mailing.</strong> Where the product prepares an
            addressed list, you are the sender of anything that goes out. You remain
            responsible for complying with the law that applies to you, including the
            licence-disclosure requirements that apply to contractor advertising in your
            state. Printing and delivery are not part of the service today.
          </p>
          <p>
            <strong className="text-hail">Acceptable use.</strong> Do not resell or
            redistribute the addressed lists as a product of your own, do not present
            KnockPortal’s data as a statement about a particular household, and do not make
            claims on our behalf. We may end access for use that breaks this or the law.
          </p>
          <p>
            <strong className="text-hail">Availability.</strong> This service is in early
            development. Features may change or be withdrawn with reasonable notice, and the
            data pipeline depends on city records that can change without notice to us.
          </p>
          <p>
            <strong className="text-hail">Liability.</strong> The service is provided as is.
            To the extent the law allows, KnockPortal is not liable for lost business, lost
            profit, or the cost of marketing that did not work.
          </p>
          <p>
            <strong className="text-hail">Changes.</strong> We may update these terms. The
            date above says when they last changed, and material changes will be announced to
            subscribers by email before they take effect.
          </p>
          <p>
            <strong className="text-hail">Governing law.</strong> These terms are governed by
            the law of the State of North Carolina.
          </p>
          <p>
            Operated by Abalon Construction Management LLC, 4030 Wake Forest Rd, Ste 349,
            Raleigh, NC 27609. Questions: info@knockportal.com.
          </p>
        </div>
      </div>
    </Section>
  )
}
