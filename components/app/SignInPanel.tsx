'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  describeError,
  inputClass,
  primaryClass,
  secondaryClass,
  type UiError,
} from '@/lib/ui-error'

// Supabase Auth "Minimum interval per user" is 60s. The limit lives on the
// server and is keyed by recipient, so the client tracks the address, not the
// screen: leaving the code screen must not hand out a fresh allowance.
const RESEND_COOLDOWN_SECONDS = 60

const normalise = (value: string) => value.trim().toLowerCase()

/**
 * `next` is where he was going when the sign-in stopped him — a surface
 * address, already checked against RETURN_TO_RE by the page that renders this.
 * Without it the session lands him in the workspace, which is where he asked to
 * be; with it he is put back on the page he was working.
 */
export default function SignInPanel({ next }: { next?: string | null }) {
  const supabase = supabaseBrowser()
  const router = useRouter()

  const [awaitingCode, setAwaitingCode] = useState(false)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<UiError | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Address + timestamp of the last accepted send, so the cooldown survives
  // "Change email" and back.
  const [lastSent, setLastSent] = useState<{ email: string; at: number } | null>(null)
  const [now, setNow] = useState(0)

  const codeInput = useRef<HTMLInputElement | null>(null)

  const target = normalise(email)
  const cooldownLeft =
    lastSent && lastSent.email === target && now > 0
      ? Math.max(
          0,
          Math.ceil((lastSent.at + RESEND_COOLDOWN_SECONDS * 1000 - now) / 1000),
        )
      : 0

  // Self-terminating ticker: it stops rescheduling once the window has passed.
  useEffect(() => {
    if (!lastSent) return
    const expires = lastSent.at + RESEND_COOLDOWN_SECONDS * 1000
    if (now >= expires) return
    const t = setTimeout(() => setNow(Date.now()), 500)
    return () => clearTimeout(t)
  }, [lastSent, now])

  useEffect(() => {
    if (awaitingCode) codeInput.current?.focus()
  }, [awaitingCode])

  // The server decides what this page shows, so a session appearing anywhere —
  // including a sign-in in another tab, which writes the same cookie — has to be
  // answered by asking the server again rather than by flipping local state.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) return
      // A full navigation and not router.refresh(): the destination is another
      // page altogether, and it is a page this app never rendered — the surface
      // is served outside the router's tree.
      if (next) window.location.assign(next)
      else router.refresh()
    })
    return () => sub.subscription.unsubscribe()
  }, [supabase, router, next])

  async function sendCode() {
    const address = normalise(email)
    if (!address.includes('@')) return

    if (lastSent && lastSent.email === address && cooldownLeft > 0) {
      setNotice(null)
      setError({
        headline: `A code was already sent to ${address}. You can request another in ${cooldownLeft} seconds.`,
        detail: 'client-side guard · Supabase minimum interval per user is 60s',
      })
      setAwaitingCode(true)
      return
    }

    setError(null)
    setNotice(null)
    setBusy(true)
    const { error: e } = await supabase.auth.signInWithOtp({
      email: address,
      options: { shouldCreateUser: true },
    })
    setBusy(false)
    if (e) {
      setError(describeError(e))
      return
    }
    setLastSent({ email: address, at: Date.now() })
    setNow(Date.now())
    setAwaitingCode(true)
    setNotice('Code sent. Check your inbox.')
  }

  async function verifyCode() {
    setError(null)
    setNotice(null)
    setBusy(true)
    const { error: e } = await supabase.auth.verifyOtp({
      email: normalise(email),
      token: code.trim(),
      type: 'email',
    })
    setBusy(false)
    if (e) {
      setError(describeError(e))
      return
    }
    setCode('')
    if (next) window.location.assign(next)
    else router.refresh()
  }

  return (
    <>
      {error && (
        <div className="mt-6 rounded border border-hairline bg-slate px-4 py-3">
          <p className="text-sm text-hail">{error.headline}</p>
          {error.detail && (
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted">
              {error.detail}
            </p>
          )}
        </div>
      )}
      {notice && !error && <p className="mt-6 text-sm text-muted">{notice}</p>}

      {!awaitingCode && (
        <form
          className="mt-8 max-w-md space-y-3"
          onSubmit={(ev) => {
            ev.preventDefault()
            void sendCode()
          }}
        >
          <p className="text-sm text-muted">
            Enter your email and we will send a six-digit code. No password.
          </p>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="you@company.com"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={busy || !target.includes('@') || cooldownLeft > 0}
            className={primaryClass}
          >
            {busy
              ? 'Sending…'
              : cooldownLeft > 0
                ? `Send code in ${cooldownLeft}s`
                : 'Send code'}
          </button>
        </form>
      )}

      {awaitingCode && (
        <form
          className="mt-8 max-w-md space-y-3"
          onSubmit={(ev) => {
            ev.preventDefault()
            void verifyCode()
          }}
        >
          <p className="text-sm text-muted">
            Six-digit code sent to <span className="font-mono text-hail">{target}</span>.
          </p>
          <input
            ref={codeInput}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(ev) => setCode(ev.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className={`${inputClass} font-mono text-lg tracking-widest`}
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className={primaryClass}
            >
              {busy ? 'Verifying…' : 'Verify'}
            </button>
            <button
              type="button"
              onClick={() => void sendCode()}
              disabled={busy || cooldownLeft > 0}
              className={secondaryClass}
            >
              {cooldownLeft > 0 ? `Resend in ${cooldownLeft}s` : 'Resend code'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAwaitingCode(false)
                setCode('')
                setError(null)
                setNotice(null)
              }}
              className={`${secondaryClass} text-muted`}
            >
              Change email
            </button>
          </div>
        </form>
      )}
    </>
  )
}
