import type { SupabaseClient } from '@supabase/supabase-js'
import { technicalLine } from '@/lib/ui-error'

/**
 * What has already been done to an address in one cell, so that the next draft
 * does not offer it again.
 *
 * Events, not statuses. A postcard that went out, a door that was knocked and a
 * house struck off by hand are three things that happened on a date, and none of
 * them is a field that can be edited afterwards — address_events carries a
 * select and an insert policy and no update or delete, which says the same thing
 * in the schema. What an address is right now is therefore read and never
 * stored: the last event by occurred_at wins, ties broken by created_at, and
 * `restored` is the event whose meaning is that the address is clean again.
 *
 * Everything here runs under the caller's session client. The service role has
 * no business in this table: every row belongs to a person, and the policies are
 * what decide whether it may be written.
 */

export const HISTORY_KINDS = ['sent', 'walked', 'excluded', 'restored'] as const
export type HistoryKind = (typeof HISTORY_KINDS)[number]

/**
 * What POST /api/history accepts. The other two are recorded by the machinery
 * that does the thing — print for `sent`, and nothing yet for `walked` — and a
 * request body must not be able to claim either of them happened.
 */
export const MANUAL_KINDS = ['excluded', 'restored'] as const

/**
 * One address the contractor is done with. `restored` cannot appear here: an
 * address whose last event is a restore has no history left to report, and the
 * type says so rather than leaving the client to filter.
 */
export type HistoryEntry = {
  a: string
  kind: Exclude<HistoryKind, 'restored'>
  occurred_at: string
}

type EventRow = {
  address: string
  kind: HistoryKind
  occurred_at: string
  created_at: string
}

/**
 * The current state of every address of one cell, as the events leave it.
 *
 * Ordered newest first in the database and folded here, so the first row seen
 * for an address is the one that counts and the rest are the trail behind it.
 * The whole cell is read rather than one address at a time: the surface asks
 * once per load and holds the answer as a set.
 */
export async function loadHistory(
  supabase: SupabaseClient,
  workspaceId: string,
  city: string,
  trade: string,
): Promise<HistoryEntry[]> {
  const { data, error } = await supabase
    .from('address_events')
    .select('address, kind, occurred_at, created_at')
    .eq('workspace_id', workspaceId)
    .eq('city', city)
    .eq('trade', trade)
    .order('occurred_at', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error('history read failed · ' + technicalLine(error))

  const latest = new Map<string, EventRow>()
  for (const row of (data ?? []) as EventRow[]) {
    if (!latest.has(row.address)) latest.set(row.address, row)
  }

  const live: HistoryEntry[] = []
  latest.forEach((row) => {
    if (row.kind === 'restored') return
    live.push({
      a: row.address,
      kind: row.kind as Exclude<HistoryKind, 'restored'>,
      occurred_at: row.occurred_at,
    })
  })
  // By address, because that is the order the panel reads them in and the only
  // order that means anything to the man looking at a street.
  return live.sort((u, v) => u.a.localeCompare(v.a))
}

/**
 * The one writer of the table.
 *
 * created_by is deliberately absent from the row: the column defaults to
 * auth.uid(), and that is the one value a request body must never get to
 * choose. The writer of `sent` arrives with the print run and calls this same
 * function; if it ever runs under the service role rather than a session it will
 * have to pass created_by explicitly, because there is no auth.uid() to default
 * to. No such call exists today.
 */
export async function recordEvent(
  supabase: SupabaseClient,
  row: {
    workspace_id: string
    city: string
    trade: string
    address: string
    kind: HistoryKind
    mailing_id?: string | null
  },
): Promise<void> {
  const { error } = await supabase.from('address_events').insert(row)
  if (error) throw new Error('history insert failed · ' + technicalLine(error))
}
