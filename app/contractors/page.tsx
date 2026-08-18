import Link from 'next/link'
import { DottedBg } from '@/components/sections/DottedBg'
import { TelemetryBar } from '@/components/sections/TelemetryBar'
import { RegistryConsole } from '@/components/sections/RegistryConsole'
import { CounterStrip } from '@/components/sections/CounterStrip'
import { Section } from '@/components/layout/Section'
import { FaqAccordion } from '@/components/sections/FaqAccordion'

const FAQ_ITEMS = [
  {
    question: 'Where does the data come from?',
    answer: 'Public building-permit records, pulled and cleaned daily.',
  },
  {
    question: 'Which trades and areas are covered?',
    answer:
      'Live now: roofing and solar in San Francisco. More trades and metros are rolling out — tell us where you work.',
  },
  {
    question: 'Do you sell my info or shared leads?',
    answer: 'No. KnockPortal is a flat subscription. We never resell you as a lead.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes. Monthly plans cancel anytime.',
  },
  {
    question: "What's the difference between $99 and $149?",
    answer:
      '$149 adds your profile to our private homeowner dispatch. $99 is the registry only.',
  },
]

export default function ContractorsPage() {
  return (
    <>
      {/* ── Block 1: Dispatch hero ── */}
      <DottedBg>
        <TelemetryBar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <p className="font-mono text-[11px] text-muted tracking-widest mb-6">
                <span className="text-orange">●</span> FOR CONTRACTORS
              </p>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl text-hail leading-[1.0] mb-6">
                The permit lands. You see the whole street.
              </h1>
              <p className="text-hail/80 text-lg leading-relaxed mb-8 max-w-lg">
                Every morning, KnockPortal emails you the fresh permits in your trade and market —
                full address, issued date, ZIP. While your competitors buy recycled leads,
                you&apos;re already at the door.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center px-6 py-3 bg-orange text-ink font-semibold rounded hover:bg-[#E85D10] transition-colors duration-150 focus-visible:outline-orange focus-visible:outline-2"
              >
                See plans — from $99/mo
              </Link>
            </div>
            <div>
              <RegistryConsole />
            </div>
          </div>
        </div>
        <CounterStrip />
      </DottedBg>

      {/* ── Block 2: Comparison table ── */}
      <Section elevated>
        <h2 className="font-display text-4xl sm:text-5xl text-hail mb-10">
          A permit is not a lead. It&apos;s better.
        </h2>
        <div className="overflow-x-auto rounded-lg border border-hairline">
          <div className="bg-slate min-w-[560px]">
            <div className="grid grid-cols-[180px_1fr_1fr] border-b border-hairline">
              <div className="px-5 py-4" />
              <div className="px-5 py-4 border-l border-hairline">
                <span className="text-muted text-sm">Shared leads (Angi / Thumbtack)</span>
              </div>
              <div className="px-5 py-4 border-l border-hairline">
                <span className="text-orange font-medium text-sm">KnockPortal permits</span>
              </div>
            </div>
            {[
              ['EXCLUSIVITY', 'Sold to 3–5 contractors', 'The permit is public; you act first'],
              ['INTENT', '"Maybe interested"', 'Budget approved, job filed'],
              ['COST', '$300–600/mo, per-lead', 'Flat from $99/mo, unlimited'],
              ['CHANNEL', 'Their platform', 'Your own knock / mail'],
            ].map(([label, shared, kp]) => (
              <div key={label} className="grid grid-cols-[180px_1fr_1fr] border-b border-hairline last:border-0">
                <div className="px-5 py-4">
                  <span className="font-mono text-muted text-[10px] uppercase tracking-widest">{label}</span>
                </div>
                <div className="px-5 py-4 border-l border-hairline">
                  <span className="text-hail/70 text-sm">{shared}</span>
                </div>
                <div className="px-5 py-4 border-l border-hairline">
                  <span className="text-hail text-sm">{kp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Block 3: What you get ── */}
      <Section>
        <h2 className="font-display text-3xl sm:text-4xl text-hail mb-8">What you get</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-slate border border-hairline rounded-lg p-7">
            <h3 className="text-hail font-semibold text-xl mb-1">
              Registry{' '}
              <span className="text-orange font-mono text-base font-medium">$99/mo</span>
            </h3>
            <p className="text-muted text-sm leading-relaxed">
              Daily email of fresh permits in your category and metro. Full address and issued date on
              every line.
            </p>
          </div>
          <div className="bg-slate border border-hairline rounded-lg p-7">
            <h3 className="text-hail font-semibold text-xl mb-1">
              Registry + Presence{' '}
              <span className="text-orange font-mono text-base font-medium">$149/mo</span>
            </h3>
            <p className="text-muted text-sm leading-relaxed">
              Everything in Registry, plus your contractor profile in our private dispatch to
              homeowners searching in your category and metro.
            </p>
          </div>
        </div>
        <div className="border-l-2 border-orange pl-4 mb-8">
          <p className="text-muted text-sm leading-relaxed">
            <strong className="text-hail">On Presence:</strong> we actively bring homeowners onto the
            platform; volume grows as we launch. Your profile is ready to be seen from day one.
          </p>
        </div>
        <Link
          href="/pricing"
          className="inline-flex items-center px-5 py-2.5 border border-hail/60 text-hail text-sm font-medium rounded hover:bg-hail/10 transition-colors duration-150"
        >
          Compare plans →
        </Link>
      </Section>

      {/* ── Block 4: The math ── */}
      <Section elevated>
        <h2 className="font-display text-4xl sm:text-5xl text-hail mb-6">
          One won job pays for years.
        </h2>
        <p className="text-hail/80 text-lg leading-relaxed max-w-2xl">
          A typical San Francisco re-roof permit runs{' '}
          <strong className="font-mono text-hail">$12,000–$41,000</strong> in work (median around{' '}
          <strong className="font-mono text-hail">$21,000</strong>); solar installs run higher. At
          $99/mo, a single won job covers more than a year of KnockPortal. The registry pays for
          itself on job one.
        </p>
      </Section>

      {/* ── Block 5: Live coverage ── */}
      <Section>
        <h2 className="font-display text-4xl sm:text-5xl text-hail mb-6">
          Live now in San Francisco.
        </h2>
        <p className="text-hail/80 text-lg leading-relaxed max-w-2xl">
          We&apos;re live for roofing and solar in San Francisco, with daily fresh permits. More
          categories and metros are rolling out — if your trade isn&apos;t live yet,{' '}
          <Link href="/contact" className="text-orange underline underline-offset-2 hover:text-orange/80">
            tell us
          </Link>
          , and we&apos;ll notify you the moment it is.
        </p>
      </Section>

      {/* ── Block 6: How activation works ── */}
      <Section elevated>
        <h2 className="font-display text-3xl sm:text-4xl text-hail mb-10">
          How activation works
        </h2>
        <div className="divide-y divide-hairline border-t border-hairline">
          {[
            { num: '01', text: 'Subscribe and pay securely through Stripe.', highlight: true },
            {
              num: '02',
              text: 'We email you a link to set up your account — pick your category and metro.',
              highlight: false,
            },
            { num: '03', text: 'Your daily registry starts the next morning.', highlight: false },
            {
              num: '04',
              text: 'Build your profile card — it goes into our homeowner dispatch.',
              highlight: false,
              suffix: '$149 plan',
            },
          ].map(({ num, text, highlight, suffix }) => (
            <div key={num} className="flex items-start gap-8 py-5">
              <span
                className={`font-mono text-2xl shrink-0 ${highlight ? 'text-orange' : 'text-muted'}`}
              >
                {num}
              </span>
              <span className="text-hail text-base">
                {text}{' '}
                {suffix && <span className="text-muted text-sm">({suffix})</span>}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Block 7: FAQ ── */}
      <Section>
        <h2 className="font-display text-3xl sm:text-4xl text-hail mb-8">Questions</h2>
        <FaqAccordion items={FAQ_ITEMS} />
      </Section>

      {/* ── Block 8: Final CTA ── */}
      <Section elevated>
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl text-hail mb-8">
            Be the first knock, not the fifth call.
          </h2>
          <Link
            href="/pricing"
            className="inline-flex items-center px-8 py-4 bg-orange text-ink font-semibold text-base rounded hover:bg-[#E85D10] transition-colors duration-150 focus-visible:outline-orange focus-visible:outline-2"
          >
            See plans — from $99/mo
          </Link>
        </div>
      </Section>
    </>
  )
}
