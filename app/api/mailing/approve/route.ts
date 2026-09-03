import { NextResponse } from 'next/server'
import { supabaseSession } from '@/lib/supabase-session'
import { supabaseAdmin } from '@/lib/supabase-server'
import { ensureWorkspace } from '@/lib/workspace'
import { readEntitlement } from '@/lib/entitlements'
import { technicalLine } from '@/lib/ui-error'
import { SURFACE_CITY, SURFACE_TRADE } from '@/lib/surface'
import { MAX_STAMP_LENGTH, STAMP_RE, findMailing, printCostCents } from '@/lib/mailing'

export const runtime = 'nodejs'

/**
 * Writes the approval onto the draft.
 *
 * The order of the checks mirrors the send gate, because it is the same wall:
 * a session, then a well-formed body, then a workspace, then the right. The
 * screen this is clicked from already stands behind all four, so none of them
 * is expected to fire — which is exactly why they are here. A route that is
 * only ever reached through one page is still a route, and the page is not what
 * makes it safe.
 *
 * What the body may say is one thing: which snapshot the numbers were read
 * against. It may not say how many addresses there are and it may not say what
 * they cost — both are counted here, out of the rows, because an approval that
 * took its own figures from the caller would be the caller approving whatever
 * he liked.
 *
 * The count is read under the session client and the write goes through
 * service-role. That split is not a shortcut: mailings and mailing_addresses
 * carry SELECT for members and no write policy for anyone at all, so every
 * write in this project runs through service-role — and the read stays under
 * the session so that what is approved is what the man could see.
 */

/** One person's mailing. Nothing between here and them may keep a copy. */
function noStore(response: NextResponse) {
  response.headers.set('cache-control', 'private, no-store')
  return response
}

function invalid(field: string) {
  return noStore(NextResponse.json({ error: 'invalid_request', field }, { status: 400 }))
}

export async function POST(request: Request) {
  try {
    const supabase = supabaseSession()
    const { data: auth, error: authError } = await supabase.auth.getUser()
    if (authError || !auth.user) {
      return noStore(NextResponse.json({ error: 'auth_required' }, { status: 401 }))
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return invalid('body')
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return invalid('body')
    const input = body as Record<string, unknown>

    // The one filled combination. A mailing belongs to a cell of the grid, and
    // there is no second cell to belong to yet.
    if (input.city !== SURFACE_CITY) return invalid('city')
    if (input.trade !== SURFACE_TRADE) return invalid('trade')

    // Checked as a path segment, the way every other stamp in the project is:
    // it is stored, and a value that is stored is a value something later will
    // paste into a bucket URL.
    const stamp = input.snapshot_stamp
    if (
      typeof stamp !== 'string' ||
      stamp === '' ||
      stamp.length > MAX_STAMP_LENGTH ||
      !STAMP_RE.test(stamp)
    ) {
      return invalid('snapshot_stamp')
    }

    const workspace = await ensureWorkspace(supabase, null)
    if (!workspace.ok) {
      console.error('[mailing/approve] ensure_workspace failed:', workspace.detail)
      return noStore(NextResponse.json({ error: 'workspace_unavailable' }, { status: 503 }))
    }
    const workspaceId = workspace.workspace.workspace_id

    // The session client, and never the service-role one — the same rule the
    // send gate is written under. A right that could not be read is not a
    // right, so the failure refuses rather than passing through.
    const check = await readEntitlement(supabase, workspaceId, SURFACE_CITY, SURFACE_TRADE)
    if (!check.ok) {
      console.error('[mailing/approve] entitlement read failed:', check.detail)
      return noStore(NextResponse.json({ error: 'right_unknown' }, { status: 503 }))
    }
    // No offer rides along here. The screen this was clicked from stands behind
    // the same wall, so a refusal at this point is a session that changed under
    // a page already open — there is nothing to sell to someone who is looking
    // at a screen he can no longer see.
    if (!check.granted) {
      return noStore(
        NextResponse.json(
          { error: 'subscription_required', reason: check.reason },
          { status: 402 },
        ),
      )
    }

    // Both reads under the session: what is approved has to be what he was
    // shown, and the page drew it from these same two policies.
    const mailingId = await findMailing(
      supabase,
      { kind: 'workspace', workspaceId },
      SURFACE_CITY,
      SURFACE_TRADE,
    )
    if (!mailingId) {
      return noStore(NextResponse.json({ error: 'mailing_empty' }, { status: 409 }))
    }

    const { count, error: countError } = await supabase
      .from('mailing_addresses')
      .select('address', { count: 'exact', head: true })
      .eq('mailing_id', mailingId)

    if (countError) {
      throw new Error('mailing addresses count failed · ' + technicalLine(countError))
    }

    // A draft row with no addresses under it is an empty mailing and not a
    // missing one, and both answer the same way: there is nothing to approve.
    const n = count ?? 0
    if (n < 1) {
      return noStore(NextResponse.json({ error: 'mailing_empty' }, { status: 409 }))
    }

    // The four columns go in together. They are one statement — this many
    // doors, at this price, against that snapshot, at this moment — and the row
    // is never left holding part of it.
    const now = new Date().toISOString()
    const { error: writeError } = await supabaseAdmin()
      .from('mailings')
      .update({
        approved_at: now,
        approved_count: n,
        approved_price_cents: printCostCents(n),
        approved_snapshot_stamp: stamp,
        updated_at: now,
      })
      .eq('id', mailingId)

    if (writeError) {
      throw new Error('mailing approve write failed · ' + technicalLine(writeError))
    }

    // Nothing of the row comes back. The page re-renders on the server after
    // this and reads the approval from the table, so an answer carrying a copy
    // of it would be a second version of the truth with a shorter life.
    return noStore(NextResponse.json({ ok: true }, { status: 200 }))
  } catch (e) {
    console.error('[mailing/approve] failed:', technicalLine(e))
    return noStore(NextResponse.json({ error: 'approve_failed' }, { status: 500 }))
  }
}
