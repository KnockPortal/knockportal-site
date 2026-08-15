import Link from 'next/link'
import { ClipboardCheck, Megaphone, FileCheck } from 'lucide-react'
import { DottedBg } from '@/components/sections/DottedBg'
import { TelemetryBar } from '@/components/sections/TelemetryBar'
import { RegistryConsole } from '@/components/sections/RegistryConsole'
import { CounterStrip } from '@/components/sections/CounterStrip'
import { Section } from '@/components/layout/Section'
import { SAMPLE_PERMITS } from '@/lib/permit-data'

export default function HomePage() {
  return (
    <>
      {/* ── Block 1: Dispatch hero ── */}
      <DottedBg>
        <TelemetryBar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left copy */}
            <div>
              <p className="font-mono text-[11px] text-muted tracking-widest mb-6">
                <span className="text-orange">●</span> PERMIT INTELLIGENCE — SAN FRANCISCO
              </p>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl text-hail leading-[1.0] mb-6">
                Fresh local permits. Before your competitors knock.
              </h1>
              <p className="text-hail/80 text-lg leading-relaxed mb-8 max-w-lg">
                KnockPortal turns public building-permit data into a daily list of fresh jobs in your
                area — full address, job value, issued date. Be the first contractor at the door.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center px-6 py-3 bg-orange text-ink font-semibold rounded hover:bg-[#E85D10] transition-colors duration-150 focus-visible:outline-orange focus-visible:outline-2"
                >
                  See plans — from $99/mo
                </Link>
                <Link
                  href="/request"
                  className="inline-flex items-center justify-center px-6 py-3 border border-hail/60 text-hail rounded hover:bg-hail/10 transition-colors duration-150 focus-visible:outline-orange focus-visible:outline-2"
                >
                  I&apos;m a homeowner — find a contractor
                </Link>
              </div>
              <p className="font-mono text-[11px] text-muted">
                Live in San Francisco: roofing and solar · more categories rolling out
              </p>
            </div>

            {/* Right: live console */}
            <div>
              <RegistryConsole />
            </div>
          </div>
        </div>
        <CounterStrip />
      </DottedBg>

      {/* ── Block 2: The problem ── */}
      <Section elevated>
        <h2 className="font-display text-4xl sm:text-5xl text-hail mb-12">
          Leads you buy are sold five times.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            {
              icon: <ClipboardCheck size={22} className="text-muted" />,
              bold: 'Shared lead services sell the same homeowner to 3–5 contractors.',
              rest: '',
            },
            {
              icon: <Megaphone size={22} className="text-muted" />,
              bold: 'Word-of-mouth is unpredictable.',
              rest: " Ads you can't dial in.",
            },
            {
              icon: <FileCheck size={22} className="text-muted" />,
              bold: 'A permit means the budget is approved',
              rest: ' and the job is real.',
            },
          ].map(({ icon, bold, rest }, i) => (
            <div key={i}>
              <div className="mb-4">{icon}</div>
              <p className="text-hail text-base leading-relaxed">
                <strong>{bold}</strong>
                {rest}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Block 3: Registry teaser ── */}
      <Section>
        <p className="font-mono text-[11px] text-muted uppercase tracking-widest mb-4">
          San Francisco · recent issued permits
        </p>
        <h2 className="font-display text-3xl sm:text-4xl text-hail mb-8">
          A sample of recent San Francisco permits. Subscribers get the full addresses, daily.
        </h2>

        <div className="overflow-x-auto rounded-lg border border-hairline mb-6">
          <div className="bg-slate font-mono text-xs min-w-[640px]">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_160px_100px_100px] gap-x-4 px-5 py-3 border-b border-hairline">
              {['Address (Masked)', 'ZIP', 'Job Value', 'Issued'].map((h) => (
                <span key={h} className="text-muted uppercase tracking-widest text-[10px]">{h}</span>
              ))}
            </div>
            {/* Data rows */}
            {SAMPLE_PERMITS.map((permit, i) => (
              <div key={i} className="grid grid-cols-[1fr_160px_100px_100px] gap-x-4 px-5 py-3 border-b border-hairline last:border-0">
                <span className="text-hail">{permit.address}</span>
                <span className="text-hail">{permit.zip}</span>
                <span className="text-orange">{permit.value}</span>
                <span className="text-muted">{permit.issued}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-muted text-sm mb-4">
          Subscribers get the full address and value on every permit, every morning.
        </p>
        <Link
          href="/pricing"
          className="text-orange hover:text-orange/80 transition-colors duration-150 text-sm font-medium"
        >
          Unlock the full registry →
        </Link>
      </Section>

      {/* ── Block 4: Two ways ── */}
      <Section elevated>
        <h2 className="font-display text-3xl sm:text-4xl text-hail mb-8">
          Two ways to use KnockPortal
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate border border-hairline rounded-lg p-7">
            <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-5">
              For Contractors
            </p>
            <p className="text-hail text-base leading-relaxed mb-6">
              Get the daily registry. Knock first. Optionally, get your profile in front of homeowners
              who are looking.
            </p>
            <Link
              href="/pricing"
              className="text-hail font-medium text-sm hover:text-orange transition-colors duration-150"
            >
              See plans →
            </Link>
          </div>
          <div className="bg-slate border border-hairline rounded-lg p-7">
            <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-5">
              For Homeowners
            </p>
            <p className="text-hail text-base leading-relaxed mb-6">
              Looking for a contractor you can trust? Tell us what you need — we&apos;ll send you a short
              list of contractors in your area. Free.
            </p>
            <Link
              href="/request"
              className="text-hail font-medium text-sm hover:text-orange transition-colors duration-150"
            >
              Submit a request →
            </Link>
          </div>
        </div>
      </Section>

      {/* ── Block 5: How it works ── */}
      <Section>
        <h2 className="font-display text-3xl sm:text-4xl text-hail mb-10">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            'We pull fresh permits daily from public records.',
            'You get them by email every morning — address, value, date.',
            'You knock before anyone else does.',
          ].map((text, i) => (
            <div key={i} className={`pt-5 border-t-2 ${i === 0 ? 'border-orange' : 'border-hairline'}`}>
              <p className="font-mono text-muted text-2xl mb-4">0{i + 1}</p>
              <p className="text-hail text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link
            href="/how-it-works"
            className="text-hail font-medium text-sm hover:text-orange transition-colors duration-150"
          >
            See how it works in detail →
          </Link>
        </div>
      </Section>

      {/* ── Block 6: Trust strip ── */}
      <Section elevated>
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-hail text-base leading-relaxed mb-3">
            KnockPortal is operated by{' '}
            <strong>Abalon Construction Management LLC</strong>, registered in North Carolina.
          </p>
          <p className="text-hail text-base leading-relaxed mb-4">
            Built around legal contact channels — public records and your own outreach. We don&apos;t
            sell shared leads.
          </p>
          <p className="font-mono text-muted text-xs">
            New service, expanding coverage. Currently live in San Francisco for roofing and solar.
          </p>
        </div>
      </Section>

      {/* ── Block 7: Final CTA ── */}
      <Section>
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl text-hail mb-8">
            Stop chasing leads. Start knocking on real jobs.
          </h2>
          <Link
            href="/pricing"
            className="inline-flex items-center px-8 py-4 bg-orange text-ink font-semibold text-base rounded hover:bg-[#E85D10] transition-colors duration-150 mb-5 focus-visible:outline-orange focus-visible:outline-2"
          >
            See plans — from $99/mo
          </Link>
          <div>
            <Link
              href="/request"
              className="text-muted text-sm underline underline-offset-2 hover:text-hail transition-colors duration-150"
            >
              Or submit a homeowner request →
            </Link>
          </div>
        </div>
      </Section>
    </>
  )
}
