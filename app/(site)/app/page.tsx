'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { DATA_BASE } from '@/lib/surface'

// Supabase Auth "Minimum interval per user" is 60s. The limit lives on the
// server and is keyed by recipient, so the client tracks the address, not the
// screen: leaving the code screen must not hand out a fresh allowance.
const RESEND_COOLDOWN_SECONDS = 60
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/
const SLUG_STORAGE_KEY = 'kp.source_demo_slug'
// Where the surface parks a selection it could not save because nobody was
// signed in. It hands the browser here; this page finishes the save.
const PENDING_SELECTION_KEY = 'kp_pending_selection'

// Shape confirmed against pg_proc on 2026-08-23:
// ensure_workspace(p_source_demo_slug text DEFAULT NULL)
//   RETURNS TABLE(workspace_id uuid, member_role text, is_new boolean)
// RETURNS TABLE means PostgREST hands back an array, not an object.
type EnsureWorkspaceRow = {
  workspace_id: string
  member_role: string
  is_new: boolean
}

type ClusterRow = {
  cluster: number
  permits: number
  first: string
  last: string
  nhood: string
  streets: string
  neighbours: number
  reroofed: number
}

type ClustersFile = {
  meta: Record<string, unknown>
  clusters: ClusterRow[]
}

// latest.json names the snapshot the surface is serving right now. Everything
// under a stamp is immutable, so the pair of reads can never mix two snapshots.
type LatestFile = {
  stamp?: string
}

// Columns of public.saved_selections that the list needs. center_lat and
// center_lon exist on the table but no row here shows a coordinate, so they are
// not fetched.
type SavedSelectionRow = {
  id: string
  city: string
  trade: string
  snapshot_stamp: string
  nhood: string | null
  label: string | null
  addresses: string[]
  created_at: string
}

const SAVED_SELECTION_COLUMNS =
  'id, city, trade, snapshot_stamp, nhood, label, addresses, created_at'

type Stage = 'loading' | 'email' | 'code' | 'ready'

// A short sentence a person can act on, plus the raw service string kept next
// to it in small type — the technical line is what makes a support ticket
// answerable, so it is never thrown away.
type UiError = { headline: string; detail: string | null }

function readField(e: unknown, key: string): string | undefined {
  if (e && typeof e === 'object' && key in e) {
    const v = (e as Record<string, unknown>)[key]
    if (v !== undefined && v !== null && v !== '') return String(v)
  }
  return undefined
}

function technicalLine(e: unknown): string {
  const parts = [
    readField(e, 'name'),
    readField(e, 'status') ? 'status ' + readField(e, 'status') : undefined,
    readField(e, 'code'),
    readField(e, 'message') ?? String(e),
  ].filter(Boolean)
  return parts.join(' · ')
}

// Supabase does not expose a stable machine code for every one of these, so we
// match on the text and status it actually returns. Anything unrecognised is
// shown verbatim rather than flattened into a vague apology.
function describeError(e: unknown): UiError {
  const detail = technicalLine(e)
  const message = readField(e, 'message') ?? String(e)
  const lower = message.toLowerCase()
  const name = (readField(e, 'name') ?? '').toLowerCase()
  const status = Number(readField(e, 'status') ?? NaN)

  const wait = lower.match(/after (\d+) seconds?/)
  if (wait) {
    return {
      headline: `A code was already sent. You can request another in ${wait[1]} seconds.`,
      detail,
    }
  }
  if (lower.includes('email rate limit') || lower.includes('over_email_send_rate_limit')) {
    return {
      headline: 'Too many sign-in emails have gone out. Please try again later.',
      detail,
    }
  }
  if (lower.includes('api key') || lower.includes('project not specified')) {
    return {
      headline:
        'Configuration error: this site cannot reach the authentication project. Not something you can fix — please report it.',
      detail,
    }
  }
  if (
    lower.includes('token has expired') ||
    lower.includes('otp_expired') ||
    lower.includes('invalid token') ||
    lower.includes('expired or is invalid')
  ) {
    return { headline: 'That code is wrong or has expired. Request a new one.', detail }
  }
  if (
    name.includes('retryable') ||
    lower.includes('failed to fetch') ||
    lower.includes('load failed') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed')
  ) {
    return { headline: 'Could not reach the authentication service.', detail }
  }
  if (status === 429 || lower.includes('rate limit')) {
    return { headline: 'Too many requests. Please try again in a minute.', detail }
  }
  return { headline: message, detail: null }
}

const normalise = (value: string) => value.trim().toLowerCase()

export default function AppPage() {
  const supabase = supabaseBrowser()

  const [authReady, setAuthReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
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

  const [workspace, setWorkspace] = useState<EnsureWorkspaceRow | null>(null)
  const [workspaceError, setWorkspaceError] = useState<UiError | null>(null)
  const [workspaceBusy, setWorkspaceBusy] = useState(false)

  const [data, setData] = useState<ClustersFile | null>(null)
  const [dataError, setDataError] = useState<string | null>(null)
  // The stamp of the snapshot on screen. Shown next to the dataset and needed
  // by the save button, which lands on the surface in the next pass.
  const [stamp, setStamp] = useState<string | null>(null)

  const [saved, setSaved] = useState<SavedSelectionRow[] | null>(null)
  const [savedError, setSavedError] = useState<UiError | null>(null)
  // At most one row is ever awaiting confirmation, so this is an id and not a
  // flag per row.
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const ensureRan = useRef(false)
  const pendingRan = useRef(false)
  const codeInput = useRef<HTMLInputElement | null>(null)

  // A session is the only thing that decides whether the workspace is shown.
  // ensure_workspace can fail without stranding the user on the code screen.
  const stage: Stage = !authReady
    ? 'loading'
    : session
      ? 'ready'
      : awaitingCode
        ? 'code'
        : 'email'

  // Acquisition context only. A demo slug never grants membership: the server
  // function takes identity from auth.uid() and ignores this value for access.
  const readSlug = useCallback((): string | null => {
    if (typeof window === 'undefined') return null
    const fromQuery = new URLSearchParams(window.location.search).get('demo')
    if (fromQuery && SLUG_RE.test(fromQuery)) {
      window.sessionStorage.setItem(SLUG_STORAGE_KEY, fromQuery)
      return fromQuery
    }
    const stored = window.sessionStorage.getItem(SLUG_STORAGE_KEY)
    return stored && SLUG_RE.test(stored) ? stored : null
  }, [])

  useEffect(() => {
    readSlug()
    let alive = true
    supabase.auth.getSession().then(({ data: d }) => {
      if (!alive) return
      setSession(d.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setAuthReady(true)
      if (!s) {
        setAwaitingCode(false)
        setWorkspace(null)
        setWorkspaceError(null)
        setData(null)
        setDataError(null)
        setStamp(null)
        setSaved(null)
        setSavedError(null)
        setConfirmingId(null)
        ensureRan.current = false
      }
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [supabase, readSlug])

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
    if (stage === 'code') codeInput.current?.focus()
  }, [stage])

  const runEnsureWorkspace = useCallback(async () => {
    setWorkspaceBusy(true)
    setWorkspaceError(null)
    const { data: rows, error: e } = await supabase.rpc('ensure_workspace', {
      p_source_demo_slug: readSlug(),
    })
    setWorkspaceBusy(false)
    if (e) {
      setWorkspaceError(describeError(e))
      return
    }
    const list = (rows ?? []) as EnsureWorkspaceRow[]
    if (list.length === 0) {
      setWorkspaceError({
        headline: 'The workspace lookup came back empty.',
        detail: 'ensure_workspace returned no rows',
      })
      return
    }
    setWorkspace(list[0])
  }, [supabase, readSlug])

  // Idempotent by design: repeated calls return the existing workspace and do
  // not overwrite the first-touch source_demo_slug, so Retry is safe.
  useEffect(() => {
    if (!session || ensureRan.current) return
    ensureRan.current = true
    void runEnsureWorkspace()
  }, [session, runEnsureWorkspace])

  // Two reads, the same two the surface makes: latest.json says which snapshot
  // is current, and the summary lives under that stamp. The copy checked into
  // public/data is a repository snapshot that drifts from what is published, so
  // it is not what this page shows.
  useEffect(() => {
    if (!workspace || data) return
    let alive = true

    const load = async () => {
      const latestRes = await fetch(DATA_BASE + 'latest.json', { cache: 'no-store' })
      if (!latestRes.ok) throw new Error('latest.json: HTTP ' + latestRes.status)
      const latest = (await latestRes.json()) as LatestFile
      if (!latest.stamp) throw new Error('latest.json: no stamp field')

      const url = DATA_BASE + latest.stamp + '/clusters.json'
      const clustersRes = await fetch(url, { cache: 'no-store' })
      if (!clustersRes.ok) throw new Error('clusters.json: HTTP ' + clustersRes.status)
      const file = (await clustersRes.json()) as ClustersFile

      if (!alive) return
      setStamp(latest.stamp)
      setData(file)
    }

    load().catch((e: unknown) => {
      if (!alive) return
      setDataError(e instanceof Error ? e.message : String(e))
    })

    return () => {
      alive = false
    }
  }, [workspace, data])

  // Read straight from the browser: the SELECT policy already limits the rows
  // to workspaces this user belongs to, so a route in front of this would add a
  // hop and a second place where access is decided.
  const loadSaved = useCallback(async () => {
    setSavedError(null)
    const { data: rows, error: e } = await supabase
      .from('saved_selections')
      .select(SAVED_SELECTION_COLUMNS)
      .order('created_at', { ascending: false })
      .returns<SavedSelectionRow[]>()
    if (e) {
      setSavedError(describeError(e))
      return
    }
    setSaved(rows ?? [])
  }, [supabase])

  useEffect(() => {
    if (!workspace) return
    void loadSaved()
  }, [workspace, loadSaved])

  // The selection made on the surface before signing in. The key is removed
  // before the request goes out and not after it: left in place, a refusal
  // would be retried on every visit to this page for the rest of the tab's
  // life, and the same body would keep failing the same way.
  useEffect(() => {
    if (!workspace || pendingRan.current) return
    pendingRan.current = true

    const raw = window.sessionStorage.getItem(PENDING_SELECTION_KEY)
    if (!raw) return
    window.sessionStorage.removeItem(PENDING_SELECTION_KEY)

    let body: unknown
    try {
      body = JSON.parse(raw)
    } catch {
      // Nothing usable, and nothing worth saying about it: whatever was in
      // there did not come from a save this page can finish.
      return
    }

    const finish = async () => {
      const res = await fetch('/api/selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          error?: string
          field?: string
        } | null
        throw new Error(
          ['HTTP ' + res.status, payload?.error, payload?.field]
            .filter(Boolean)
            .join(' · '),
        )
      }
      await loadSaved()
    }

    finish().catch((e: unknown) => {
      setSavedError({
        headline: 'We could not save the selection you made before signing in.',
        detail: technicalLine(e),
      })
    })
  }, [workspace, loadSaved])

  const deleteSaved = useCallback(
    async (id: string) => {
      setDeletingId(id)
      setSavedError(null)
      const { error: e } = await supabase.from('saved_selections').delete().eq('id', id)
      setDeletingId(null)
      setConfirmingId(null)
      if (e) {
        setSavedError(describeError(e))
        return
      }
      setSaved((prev) => (prev ? prev.filter((row) => row.id !== id) : prev))
    },
    [supabase],
  )

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
  }

  async function signOut() {
    setBusy(true)
    await supabase.auth.signOut()
    setBusy(false)
    setEmail('')
    setCode('')
    setError(null)
    setNotice('Signed out.')
  }

  const clusters = useMemo(
    () => (data ? [...data.clusters].sort((a, b) => b.permits - a.permits) : []),
    [data],
  )

  const inputClass =
    'w-full rounded border border-hairline bg-slate px-3 py-2 text-sm text-hail placeholder:text-muted focus:border-orange focus:outline-none'
  const primaryClass =
    'rounded bg-orange px-4 py-2 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40'
  const secondaryClass =
    'rounded border border-hairline px-4 py-2 text-sm text-hail hover:border-muted disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className="mx-auto max-w-5xl px-5 py-16">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-hail">
        KnockPortal workspace
      </h1>

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

      {stage === 'loading' && <p className="mt-8 text-sm text-muted">Loading…</p>}

      {stage === 'email' && (
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

      {stage === 'code' && (
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

      {stage === 'ready' && session && (
        <div className="mt-8 space-y-8">
          <section className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-hail">
              Saved selections
            </h2>

            {savedError && (
              <div className="rounded border border-hairline bg-slate px-4 py-3">
                <p className="text-sm text-hail">{savedError.headline}</p>
                {savedError.detail && (
                  <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted">
                    {savedError.detail}
                  </p>
                )}
              </div>
            )}

            {!saved && !savedError && (
              <p className="text-sm text-muted">Loading saved selections…</p>
            )}

            {saved && saved.length === 0 && (
              <p className="text-sm text-muted">
                Nothing saved yet. Pick houses on the map and save the selection to
                find it here.
              </p>
            )}

            {saved && saved.length > 0 && (
              <ul className="space-y-3">
                {saved.map((row) => (
                  <li
                    key={row.id}
                    className="rounded border border-hairline bg-slate px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-hail">
                          {row.nhood || row.label || '—'}
                        </p>
                        <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted">
                          {row.addresses.length === 1
                            ? '1 address'
                            : `${row.addresses.length} addresses`}
                          {' · '}
                          {`snapshot ${row.snapshot_stamp}`}
                          {' · '}
                          {new Date(row.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-3">
                        {/* The combination comes from the row, not from the
                            surface constants: a saved selection carries the city
                            and trade it was made in. The surface reads
                            ?selection=, finds the group by the stored centre and
                            puts the addresses back on the map. */}
                        <a
                          href={`/${encodeURIComponent(row.city)}/${encodeURIComponent(
                            row.trade,
                          )}?selection=${encodeURIComponent(row.id)}`}
                          className="text-sm text-orange hover:underline"
                        >
                          Open on the map
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirmingId === row.id) {
                              void deleteSaved(row.id)
                              return
                            }
                            // Arming this row disarms whichever was armed
                            // before, so only one row is ever one click from
                            // being deleted.
                            setConfirmingId(row.id)
                          }}
                          disabled={deletingId !== null}
                          className={`${secondaryClass} px-3 py-1`}
                        >
                          {confirmingId === row.id ? 'Confirm delete' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded border border-hairline bg-slate px-4 py-3">
            <div className="space-y-1 font-mono text-xs text-muted">
              <div>email: {session.user.email}</div>
              {workspace ? (
                <>
                  <div>workspace_id: {workspace.workspace_id}</div>
                  <div>member_role: {workspace.member_role}</div>
                  <div>is_new: {String(workspace.is_new)}</div>
                </>
              ) : (
                <div>workspace: {workspaceBusy ? 'resolving…' : 'unavailable'}</div>
              )}
            </div>
          </section>

          {workspaceError && (
            <section className="rounded border border-hairline bg-slate px-4 py-3">
              <p className="text-sm text-hail">
                Signed in, but the workspace could not be resolved.
              </p>
              <p className="mt-1 text-sm text-muted">{workspaceError.headline}</p>
              {workspaceError.detail && (
                <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted">
                  {workspaceError.detail}
                </p>
              )}
              <button
                type="button"
                onClick={() => void runEnsureWorkspace()}
                disabled={workspaceBusy}
                className={`${secondaryClass} mt-3`}
              >
                {workspaceBusy ? 'Retrying…' : 'Retry'}
              </button>
            </section>
          )}

          <button
            type="button"
            onClick={() => void signOut()}
            disabled={busy}
            className={secondaryClass}
          >
            Sign out
          </button>

          <section className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-hail">
              Current citywide dataset
            </h2>

            {/* The file name now travels inside the message: two files are read,
                and a failure has to say which one refused. */}
            {dataError && <p className="font-mono text-xs text-muted">{dataError}</p>}
            {!data && !dataError && (
              <p className="text-sm text-muted">Loading the current snapshot…</p>
            )}
            {data && stamp && (
              <p className="font-mono text-xs text-muted">{`snapshot ${stamp}`}</p>
            )}

            {data && (
              <>
                <dl className="grid gap-x-6 gap-y-1 rounded border border-hairline bg-slate px-4 py-3 font-mono text-xs sm:grid-cols-2">
                  {Object.entries(data.meta).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <dt className="shrink-0 text-muted">{k}</dt>
                      <dd className="min-w-0 break-words text-hail">
                        {Array.isArray(v)
                          ? v.join(', ')
                          : v !== null && typeof v === 'object'
                            ? JSON.stringify(v)
                            : String(v)}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="overflow-x-auto rounded border border-hairline">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate text-left text-[11px] uppercase tracking-wide text-muted">
                        <th className="px-3 py-2 font-medium">#</th>
                        <th className="px-3 py-2 font-medium">Neighbourhood</th>
                        <th className="px-3 py-2 text-right font-medium">Permits</th>
                        <th className="px-3 py-2 text-right font-medium">Neighbours</th>
                        <th className="px-3 py-2 text-right font-medium">Re-roofed</th>
                        <th className="px-3 py-2 font-medium">Window</th>
                        <th className="px-3 py-2 font-medium">Streets</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clusters.map((c) => (
                        <tr key={c.cluster} className="border-t border-hairline align-top">
                          <td className="px-3 py-2 font-mono text-xs text-muted">
                            {c.cluster}
                          </td>
                          <td className="px-3 py-2 text-hail">{c.nhood}</td>
                          <td className="px-3 py-2 text-right font-mono text-hail">
                            {c.permits}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-muted">
                            {c.neighbours}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-muted">
                            {c.reroofed}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted">
                            {c.first} – {c.last}
                          </td>
                          <td className="px-3 py-2 text-xs text-muted">{c.streets}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
