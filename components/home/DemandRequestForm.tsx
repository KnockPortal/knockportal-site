'use client'

import { useEffect, useState, type FormEvent } from 'react'

/**
 * The id the selector's triggers point at with aria-controls. A constant and
 * not useId(): the buttons live in another component and have to name it.
 */
export const DEMAND_FORM_ID = 'demand-form'

/** Where the form was opened from. Sent as-is and stored on the row. */
export type DemandOrigin = 'cell' | 'free'

const F_HEADING = 'Tell us where you work'
const F_INTRO =
  'A city opens when its permit records support the trade you work in. Leave the combination you need and an email, and we will write when it opens.'
const L_EMAIL = 'Email'
const L_CITY = 'City'
const L_TRADE = 'Trade'
const L_COMPANY = 'Company'
const F_SUBMIT = 'Send request'
const F_SENDING = 'Sending…'
const F_DONE = 'Request received. We will write to the address you left.'
const F_INVALID = 'An email, a city and a trade are all needed.'
const F_FAILED = 'The request did not go through. Try again in a moment.'

const LABEL = 'block text-xs font-medium text-muted'
const INPUT =
  'mt-1 w-full rounded border border-hairline bg-ink px-3 py-2 text-sm text-hail placeholder:text-muted focus:border-orange focus:outline-none'
const SUBMIT =
  'rounded bg-orange px-4 py-2 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40'

type Status = 'idle' | 'sending' | 'done'

export function DemandRequestForm({
  city,
  trade,
  origin,
  seed,
}: {
  city: string
  trade: string
  origin: DemandOrigin
  /**
   * Rises by one on every click of every trigger. Two clicks on the same cell
   * carry the same city and trade, so the values alone cannot say that a person
   * asked again — this can, and it is the whole signal the form resets on.
   */
  seed: number
}) {
  const [email, setEmail] = useState('')
  const [cityValue, setCityValue] = useState(city)
  const [tradeValue, setTradeValue] = useState(trade)
  // The trap. A person never sees it and never reaches it with the keyboard, so
  // anything in it was typed by something filling every input on the page.
  const [company, setCompany] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string | null>(null)

  // Any click on any trigger puts the form back into a state that can be sent:
  // the two fields are re-seeded and the outcome of the previous request is
  // cleared, so a person who has just sent one can send the next without
  // reloading the page. The address survives it — it is the one thing the
  // person typed, and walking the grid must not cost it.
  useEffect(() => {
    setCityValue(city)
    setTradeValue(trade)
    setStatus('idle')
    setMessage(null)
  }, [seed, city, trade])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // The same three fields the route insists on. Checked here so an empty form
    // costs no round trip, and checked there because this check is not the one
    // that counts.
    if (!email.trim() || !cityValue.trim() || !tradeValue.trim()) {
      setMessage(F_INVALID)
      return
    }

    setStatus('sending')
    setMessage(null)

    try {
      const response = await fetch('/api/demand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          city: cityValue,
          trade: tradeValue,
          origin,
          company,
        }),
      })

      if (response.status === 201) {
        setStatus('done')
        setMessage(F_DONE)
        return
      }

      setStatus('idle')
      setMessage(response.status === 400 ? F_INVALID : F_FAILED)
    } catch {
      // A refused fetch and a 500 read the same way from here: the request did
      // not land, and the person can only try again.
      setStatus('idle')
      setMessage(F_FAILED)
    }
  }

  return (
    <div
      id={DEMAND_FORM_ID}
      data-demand-form
      className="mt-4 rounded border border-hairline bg-slate p-5"
    >
      <h3 className="font-display text-base font-semibold text-hail">{F_HEADING}</h3>

      {status === 'done' ? (
        <p role="status" className="mt-3 text-sm leading-relaxed text-hail/80">
          {message}
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm leading-relaxed text-hail/80">{F_INTRO}</p>

          <form className="mt-4 max-w-md space-y-3" onSubmit={submit}>
            <div>
              <label htmlFor="demand-email" className={LABEL}>
                {L_EMAIL}
              </label>
              <input
                id="demand-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={INPUT}
              />
            </div>

            <div>
              <label htmlFor="demand-city" className={LABEL}>
                {L_CITY}
              </label>
              <input
                id="demand-city"
                type="text"
                autoComplete="off"
                value={cityValue}
                onChange={(event) => setCityValue(event.target.value)}
                className={INPUT}
              />
            </div>

            <div>
              <label htmlFor="demand-trade" className={LABEL}>
                {L_TRADE}
              </label>
              <input
                id="demand-trade"
                type="text"
                autoComplete="off"
                value={tradeValue}
                onChange={(event) => setTradeValue(event.target.value)}
                className={INPUT}
              />
            </div>

            <div aria-hidden="true" className="hidden">
              <label htmlFor="demand-company">{L_COMPANY}</label>
              <input
                id="demand-company"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
              />
            </div>

            <button type="submit" disabled={status === 'sending'} className={SUBMIT}>
              {status === 'sending' ? F_SENDING : F_SUBMIT}
            </button>

            {message && (
              <p role="status" className="text-sm leading-relaxed text-hail/80">
                {message}
              </p>
            )}
          </form>
        </>
      )}
    </div>
  )
}
