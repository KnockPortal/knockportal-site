'use client'

import { useState } from 'react'
import { primaryClass, technicalLine, type UiError } from '@/lib/ui-error'

/**
 * One line per cell of the grid this workspace holds a right in, and the door
 * to Stripe's hosted portal under them.
 *
 * The rows arrive already read and already worded: the page fetched them under
 * the caller's session and turned each one into a sentence there, on the
 * server, because the date in it is formatted and a date formatted in the
 * browser is a date the two renders disagree about. This file draws what it was
 * handed and holds the one button.
 */
export type SubscriptionLine = { key: string; text: string }

export default function SubscriptionSection({ rows }: { rows: SubscriptionLine[] }) {
  const [busy, setBusy] = useState(false)
  const [noBilling, setNoBilling] = useState(false)
  const [error, setError] = useState<UiError | null>(null)

  async function openPortal() {
    setBusy(true)
    setNoBilling(false)
    setError(null)
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        credentials: 'same-origin',
      })
      if (res.status === 200) {
        const payload = (await res.json()) as { url?: string }
        if (payload.url) {
          // The browser leaves for Stripe, so the busy flag is never released:
          // there is no state left here worth restoring.
          window.location.assign(payload.url)
          return
        }
      }
      const payload = (await res.json().catch(() => null)) as { error?: string } | null
      // Nobody has ever paid from this workspace. Not a failure — a sentence.
      if (res.status === 409 && payload?.error === 'no_billing') {
        setNoBilling(true)
        setBusy(false)
        return
      }
      setError({
        headline: 'We could not open the billing portal.',
        detail: ['HTTP ' + res.status, payload?.error].filter(Boolean).join(' · '),
      })
    } catch (e: unknown) {
      setError({
        headline: 'We could not open the billing portal.',
        detail: technicalLine(e),
      })
    }
    setBusy(false)
  }

  return (
    <section className="space-y-4">
      <h2 className="font-display text-lg font-semibold text-hail">Subscription</h2>

      {error && (
        <div className="rounded border border-hairline bg-slate px-4 py-3">
          <p className="text-sm text-hail">{error.headline}</p>
          {error.detail && (
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted">
              {error.detail}
            </p>
          )}
        </div>
      )}

      {rows.length === 0 && (
        <p className="text-sm text-muted">
          No subscription yet. It is bought from the map: collect a mailing and press
          Send.
        </p>
      )}

      {rows.length > 0 && (
        <>
          <ul className="space-y-3">
            {rows.map((row) => (
              <li
                key={row.key}
                className="rounded border border-hairline bg-slate px-4 py-3"
              >
                <p className="text-sm text-hail">{row.text}</p>
              </li>
            ))}
          </ul>

          {/* Shown only where there is something to manage: with no row of
              right there is no Stripe customer either, and the button would
              only ever answer with the sentence under it. */}
          <div>
            <button
              type="button"
              onClick={() => void openPortal()}
              disabled={busy}
              className={primaryClass}
            >
              {busy ? 'Opening…' : 'Manage billing'}
            </button>
            {noBilling && (
              <p className="mt-2 text-sm text-muted">
                There is no billing account for this workspace yet.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  )
}
