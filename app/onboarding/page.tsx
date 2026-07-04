'use client'

import { useState } from 'react'
import { Section } from '@/components/layout/Section'
import { FormField } from '@/components/forms/FormField'
import { SF_NEIGHBORHOODS } from '@/lib/sf-neighborhoods'
import { TRADE_CATEGORIES } from '@/lib/categories'

type Step = 0 | 1 | 2 | 3
type Plan = 'registry' | 'presence'

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(0)
  const [plan] = useState<Plan>('presence') // TODO: read from Stripe session/query param

  return (
    <Section className="min-h-[70vh]">
      {/* Auth stub notice */}
      <div className="mb-8 bg-slate border border-hairline rounded px-4 py-3 text-muted text-xs font-mono">
        [Auth stub] — this page will be behind a magic-link in production
      </div>

      {step === 0 && <StepWelcome onNext={() => setStep(1)} />}
      {step === 1 && <StepRegistry onNext={() => setStep(plan === 'presence' ? 2 : 3)} plan={plan} />}
      {step === 2 && plan === 'presence' && <StepProfile onNext={() => setStep(3)} />}
      {step === 3 && <StepDone plan={plan} />}
    </Section>
  )
}

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="max-w-lg">
      <h1 className="font-display text-5xl text-hail mb-4">
        Welcome — let&apos;s set up your registry.
      </h1>
      <p className="text-muted text-lg mb-8">Two quick steps and your daily permits start tomorrow morning.</p>
      <button
        onClick={onNext}
        className="px-6 py-3 bg-orange text-ink font-semibold rounded hover:bg-[#E85D10] transition-colors duration-150"
      >
        Get started →
      </button>
    </div>
  )
}

function StepRegistry({ onNext, plan }: { onNext: () => void; plan: Plan }) {
  const liveCategories = TRADE_CATEGORIES.filter((c) => c.live)

  return (
    <div className="max-w-lg">
      <p className="font-mono text-[11px] text-muted mb-2">Step 1 of {plan === 'presence' ? '2' : '1'}</p>
      <h2 className="font-display text-4xl text-hail mb-8">Registry setup</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onNext()
        }}
        className="space-y-6"
      >
        <div>
          <label htmlFor="category" className="block text-hail text-sm font-medium mb-1.5">
            Which permits do you want?<span className="text-orange ml-1">*</span>
          </label>
          <select
            id="category"
            name="category"
            required
            className="w-full bg-slate border border-hairline rounded px-4 py-3 text-hail text-sm focus:outline-none focus:border-orange transition-colors appearance-none cursor-pointer"
          >
            {liveCategories.map((cat) => (
              <option key={cat.slug} value={cat.slug} className="bg-slate">
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="metro" className="block text-hail text-sm font-medium mb-1.5">
            Which market?<span className="text-orange ml-1">*</span>
          </label>
          <select
            id="metro"
            name="metro"
            required
            className="w-full bg-slate border border-hairline rounded px-4 py-3 text-hail text-sm focus:outline-none focus:border-orange transition-colors appearance-none cursor-pointer"
          >
            <option value="san-francisco">San Francisco</option>
          </select>
        </div>

        <div>
          <label htmlFor="zones" className="block text-hail text-sm font-medium mb-1.5">
            Narrow to your neighborhoods{' '}
            <span className="text-muted font-normal">(optional)</span>
          </label>
          <select
            id="zones"
            name="zones"
            multiple
            className="w-full bg-slate border border-hairline rounded px-4 py-3 text-hail text-sm focus:outline-none focus:border-orange transition-colors h-36"
          >
            {SF_NEIGHBORHOODS.map((n) => (
              <option key={n} value={n} className="bg-slate py-1">
                {n}
              </option>
            ))}
          </select>
          <p className="text-muted text-xs mt-1.5">Hold Cmd/Ctrl to select multiple</p>
        </div>

        <FormField
          label="Where to send the daily registry"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
        />

        <button
          type="submit"
          className="px-6 py-3 bg-orange text-ink font-semibold rounded hover:bg-[#E85D10] transition-colors duration-150"
        >
          Save and continue →
        </button>
      </form>
    </div>
  )
}

function StepProfile({ onNext }: { onNext: () => void }) {
  return (
    <div className="max-w-lg">
      <p className="font-mono text-[11px] text-muted mb-2">Step 2 of 2</p>
      <h2 className="font-display text-4xl text-hail mb-8">Your profile card</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onNext()
        }}
        className="space-y-6"
      >
        <FormField label="Company / name" name="company" required placeholder="Acme Roofing" />
        <FormField
          label="Contact email for homeowners"
          name="contact_email"
          type="email"
          placeholder="you@company.com"
        />
        <FormField
          label="Contact phone for homeowners"
          name="contact_phone"
          type="tel"
          placeholder="(415) 555-0100"
        />
        <FormField
          label="About your company"
          name="about"
          type="textarea"
          placeholder="Tell homeowners what you do and why they should choose you..."
          rows={4}
        />
        <FormField label="License number" name="license" placeholder="CA-12345" />
        <FormField label="Years in business" name="years" placeholder="12" />
        <FormField label="Website" name="website" type="text" placeholder="https://acmeroofing.com" />

        <p className="text-muted text-xs">
          Your profile goes into review before appearing in homeowner dispatches.
        </p>

        <button
          type="submit"
          className="px-6 py-3 bg-orange text-ink font-semibold rounded hover:bg-[#E85D10] transition-colors duration-150"
        >
          Submit profile →
        </button>
      </form>
    </div>
  )
}

function StepDone({ plan }: { plan: Plan }) {
  return (
    <div className="max-w-lg">
      <h2 className="font-display text-5xl text-hail mb-6">You&apos;re all set.</h2>
      {plan === 'registry' ? (
        <p className="text-muted text-lg leading-relaxed">
          Your first registry email arrives tomorrow morning.
        </p>
      ) : (
        <p className="text-muted text-lg leading-relaxed">
          Your registry starts tomorrow. Your profile is under quick review and will be included in
          homeowner dispatches once approved.
        </p>
      )}
    </div>
  )
}
