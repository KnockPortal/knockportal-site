import { supabaseSession } from '@/lib/supabase-session'
import { ensureWorkspace } from '@/lib/workspace'
import { SAVED_SELECTION_COLUMNS, type SavedSelectionRow } from '@/lib/saved-selections'
import { describeError, secondaryClass, type UiError } from '@/lib/ui-error'
import SignInPanel from '@/components/app/SignInPanel'
import SignOutButton from '@/components/app/SignOutButton'
import SavedSelectionsList from '@/components/app/SavedSelectionsList'
import PendingSelection from '@/components/app/PendingSelection'

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

  // No session, nothing else to decide: the sign-in island is the whole page,
  // and none of the reads below are even attempted.
  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-hail">
          KnockPortal workspace
        </h1>
        <SignInPanel />
      </div>
    )
  }

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
