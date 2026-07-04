'use client'

import { useState } from 'react'
import { Section } from '@/components/layout/Section'
import { FormField } from '@/components/forms/FormField'
import { Consent } from '@/components/forms/Consent'
import { TRADE_CATEGORIES } from '@/lib/categories'

type FormState = 'idle' | 'submitting' | 'received' | 'error'

export default function RequestPage() {
  const [state, setState] = useState<FormState>('idle')
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [selectedTrade, setSelectedTrade] = useState('roofing')

  const selectedCategory = TRADE_CATEGORIES.find((c) => c.slug === selectedTrade)
  const isLive = selectedCategory?.live ?? false

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const email = (data.get('email') as string) ?? ''
    setSubmittedEmail(email)
    setState('submitting')
    try {
      const res = await fetch('/api/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: data.get('category'),
          metro: data.get('metro'),
          email,
          details: data.get('details'),
          consent: data.get('consent') === 'on',
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) {
        setErrorMsg(json.error || 'Something went wrong. Please try again.')
        setState('error')
        return
      }
      setState('received')
    } catch {
      setErrorMsg("We couldn't reach the server. Please try again.")
      setState('error')
    }
  }

  if (state === 'received') {
    return (
      <Section className="min-h-[60vh] flex items-center">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="font-display text-4xl sm:text-5xl text-hail mb-4">Request received.</h2>
          <p className="text-muted text-base leading-relaxed mb-4">
            Thanks — we&apos;ve saved your request for{' '}
            <span className="text-hail">{submittedEmail}</span>. We&apos;re still building out our
            contractor lists, and we&apos;ll reach out as soon as we have a match in your area.
          </p>
          <p className="text-muted text-sm">
            We won&apos;t email you anything else in the meantime, and your details are never shared.
          </p>
        </div>
      </Section>
    )
  }

  return (
    <>
      <Section>
        {/* Header */}
        <div className="max-w-xl mb-10">
          <h1 className="font-display text-5xl sm:text-6xl text-hail mb-4">
            Find a contractor you can trust.
          </h1>
          <p className="text-muted text-lg leading-relaxed">
            Tell us what you need. We&apos;ll email you a short list of contractors working in your
            area. It&apos;s free, and your email is never shared with anyone.
          </p>
        </div>

        {/* Form */}
        <div className="max-w-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="category" className="block text-hail text-sm font-medium mb-1.5">
                What kind of work do you need?<span className="text-orange ml-1">*</span>
              </label>
              <select
                id="category"
                name="category"
                required
                value={selectedTrade}
                onChange={(e) => setSelectedTrade(e.target.value)}
                className="w-full bg-slate border border-hairline rounded px-4 py-3 text-hail text-sm focus:outline-none focus:border-orange transition-colors duration-150 appearance-none cursor-pointer"
              >
                {TRADE_CATEGORIES.map((cat) => (
                  <option key={cat.slug} value={cat.slug} className="bg-slate">
                    {cat.label}{!cat.live ? ' · coming soon' : ''}
                  </option>
                ))}
              </select>
            </div>

            {!isLive && (
              <div className="bg-slate border border-hairline rounded p-4 text-muted text-sm leading-relaxed">
                We don&apos;t have <strong className="text-hail">{selectedCategory?.label}</strong>{' '}
                contractors in your area just yet — we&apos;re adding them. Leave your email and
                we&apos;ll notify you the moment we do.
              </div>
            )}

            <div>
              <label htmlFor="metro" className="block text-hail text-sm font-medium mb-1.5">
                Where are you located?<span className="text-orange ml-1">*</span>
              </label>
              <select
                id="metro"
                name="metro"
                required
                className="w-full bg-slate border border-hairline rounded px-4 py-3 text-hail text-sm focus:outline-none focus:border-orange transition-colors duration-150 appearance-none cursor-pointer"
              >
                <option value="san-francisco">San Francisco</option>
              </select>
            </div>

            <FormField
              label="Where should we send your contractor list?"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
            />

            <FormField
              label="Briefly describe the job (optional)"
              name="details"
              type="textarea"
              placeholder="Tell us a bit about the project..."
              rows={4}
            />

            <Consent
              name="consent"
              required
              label="I agree to receive a list of contractors for the work I selected, by email."
            />

            {state === 'error' && (
              <p role="alert" className="text-orange text-sm leading-snug">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={state === 'submitting'}
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 border border-hail/60 text-hail font-medium text-sm rounded hover:bg-hail/10 transition-colors duration-150 focus-visible:outline-orange focus-visible:outline-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {state === 'submitting' ? 'Sending…' : 'Send me contractors'}
            </button>
          </form>

          {/* Trust micro-copy */}
          <div className="mt-8 pt-8 border-t border-hairline space-y-2 text-muted text-sm leading-relaxed">
            <p>
              Your email stays with us. We don&apos;t sell it, and we don&apos;t pass it to
              contractors — you reach out to whoever you like, on your terms.
            </p>
            <p>
              New service, expanding. If no contractors are listed in your area yet, we&apos;ll let
              you know as soon as they are.
            </p>
          </div>
        </div>
      </Section>
    </>
  )
}
