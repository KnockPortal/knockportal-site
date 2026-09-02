import { Section } from '@/components/layout/Section'

export default function AboutPage() {
  return (
    <Section className="min-h-[60vh]">
      <div className="max-w-2xl">
        <h1 className="font-display text-5xl sm:text-6xl text-hail mb-6">About KnockPortal</h1>

        <p className="text-hail text-lg leading-relaxed mb-4">
          KnockPortal turns a city’s public building-permit records into a decision about
          where to send mail. Direct mail is not the hard part — deciding which streets are
          worth the postage is. A roofing permit means that job is already sold, but it also
          marks a block where roofs tend to be of the same generation and where the
          neighbours can see the work from their own windows. KnockPortal finds those blocks
          and lists the houses on them that have no qualifying roofing permit in the
          available public record.
        </p>

        <p className="text-muted text-base leading-relaxed">
          What it does not do: it does not sell leads, does not introduce homeowners to
          contractors, and does not promise calls or work. The permit record is a signal
          about a block, not a statement about any household. A house with no permit found
          may still have had work done — roofs get replaced without a permit, before the
          digital record starts, or filed under another category.
        </p>

        <h2 className="font-display text-2xl text-hail mt-10 mb-4">Who runs it</h2>

        <p className="text-muted text-base leading-relaxed">
          KnockPortal is operated by Abalon Construction Management LLC, a company registered
          in North Carolina. It is built and run by one person — the same person who answers
          your email. There is no sales team, which is why the answer comes from someone who
          knows how the data is put together.
        </p>

        <h2 className="font-display text-2xl text-hail mt-10 mb-4">Where it works today</h2>

        <p className="text-muted text-base leading-relaxed">
          San Francisco, roofing. That is one city and one trade, and it is the whole of it
          right now — other cities and trades are not available yet. A city goes live when
          its permit records can be read reliably and roofing work in them can be recognised
          accurately enough to stand behind. That takes calibration against real records, not
          a switch. If you want a city or a trade that is not here, the map’s own form is
          where to say so.
        </p>

        <h2 className="font-display text-2xl text-hail mt-10 mb-4">Contact</h2>

        {/* The same card the retired /contact page carried, moved here whole:
            the address of the company is a fact about the company, and this is
            the page about the company. */}
        <div className="bg-slate border border-hairline rounded-lg p-6 space-y-4">
          <div>
            <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-1">Email</p>
            <p className="text-hail">
              <a
                href="mailto:info@knockportal.com"
                className="text-hail hover:text-orange transition-colors duration-150"
              >
                info@knockportal.com
              </a>
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-1">Operated by</p>
            <p className="text-hail">Abalon Construction Management LLC</p>
          </div>
          <div>
            <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-1">Address</p>
            <p className="text-hail">4030 Wake Forest Rd, Ste 349, Raleigh, NC 27609</p>
          </div>
        </div>

        <p className="text-muted text-base leading-relaxed mt-6">
          Questions, corrections, or anything the site does not answer — write, and a person
          will read it.
        </p>
      </div>
    </Section>
  )
}
