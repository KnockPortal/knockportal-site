import Link from 'next/link'
import { DottedBg } from '@/components/sections/DottedBg'
import { Section } from '@/components/layout/Section'
import { CombinationSelector } from '@/components/home/CombinationSelector'

// Working copy for the "function before wording" stage. Held as string literals
// rather than JSX text so the source carries them byte for byte: JSX would fold
// line breaks and force entities for the apostrophes.
const H1 = 'Pick a city and a trade'
const SUB = 'The live permit map opens — free to browse, no account needed.'

const CYCLE_HEADING = 'How KnockPortal works'
const CYCLE_INTRO =
  'The hard part of direct mail is not sending a postcard — it is deciding where to send it. Building permits are public, and they show where work is already happening. KnockPortal turns that activity into an addressed list you can act on, and shows you the rule it used.'

/**
 * The seven steps of the cycle, in order. The order is the argument the section
 * makes, so it lives in one place and is read out of here by name below.
 */
const CYCLE_STEPS = [
  {
    heading: 'Look',
    text: 'The whole city: every permit in the window, the blocks where work is clustering, and the houses on those blocks with no permit of their own. Free, no account.',
  },
  {
    heading: 'Pick',
    text: 'Blocks, buildings and addresses — your own choice, or a draft KnockPortal builds by a rule it shows you. You change it and approve it; nothing is assigned to you. Your pick is kept between visits.',
  },
  {
    heading: 'Set up',
    text: 'The postcard: logo, return address, contacts, text, licence number where the law asks for it. Addresses follow the postal rules. Quantity and cost are on screen.',
  },
  {
    heading: 'Approve',
    text: 'One screen holds the artwork, the addresses, the quantity and the full price. Nothing is printed before you approve it.',
  },
  {
    heading: 'Send',
    text: 'Printing and mail go out through a vendor, and the order keeps a status you can check.',
  },
  {
    heading: 'Remember',
    text: 'History stays on the address: when it was mailed, when it was walked, what you excluded. It feeds the next pick.',
  },
  {
    heading: 'Repeat',
    text: 'The map moves every day, the history adds up, and the subscription buys the cycle rather than access to the data.',
  },
] as const

const [LOOK, PICK, SET_UP, APPROVE, SEND, REMEMBER, REPEAT] = CYCLE_STEPS

const CYCLE_DOORS =
  'The same pick has a second output: a list and a walking route for a door-knocking crew.'
const CYCLE_STATUS =
  'Live today in San Francisco · Roofing: the map, the pick, saved selections and the list you take out. Setting up a postcard, approving it, sending it and the history are not built yet.'

const PRICING_HEADING = 'What is free and what you pay for'
const PRICING_LINES = [
  'Looking, picking and building a mailing are free, and none of it needs an account.',
  'A subscription covers acting on it: sending the mailing and taking the addressed list out. You are asked to subscribe at the moment you send — not before.',
  'One subscription covers one city and one trade.',
] as const

const SECTION_HEADING = 'font-display text-2xl font-semibold text-hail'
const STEP_CARD = 'rounded border border-hairline bg-slate p-5'
const STEP_HEADING = 'font-display text-base font-semibold text-hail'
const STEP_TEXT = 'mt-2 text-sm leading-relaxed text-hail/80'
const BODY_LINE = 'text-sm leading-relaxed text-hail/80'

const BLOCKS = [
  {
    heading: 'Where the data comes from',
    text: "KnockPortal reads the City of San Francisco's public building-permit records and republishes them as a dated snapshot — the map says which day the records were pulled. Every permit shown on the map links to its own record on the city's portal — check any line you like. A house marked open means no qualifying roofing permit was found in eight years of available public records. No permit found does not mean that roofing work was never performed. Results reflect the available public permit history.",
    link: null,
  },
  {
    heading: 'What KnockPortal does not do',
    text: 'KnockPortal does not sell leads and does not promise them. It does not assign territories: every contractor sees the same city and picks their own blocks. The map is not gated — browsing and selecting are free, without an account.',
    link: null,
  },
  {
    heading: 'Who runs this',
    text: 'KnockPortal is operated by Abalon Construction Management LLC, registered in North Carolina. 4030 Wake Forest Rd, Ste 349, Raleigh, NC 27609. Questions, corrections, or anything the form on this page does not cover — write to a person.',
    link: { label: 'About and contact', href: '/about' },
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
        <div className="max-w-5xl">
          <h2 className={SECTION_HEADING}>{CYCLE_HEADING}</h2>
          <p className={`mt-4 max-w-3xl ${BODY_LINE}`}>{CYCLE_INTRO}</p>

          {/* Written out rather than mapped: each step carries its own marker,
              and a reader counting the cycle should be able to count it in the
              source too. The wording and the order come from CYCLE_STEPS. */}
          <ol className="mt-8 grid gap-4 md:grid-cols-2">
            <li data-cycle-step className={STEP_CARD}>
              <h3 className={STEP_HEADING}>{LOOK.heading}</h3>
              <p className={STEP_TEXT}>{LOOK.text}</p>
            </li>
            <li data-cycle-step className={STEP_CARD}>
              <h3 className={STEP_HEADING}>{PICK.heading}</h3>
              <p className={STEP_TEXT}>{PICK.text}</p>
            </li>
            <li data-cycle-step className={STEP_CARD}>
              <h3 className={STEP_HEADING}>{SET_UP.heading}</h3>
              <p className={STEP_TEXT}>{SET_UP.text}</p>
            </li>
            <li data-cycle-step className={STEP_CARD}>
              <h3 className={STEP_HEADING}>{APPROVE.heading}</h3>
              <p className={STEP_TEXT}>{APPROVE.text}</p>
            </li>
            <li data-cycle-step className={STEP_CARD}>
              <h3 className={STEP_HEADING}>{SEND.heading}</h3>
              <p className={STEP_TEXT}>{SEND.text}</p>
            </li>
            <li data-cycle-step className={STEP_CARD}>
              <h3 className={STEP_HEADING}>{REMEMBER.heading}</h3>
              <p className={STEP_TEXT}>{REMEMBER.text}</p>
            </li>
            <li data-cycle-step className={STEP_CARD}>
              <h3 className={STEP_HEADING}>{REPEAT.heading}</h3>
              <p className={STEP_TEXT}>{REPEAT.text}</p>
            </li>
          </ol>

          <p className={`mt-6 max-w-3xl ${BODY_LINE}`}>{CYCLE_DOORS}</p>

          {/* The one line about what is filled in right now. It is set apart on
              purpose: a "not built yet" note beside every step would drown the
              cycle it is describing. */}
          <p className={`mt-8 max-w-3xl border-t border-hairline pt-6 ${BODY_LINE}`}>
            {CYCLE_STATUS}
          </p>
        </div>
      </Section>

      <Section className="border-t border-hairline">
        <div className="max-w-3xl">
          <h2 className={SECTION_HEADING}>{PRICING_HEADING}</h2>
          <ul className="mt-6 space-y-3">
            {PRICING_LINES.map((line) => (
              <li key={line} className={BODY_LINE}>
                {line}
              </li>
            ))}
          </ul>
        </div>
      </Section>

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
