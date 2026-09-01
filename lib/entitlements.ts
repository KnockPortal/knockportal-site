import type { SupabaseClient } from '@supabase/supabase-js'
import { technicalLine } from '@/lib/ui-error'

// The right is bought on a cell of the grid, so it is stored as one row per
// workspace × city × trade. Two statuses grant it and nothing else does — a card
// that stopped paying leaves the workspace without the right, and no grace
// period is offered on the product side, so `past_due` is not on this list.
export const GRANTING_STATUSES: ReadonlySet<string> = new Set(['active', 'trialing'])

// Three columns, because three columns are all anyone reads. `id`,
// `stripe_subscription_id`, `created_at` and `updated_at` are left in the table
// on purpose: no consumer of the right looks at them, and a row shape that
// carries them invites someone to start.
export type EntitlementRow = {
  status: string
  current_period_end: string
  cancel_at_period_end: boolean
}

// A tagged union rather than a bare boolean: the three ways a check can come
// back without the right need different words from the caller — nothing was ever
// bought, the subscription is no longer in good standing, or the term ran out —
// and a false would make every caller guess which one it got.
export type EntitlementCheck =
  | { ok: true; granted: true; row: EntitlementRow }
  | { ok: true; granted: false; reason: 'none' | 'status' | 'expired'; row: EntitlementRow | null }
  | { ok: false; reason: 'query_failed'; detail: string }

/**
 * The one place that reads an entitlement. The client comes in as an argument
 * and is never built here: the caller hands over its session client, so
 * everything this query can see is what the signed-in person can see.
 *
 * The filter on workspace_id is the lookup key, not a second ownership check.
 * Ownership is settled by the RLS policy on the table; the key is here because
 * the right is looked up in one particular cell of the grid, and a person can
 * belong to more than one workspace.
 *
 * The term is compared in TypeScript while the truth about it stays in the
 * database. Keeping the predicate in a single place is what makes both future
 * call sites answer the same way; clocks that disagree by seconds do not matter
 * against a boundary a month wide.
 *
 * It neither logs nor builds an HTTP response. A page turns the refusal into a
 * section on screen and a route turns it into a status code, and neither shape
 * belongs to the read itself.
 */
export async function readEntitlement(
  supabase: SupabaseClient,
  workspaceId: string,
  city: string,
  trade: string,
): Promise<EntitlementCheck> {
  // The unique index on (workspace_id, city, trade) means there is never more
  // than one row here, so maybeSingle is honest: no row is an ordinary outcome
  // of asking about a cell nobody bought, not a failure.
  const { data, error } = await supabase
    .from('entitlements')
    .select('status, current_period_end, cancel_at_period_end')
    .eq('workspace_id', workspaceId)
    .eq('city', city)
    .eq('trade', trade)
    .maybeSingle()

  if (error) {
    return { ok: false, reason: 'query_failed', detail: technicalLine(error) }
  }

  if (!data) {
    return { ok: true, granted: false, reason: 'none', row: null }
  }

  const row = data as EntitlementRow

  if (!GRANTING_STATUSES.has(row.status)) {
    return { ok: true, granted: false, reason: 'status', row }
  }

  // The comparison is written the way the right is granted rather than the way it
  // is refused. Date.parse answers NaN on a string it cannot read, and every
  // comparison against NaN is false, so asking whether the term is still ahead of
  // us drops an unreadable date into the refusal instead of letting it fall
  // through to the right. Nothing reaches that today — the column is timestamptz
  // not null and PostgREST hands back ISO-8601 — but this module is the paid wall,
  // and a wall that opens on a state it does not understand is not a wall. An
  // unreadable term answers 'expired' rather than earning a fourth reason: a state
  // the column type makes unreachable does not deserve a name in the contract.
  const termEnd = Date.parse(row.current_period_end)
  const termIsLive = termEnd > Date.now()

  if (!termIsLive) {
    return { ok: true, granted: false, reason: 'expired', row }
  }

  return { ok: true, granted: true, row }
}
