import { redirect } from 'next/navigation'
import { supabaseSession } from '@/lib/supabase-session'
import { ensureWorkspace } from '@/lib/workspace'
import { GRANTING_STATUSES } from '@/lib/entitlements'
import { RETURN_TO_RE, cellLabel } from '@/lib/billing'
import { SAVED_SELECTION_COLUMNS, type SavedSelectionRow } from '@/lib/saved-selections'
import { describeError, secondaryClass, type UiError } from '@/lib/ui-error'
import SignInPanel from '@/components/app/SignInPanel'
import SignOutButton from '@/components/app/SignOutButton'
import SavedSelectionsList from '@/components/app/SavedSelectionsList'
import PendingSelection from '@/components/app/PendingSelection'
import SubscriptionSection, {
  type SubscriptionLine,
} from '@/components/app/SubscriptionSection'

// The page reads the session out of the request cookies, so there is nothing
// here to prerender: a build-time copy would show one user's workspace to
// everyone who asked for it.
export const dynamic = 'force-dynamic'

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/

// Acquisition context only. A demo slug never grants membership: the server
// function takes identity from auth.uid() and ignores this value for access.
// A repeated ?demo= arrives as an array, which is not a slug and is dropped.
function readSlug(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string' || !SLUG_RE.test(value)) return null
  return value
}

/**
 * Where he was going when the sign-in stopped him. It is checked against the
 * shape of a surface address and nothing else is accepted: the value comes off
 * the query string, and a value off the query string that is handed to a
 * redirect is an open redirect unless something says otherwise. A repeated
 * ?next= arrives as an array, which is not a path and is dropped.
 */
function readNext(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string' || !RETURN_TO_RE.test(value)) return null
  return value
}

/** The rows the Subscription section is drawn from, as stored. */
type EntitlementListRow = {
  city: string
  trade: string
  status: string
  current_period_end: string
  cancel_at_period_end: boolean
}

const ENTITLEMENT_COLUMNS = 'city, trade, status, current_period_end, cancel_at_period_end'

/**
 * One row of right, in one sentence. Formatted here rather than in the island
 * because the date is formatted: a date turned into words in the browser and a
 * date turned into words on the server are two different strings, and React
 * would be right to complain about it.
 */
function subscriptionLine(row: EntitlementListRow): SubscriptionLine {
  const label = cellLabel(row.city, row.trade) ?? row.city + ' · ' + row.trade
  const date = new Date(row.current_period_end).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  // Same predicate as lib/entitlements.ts, written the same way round: an
  // unreadable term is not a live one.
  const termIsLive = Date.parse(row.current_period_end) > Date.now()

  let text: string
  if (GRANTING_STATUSES.has(row.status) && termIsLive) {
    text = row.cancel_at_period_end
      ? `${label} — active, ends ${date}`
      : `${label} — active, renews ${date}`
  } else if (!termIsLive) {
    text = `${label} — ended ${date}`
  } else {
    text = `${label} — ${row.status}`
  }

  return { key: row.city + '/' + row.trade, text }
}

function ErrorBlock({ error }: { error: UiError }) {
  return (
    <div className="rounded border border-hairline bg-slate px-4 py-3">
      <p className="text-sm text-hail">{error.headline}</p>
      {error.detail && (
        <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted">
          {error.detail}
        </p>
      )}
    </div>
  )
}

export default async function AppPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabase = supabaseSession()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user
  const next = readNext(searchParams.next)

  // No session, nothing else to decide: the sign-in island is the whole page,
  // and none of the reads below are even attempted. It is handed the way back,
  // so the code he types on this screen returns him to the one he left.
  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-hail">
          KnockPortal workspace
        </h1>
        <SignInPanel next={next} />
      </div>
    )
  }

  // Signed in and on his way somewhere else. He is sent on before anything is
  // read: he never asked for the workspace, and the reads below would only be
  // paid for by a page nobody sees. This is also the path a second visit takes
  // after the browser has kept the address.
  if (next) redirect(next)

  const workspace = await ensureWorkspace(supabase, readSlug(searchParams.demo))

  // Signed in but without a workspace, the selection list has no meaning: the
  // rows hang off a workspace that could not be resolved, so the page says so
  // and offers the two moves that are left rather than reading anything.
  if (!workspace.ok) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-hail">
          KnockPortal workspace
        </h1>

        <div className="mt-8 space-y-8">
          <section className="rounded border border-hairline bg-slate px-4 py-3">
            <div className="space-y-1 font-mono text-xs text-muted">
              <div>email: {user.email}</div>
            </div>
          </section>

          <section className="rounded border border-hairline bg-slate px-4 py-3">
            <p className="text-sm text-hail">
              Signed in, but the workspace could not be resolved.
            </p>
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted">
              {workspace.detail}
            </p>
            {/* A link and not a button: the lookup is idempotent, so asking for
                the page again is the whole retry, and a fresh request is the one
                thing a stale render cannot do for itself. */}
            <a href="/app" className={`${secondaryClass} mt-3 inline-block`}>
              Retry
            </a>
          </section>

          <SignOutButton />
        </div>
      </div>
    )
  }

  // Read under the caller's session: the SELECT policy already limits the rows
  // to workspaces this user belongs to, so a service-role read here would be a
  // second place where access is decided.
  const { data: rows, error: savedError } = await supabase
    .from('saved_selections')
    .select(SAVED_SELECTION_COLUMNS)
    .order('created_at', { ascending: false })
    .returns<SavedSelectionRow[]>()

  // A refused read costs the list, not the page: the diagnostics block below is
  // what a support ticket is written from, and it has to survive.
  const savedUiError = savedError ? describeError(savedError) : null

  // Under the session as well. The SELECT policy on entitlements limits the
  // rows to workspaces this user belongs to, which is the same fence the paid
  // wall is built on — reading them with the service-role client would be a
  // second answer to the question the wall already asks.
  const { data: rightRows, error: rightsError } = await supabase
    .from('entitlements')
    .select(ENTITLEMENT_COLUMNS)
    .order('city')
    .order('trade')
    .returns<EntitlementListRow[]>()

  const rightsUiError = rightsError ? describeError(rightsError) : null
  const subscriptionLines = (rightRows ?? []).map(subscriptionLine)

  return (
    <div className="mx-auto max-w-5xl px-5 py-16">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-hail">
        KnockPortal workspace
      </h1>

      <div className="mt-8 space-y-8">
        <PendingSelection />

        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-hail">
            Saved selections
          </h2>

          {savedUiError ? (
            <ErrorBlock error={savedUiError} />
          ) : (
            <SavedSelectionsList rows={rows ?? []} />
          )}
        </section>

        {rightsUiError ? (
          <section className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-hail">Subscription</h2>
            <ErrorBlock error={rightsUiError} />
          </section>
        ) : (
          <SubscriptionSection rows={subscriptionLines} />
        )}

        <section className="rounded border border-hairline bg-slate px-4 py-3">
          <div className="space-y-1 font-mono text-xs text-muted">
            <div>email: {user.email}</div>
            <div>workspace_id: {workspace.workspace.workspace_id}</div>
            <div>member_role: {workspace.workspace.member_role}</div>
            <div>is_new: {String(workspace.workspace.is_new)}</div>
          </div>
        </section>

        <SignOutButton />
      </div>
    </div>
  )
}
