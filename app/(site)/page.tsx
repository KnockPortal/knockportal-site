import Link from 'next/link'
import { DottedBg } from '@/components/sections/DottedBg'
import { Section } from '@/components/layout/Section'
import { CombinationSelector } from '@/components/home/CombinationSelector'

// Working copy for the "function before wording" stage. Held as string literals
// rather than JSX text so the source carries them byte for byte: JSX would fold
// line breaks and force entities for the apostrophes.
const H1 = 'Pick a city and a trade'
const SUB = 'The live permit map opens — free to browse, no account needed.'

const BLOCKS = [
  {
    heading: 'Where the data comes from',
    text: "KnockPortal reads the City of San Francisco's public building-permit records and refreshes daily. Every permit shown on the map links to its own record on the city's portal — check any line you like. A house marked open means no qualifying roofing permit was found in eight years of available public records. No permit found does not mean that roofing work was never performed. Results reflect the available public permit history.",
    link: null,
  },
  {
    heading: 'What KnockPortal does not do',
    text: 'KnockPortal does not sell leads and does not promise them. It does not assign territories: every contractor sees the same city and picks their own blocks. The map is not gated — browsing and selecting are free, without an account. A subscription is for taking the result out: the addressed list you act on.',
    link: null,
  },
  {
    heading: 'Who runs this',
    text: 'KnockPortal is operated by Abalon Construction Management LLC, registered in North Carolina. 4030 Wake Forest Rd, Ste 349, Raleigh, NC 27609.',
    link: { label: 'About the company', href: '/about' },
  },
  {
    heading: 'Talk to a human',
    text: 'Questions, corrections, or a city you want next — write to a person.',
    link: { label: 'Contact', href: '/contact' },
  },
] as const

export default function HomePage() {
  return (
    <>
      <DottedBg>
        <Section>
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl leading-[1.05] text-hail sm:text-5xl lg:text-6xl">
              {H1}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-hail/80">{SUB}</p>
            <CombinationSelector className="mt-10" />
          </div>
        </Section>
      </DottedBg>

      <Section className="border-t border-hairline">
        <div className="grid max-w-5xl gap-6 md:grid-cols-2">
          {BLOCKS.map((block) => (
            <article
              key={block.heading}
              className="rounded border border-hairline bg-slate p-6"
            >
              <h2 className="font-display text-xl font-semibold text-hail">
                {block.heading}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-hail/80">{block.text}</p>
              {block.link && (
                <Link
                  href={block.link.href}
                  className="mt-4 inline-block text-sm text-hail underline decoration-muted underline-offset-4 transition-colors duration-150 hover:decoration-orange focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-orange"
                >
                  {block.link.label}
                </Link>
              )}
            </article>
          ))}
        </div>
      </Section>
    </>
  )
}
