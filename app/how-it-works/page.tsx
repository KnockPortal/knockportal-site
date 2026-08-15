import Link from 'next/link'
import { Section } from '@/components/layout/Section'

const CONTRACTOR_STEPS = [
  {
    num: '01',
    title: 'Subscribe.',
    text: 'Pick your plan and pay securely through Stripe.',
  },
  {
    num: '02',
    title: 'Activate.',
    text: 'We email you a link to set up your account — pick your trade and metro.',
  },
  {
    num: '03',
    title: 'Receive.',
    text: 'Every morning, fresh permits land in your inbox: full street address, job value, issued date, ZIP.',
  },
  {
    num: '04',
    title: 'Knock.',
    text: 'The permit is public — you just see it first. Knock, mail, or call on your own terms.',
  },
]

const INBOX_ITEMS = [
  'Full street address of every fresh permit',
  'Job value and issued date',
  'Neighborhood and ZIP, so you can plan your route',
  'Your trade only — roofing or solar, no noise',
]

const HOMEOWNER_STEPS = [
  {
    num: '01',
    text: 'Tell us what you need — trade, area, a few words about the job.',
  },
  {
    num: '02',
    text: 'We email you a short list of contractors working in your area. Free.',
  },
  {
    num: '03',
    text: 'You reach out to whoever you like, on your terms. Your email is never shared with anyone.',
  },
]

export default function HowItWorksPage() {
  return (
    <>
      {/* ── Hero ── */}
      <Section>
        <div className="max-w-3xl">
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl text-hail leading-[1.0] mb-6">
            How it works
          </h1>
          <p className="text-hail/80 text-lg leading-relaxed">
            From public record to your inbox — every morning.
          </p>
        </div>
      </Section>

      {/* ── For contractors ── */}
      <Section elevated>
        <h2 className="font-display text-3xl sm:text-4xl text-hail mb-10">For contractors</h2>
        <div className="divide-y divide-hairline border-t border-hairline">
          {CONTRACTOR_STEPS.map(({ num, title, text }, i) => (
            <div key={num} className="flex items-start gap-8 py-5">
              <span
                className={`font-mono text-2xl shrink-0 ${i === 0 ? 'text-orange' : 'text-muted'}`}
              >
                {num}
              </span>
              <span className="text-hail text-base leading-relaxed">
                <strong className="text-hail">{title}</strong> {text}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Where the data comes from ── */}
      <Section>
        <h2 className="font-display text-3xl sm:text-4xl text-hail mb-6">
          Where the data comes from
        </h2>
        <p className="text-hail/80 text-lg leading-relaxed max-w-2xl">
          Every permit we send comes from official public building-permit records. We pull them
          daily, filter them to your trade, and send only what&apos;s fresh. No scraping gray
          sources, no recycled lead lists — public records, verified daily.
        </p>
      </Section>

      {/* ── What lands in your inbox ── */}
      <Section elevated>
        <h2 className="font-display text-3xl sm:text-4xl text-hail mb-8">
          What lands in your inbox
        </h2>
        <ul className="space-y-4 max-w-2xl mb-6">
          {INBOX_ITEMS.map((item) => (
            <li key={item} className="flex items-start gap-3 text-hail text-base leading-relaxed">
              <span className="text-orange mt-1 shrink-0 font-mono text-sm">▸</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="text-muted text-sm">
          Delivered by 6:00 AM PT, every day there are fresh permits.
        </p>
      </Section>

      {/* ── For homeowners ── */}
      <Section>
        <h2 className="font-display text-3xl sm:text-4xl text-hail mb-10">For homeowners</h2>
        <div className="divide-y divide-hairline border-t border-hairline">
          {HOMEOWNER_STEPS.map(({ num, text }, i) => (
            <div key={num} className="flex items-start gap-8 py-5">
              <span
                className={`font-mono text-2xl shrink-0 ${i === 0 ? 'text-orange' : 'text-muted'}`}
              >
                {num}
              </span>
              <span className="text-hail text-base leading-relaxed">{text}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Final CTA ── */}
      <Section elevated>
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl text-hail mb-8">
            See it in your inbox tomorrow morning.
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
              I&apos;m a homeowner — find a contractor →
            </Link>
          </div>
        </div>
      </Section>
    </>
  )
}
