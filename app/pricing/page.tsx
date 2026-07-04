'use client'

import Link from 'next/link'
import { useState } from 'react'
import { BillingToggle } from '@/components/pricing/BillingToggle'
import { CategorySelect } from '@/components/pricing/CategorySelect'
import { TRADE_CATEGORIES } from '@/lib/categories'
import { PlanCard } from '@/components/pricing/PlanCard'
import { FaqAccordion } from '@/components/sections/FaqAccordion'
import { Section } from '@/components/layout/Section'
import { STRIPE_LINKS } from '@/lib/stripe-links'

const FAQ_ITEMS = [
  {
    question: 'What happens after I pay?',
    answer: 'Stripe confirms, then we email you a setup link within minutes.',
  },
  {
    question: 'Is my card secure?',
    answer: "Payments are processed by Stripe. We never see your card details.",
  },
  {
    question: 'Can I switch plans?',
    answer: 'Yes, upgrade or downgrade anytime.',
  },
  {
    question: 'What shows on my statement?',
    answer: 'KNOCKPORTAL.',
  },
]

export default function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [trade, setTrade] = useState('roofing')

  const selectedCategory = TRADE_CATEGORIES.find((c) => c.slug === trade)
  const isLive = selectedCategory?.live ?? false

  return (
    <>
      {/* ── Header ── */}
      <Section>
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl text-hail mb-6">
            Simple pricing. One won job covers it.
          </h1>
          <p className="text-muted text-lg mb-10">
            Flat monthly subscription. No per-lead fees, no contracts. Cancel anytime.
          </p>
          <BillingToggle value={billing} onChange={setBilling} />
        </div>
      </Section>

      {/* ── Plan cards + CategorySelect ── */}
      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <CategorySelect value={trade} onChange={setTrade} className="mb-8" />

          {isLive ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
              <PlanCard
                name="Registry"
                tagline="Get to the job first."
                monthlyPrice="$99/mo"
                yearlyPrice="$990/yr"
                yearlyLabel="Billed annually — 2 months free"
                features={[
                  'Daily email of fresh permits — your category, your metro',
                  'Full street address on every permit',
                  'Job value and issued date on every permit',
                  'Filter by your neighborhoods and zones',
                  'Cancel anytime',
                ]}
                billing={billing}
                stripeUrl={billing === 'monthly' ? STRIPE_LINKS.registry.monthly : STRIPE_LINKS.registry.yearly}
              />
              <PlanCard
                name="Registry + Presence"
                tagline="Get to the job first — and let homeowners find you."
                monthlyPrice="$149/mo"
                yearlyPrice="$1,490/yr"
                yearlyLabel="Billed annually — 2 months free"
                features={[
                  '<strong>Everything in Registry</strong>',
                  'Your contractor profile in our private catalog',
                  'Included in our homeowner dispatch for your category and metro',
                  'Priority as new homeowner requests come in',
                ]}
                billing={billing}
                stripeUrl={billing === 'monthly' ? STRIPE_LINKS.presence.monthly : STRIPE_LINKS.presence.yearly}
                badge="Most popular"
              />
            </div>
          ) : (
            <div className="bg-slate border border-hairline rounded-lg p-8 text-center">
              <p className="text-hail text-lg mb-2">
                Registry for <strong>{selectedCategory?.label}</strong> is coming soon.
              </p>
              <p className="text-muted text-sm mb-6">
                Want us to notify you when it launches?
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center px-6 py-3 border border-hail/60 text-hail text-sm font-medium rounded hover:bg-hail/10 transition-colors duration-150"
              >
                Join the waitlist →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Available trades ── */}
      <Section elevated>
        <h3 className="font-display text-2xl text-hail mb-3">Available trades</h3>
        <p className="text-muted text-sm mb-6">
          Live now: roofing and solar in San Francisco. Other trades (HVAC, electrical, plumbing,
          windows) are in development.
        </p>
        <div className="flex flex-wrap gap-2">
          {TRADE_CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setTrade(cat.slug)}
              className={`px-3 py-1.5 rounded-full border text-sm font-mono transition-colors duration-150 ${
                cat.live
                  ? 'border-orange/40 text-hail'
                  : 'border-hairline text-muted'
              } ${trade === cat.slug ? 'border-orange' : ''}`}
            >
              {cat.live && <span className="text-orange mr-1.5">●</span>}
              {cat.label}
              {!cat.live && <span className="text-muted ml-1.5">· coming soon</span>}
            </button>
          ))}
        </div>
      </Section>

      {/* ── What's not here ── */}
      <Section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h3 className="font-display text-2xl text-hail mb-4">What&apos;s not here</h3>
            <p className="text-muted text-base leading-relaxed mb-3">
              No setup fees. No per-lead charges. No long-term contract.
            </p>
            <p className="text-muted text-base leading-relaxed">
              Coverage is currently San Francisco and expanding. If your metro or trade isn&apos;t
              live,{' '}
              <Link href="/contact" className="text-orange underline underline-offset-2 hover:text-orange/80">
                tell us
              </Link>
              .
            </p>
          </div>
          <div>
            <FaqAccordion items={FAQ_ITEMS} />
          </div>
        </div>
      </Section>

      {/* ── Final CTA ── */}
      <Section elevated>
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl text-hail mb-8">
            Pick a plan. Knock tomorrow morning.
          </h2>
          <Link
            href="/contractors"
            className="inline-flex items-center px-8 py-4 border border-hail/60 text-hail font-medium text-base rounded hover:bg-hail/10 transition-colors duration-150"
          >
            Why permits beat leads →
          </Link>
        </div>
      </Section>
    </>
  )
}
