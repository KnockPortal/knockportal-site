'use client'

import { useState } from 'react'
import { inputClass, primaryClass, technicalLine, type UiError } from '@/lib/ui-error'
import {
  FIELD_LABELS,
  PREFERRED_CONTACT_VALUES,
  type PostcardProfileRow,
  type PostcardProfileInput,
  type PreferredContact,
} from '@/lib/postcard-profile'

/**
 * The block a workspace fills in once and every card it sends is printed from.
 *
 * Nothing is checked here before the request goes out. The route validates all
 * of it against the bounds of the table, and a second opinion in the browser
 * would only be a place for the two to disagree — so the refusal that comes
 * back is the whole of the checking, and it is what names the field.
 */

/** Every field this form draws, held as typed text. */
type FormState = { [K in keyof PostcardProfileInput]: string }

const CONTACT_LABELS: Record<PreferredContact, string> = {
  phone: 'Phone',
  email: 'Email',
  website: 'Website',
}

function initialState(row: PostcardProfileRow | null): FormState {
  return {
    company_name: row?.company_name ?? '',
    return_line1: row?.return_line1 ?? '',
    return_line2: row?.return_line2 ?? '',
    return_city: row?.return_city ?? '',
    return_state: row?.return_state ?? '',
    return_zip: row?.return_zip ?? '',
    phone: row?.phone ?? '',
    email: row?.email ?? '',
    website: row?.website ?? '',
    // The card has to point somewhere, and a phone number is the thing a
    // contractor is likeliest to have. It is a starting position, not a claim.
    preferred_contact: row?.preferred_contact ?? 'phone',
    license_number: row?.license_number ?? '',
    body_text: row?.body_text ?? '',
    qr_target: row?.qr_target ?? '',
  }
}

function Label({ field, required }: { field: keyof FormState; required?: boolean }) {
  return (
    <span className="text-sm text-hail">
      {FIELD_LABELS[field]}
      {required && <span className="text-orange"> *</span>}
    </span>
  )
}

export default function PostcardProfileSection({
  row,
}: {
  row: PostcardProfileRow | null
}) {
  const [form, setForm] = useState<FormState>(() => initialState(row))
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [badField, setBadField] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)
  const [error, setError] = useState<UiError | null>(null)

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    // Whatever the last answer was, it was about the text that has just
    // changed, so it no longer describes what is on screen.
    setSaved(false)
    setBadField(null)
    setExpired(false)
    setError(null)
  }

  async function save() {
    setBusy(true)
    setSaved(false)
    setBadField(null)
    setExpired(false)
    setError(null)

    // The body is built once and kept, because what is shown after a save has
    // to be what the save carried. The state goes up in case here as well as on
    // the route: the route would do it anyway, and doing it before the request
    // leaves is what makes the sent value and the stored value the same two
    // letters. It is not a check — a wrong state is still refused by the route,
    // which is the only place that refuses anything.
    const sent = { ...form, return_state: form.return_state.toUpperCase() }

    try {
      const res = await fetch('/api/postcard-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(sent),
      })

      if (res.status === 200) {
        // No router.refresh(): the form already holds what was written, and
        // re-rendering the server tree would open a window in which the older
        // render is still on screen and still clickable.
        //
        // With one exception, and it is the reason this is not simply left
        // alone: the route upper-cases the state before it stores it, so the
        // two letters on screen would go on disagreeing with the two letters in
        // the table until the page was loaded again. The other fields are
        // stored as they were typed.
        setForm((prev) => ({ ...prev, return_state: sent.return_state }))
        setSaved(true)
        setBusy(false)
        return
      }

      if (res.status === 401) {
        setExpired(true)
        setBusy(false)
        return
      }

      const payload = (await res.json().catch(() => null)) as {
        error?: string
        field?: string
      } | null

      // Only a field this form drew is worth naming. The route also refuses
      // with 'body', which is not a field at all but a body that did not parse,
      // and telling a man to check a field he was never shown sends him looking
      // for something that is not on the screen. Anything unlabelled falls
      // through to the general refusal below, which at least carries the
      // technical line a ticket can be written from.
      if (res.status === 400 && payload?.field && FIELD_LABELS[payload.field]) {
        setBadField(payload.field)
        setBusy(false)
        return
      }

      setError({
        headline: 'We could not save the postcard details.',
        detail: ['HTTP ' + res.status, payload?.error, payload?.field]
          .filter(Boolean)
          .join(' · '),
      })
    } catch (e: unknown) {
      setError({
        headline: 'We could not save the postcard details.',
        detail: technicalLine(e),
      })
    }
    setBusy(false)
  }

  return (
    <section className="space-y-4">
      <h2 className="font-display text-lg font-semibold text-hail">Postcard details</h2>
      <p className="text-sm text-muted">
        These are printed on every postcard you send. Nothing here goes anywhere until
        you approve a mailing.
      </p>

      <div className="space-y-4">
        <label className="block space-y-1">
          <Label field="company_name" required />
          <input
            type="text"
            className={inputClass}
            value={form.company_name}
            onChange={(e) => set('company_name', e.target.value)}
          />
        </label>

        <label className="block space-y-1">
          <Label field="return_line1" required />
          <input
            type="text"
            className={inputClass}
            value={form.return_line1}
            onChange={(e) => set('return_line1', e.target.value)}
          />
        </label>

        <label className="block space-y-1">
          <Label field="return_line2" />
          <input
            type="text"
            className={inputClass}
            value={form.return_line2}
            onChange={(e) => set('return_line2', e.target.value)}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block space-y-1">
            <Label field="return_city" required />
            <input
              type="text"
              className={inputClass}
              value={form.return_city}
              onChange={(e) => set('return_city', e.target.value)}
            />
          </label>

          <label className="block space-y-1">
            <Label field="return_state" required />
            <input
              type="text"
              className={inputClass}
              value={form.return_state}
              onChange={(e) => set('return_state', e.target.value)}
            />
          </label>

          <label className="block space-y-1">
            <Label field="return_zip" required />
            <input
              type="text"
              className={inputClass}
              value={form.return_zip}
              onChange={(e) => set('return_zip', e.target.value)}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block space-y-1">
            <Label field="phone" />
            <input
              type="text"
              className={inputClass}
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
            />
          </label>

          <label className="block space-y-1">
            <Label field="email" />
            <input
              type="text"
              className={inputClass}
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </label>

          <label className="block space-y-1">
            <Label field="website" />
            <input
              type="text"
              className={inputClass}
              value={form.website}
              onChange={(e) => set('website', e.target.value)}
            />
          </label>
        </div>

        <label className="block space-y-1">
          <Label field="preferred_contact" required />
          <select
            className={inputClass}
            value={form.preferred_contact}
            onChange={(e) => set('preferred_contact', e.target.value)}
          >
            {PREFERRED_CONTACT_VALUES.map((value) => (
              <option key={value} value={value}>
                {CONTACT_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <Label field="license_number" />
          <input
            type="text"
            className={inputClass}
            value={form.license_number}
            onChange={(e) => set('license_number', e.target.value)}
          />
          <span className="block text-xs text-muted">
            Required on advertising in some states. Leave it empty if it does not apply
            to you.
          </span>
        </label>

        <label className="block space-y-1">
          <Label field="body_text" />
          <textarea
            rows={3}
            className={inputClass}
            value={form.body_text}
            onChange={(e) => set('body_text', e.target.value)}
          />
          <span className="block text-xs text-muted">
            Up to 300 characters, in your own words.
          </span>
        </label>

        <label className="block space-y-1">
          <Label field="qr_target" />
          <input
            type="text"
            className={inputClass}
            value={form.qr_target}
            onChange={(e) => set('qr_target', e.target.value)}
          />
        </label>
      </div>

      <div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className={primaryClass}
        >
          {busy ? 'Saving…' : 'Save postcard details'}
        </button>

        {saved && <p className="mt-2 text-sm text-muted">Postcard details saved.</p>}

        {/* The column the route named, said back in the words the form used
            for it. Nothing reaches here without a label: a name with no field
            behind it was turned into the general refusal above. */}
        {badField && (
          <p className="mt-2 text-sm text-hail">
            Check this field: {FIELD_LABELS[badField]}
          </p>
        )}

        {expired && (
          <p className="mt-2 text-sm text-hail">
            Your session has ended. Sign in again to save.
          </p>
        )}

        {error && (
          <div className="mt-2 rounded border border-hairline bg-slate px-4 py-3">
            <p className="text-sm text-hail">{error.headline}</p>
            {error.detail && (
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted">
                {error.detail}
              </p>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-muted">
        Logo upload and the postcard preview are not available yet.
      </p>
    </section>
  )
}
