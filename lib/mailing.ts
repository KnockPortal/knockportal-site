import type { SupabaseClient } from '@supabase/supabase-js'
import { technicalLine } from '@/lib/ui-error'

/**
 * What print and postage cost for one postcard, in cents. This is the only
 * place in the project where that number is set. The vendor said $0.56 and put
 * nothing in writing behind it; the difference between their number and this
 * one is the markup. It is not the price of the subscription and not the final
 * price of a postcard, and it is published neither on the marketing pages nor
 * in checkout.
 */
export const PRINT_COST_CENTS_PER_PIECE = 76

/** Ceiling on one mailing, whatever it was collected from. */
export const MAX_MAILING_ADDRESSES = 2000
/**
 * Ceiling on one request, and it is the ceiling of the whole mailing on purpose.
 * A mailing is collected group by group, but a group goes over whole — that is
 * what the button does — and a group is as large as the snapshot made it. So the
 * only honest bound on one request is the bound on what it is being added to:
 * anything stricter would refuse a group the surface is willing to pick.
 */
export const MAX_ADDRESSES_PER_REQUEST = MAX_MAILING_ADDRESSES

export const MAX_ADDRESS_LENGTH = 200
export const MAX_TEXT_LENGTH = 200
/**
 * One hundred and twenty, from the check constraint on mailing_addresses.nhood —
 * where label is allowed the full 200. It is written here so the route refuses
 * before the database does; if the constraint ever changes, this number moves
 * with it and nothing else does.
 */
export const MAX_NHOOD_LENGTH = 120
/**
 * Forty, where the export route says sixty-four: mailing_addresses.snapshot_stamp
 * is constrained to 1…40 in the schema, and the route has to refuse before the
 * database does — otherwise a long stamp comes back as a 500 rather than as the
 * malformed request it is.
 */
export const MAX_STAMP_LENGTH = 40
export const STAMP_RE = /^[0-9A-Za-z._-]+$/

/**
 * The anonymous draft's whole proof of ownership. httpOnly, so the surface
 * script cannot read it and nothing but this server ever needs to: RLS grants
 * anon no write on either table, so every write below runs through the
 * service-role client and holding the cookie is what stands in for identity.
 */
export const ANON_COOKIE = 'kp_anon'
export const ANON_COOKIE_MAX_AGE = 60 * 60 * 24 * 180
/**
 * The cookie is uuid-shaped because anon_id is a uuid column. A value that is
 * not one is never sent to the database: it would come back as a type error on
 * every query rather than as the empty cart it really means.
 */
export const ANON_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Who a draft belongs to. Two owners and no third: a guest holding the cookie,
 * or a workspace. The constraint mailings_owner_present says the same thing in
 * the schema — a draft with neither cannot be inserted.
 */
export type MailingOwner =
  | { kind: 'anon'; anonId: string }
  | { kind: 'workspace'; workspaceId: string }

/** What both routes answer with: the whole cart, counted by the server. */
export type MailingCart = {
  mailing_id: string | null
  count: number
  addresses: string[]
  print_cost_cents: number
}

export function emptyCart(): MailingCart {
  return { mailing_id: null, count: 0, addresses: [], print_cost_cents: 0 }
}

/** The one place money is counted. The surface formats what it is handed. */
export function printCostCents(count: number): number {
  return count * PRINT_COST_CENTS_PER_PIECE
}

/**
 * The open draft of this owner in this cell, or null.
 *
 * The two partial unique indexes — (anon_id, city, trade) where the workspace is
 * null, (workspace_id, city, trade) where it is not — mean there is at most one
 * row to find, so maybeSingle is honest here: no row is the ordinary state of a
 * cell nobody has collected in yet.
 */
export async function findMailing(
  admin: SupabaseClient,
  owner: MailingOwner,
  city: string,
  trade: string,
): Promise<string | null> {
  const base = admin.from('mailings').select('id').eq('city', city).eq('trade', trade)
  const query =
    owner.kind === 'anon'
      ? base.eq('anon_id', owner.anonId).is('workspace_id', null)
      : base.eq('workspace_id', owner.workspaceId)

  const { data, error } = await query.maybeSingle<{ id: string }>()
  if (error) throw new Error('mailing lookup failed · ' + technicalLine(error))
  return data ? data.id : null
}

export async function createMailing(
  admin: SupabaseClient,
  owner: MailingOwner,
  city: string,
  trade: string,
): Promise<string> {
  // Both columns are written every time, one of them null: the constraint
  // mailings_owner_present asks for exactly one owner, and saying which is
  // absent is the same statement as leaving it out.
  const row = {
    anon_id: owner.kind === 'anon' ? owner.anonId : null,
    workspace_id: owner.kind === 'workspace' ? owner.workspaceId : null,
    city,
    trade,
  }

  const { data, error } = await admin
    .from('mailings')
    .insert(row)
    .select('id')
    .single<{ id: string }>()

  if (error || !data) throw new Error('mailing insert failed · ' + technicalLine(error))
  return data.id
}

/**
 * The cart as it stands. Addresses come back in the order they were added, so a
 * mailing collected over three groups reads in the order it was worked.
 */
export async function loadCart(
  admin: SupabaseClient,
  mailingId: string | null,
): Promise<MailingCart> {
  if (!mailingId) return emptyCart()

  const { data, error } = await admin
    .from('mailing_addresses')
    .select('address')
    .eq('mailing_id', mailingId)
    .order('added_at', { ascending: true })

  if (error) throw new Error('mailing addresses read failed · ' + technicalLine(error))

  const addresses = ((data ?? []) as { address: string }[]).map((row) => row.address)
  return {
    mailing_id: mailingId,
    count: addresses.length,
    addresses,
    print_cost_cents: printCostCents(addresses.length),
  }
}

/**
 * Hands every anonymous draft of this cookie to the workspace.
 *
 * Per cell, one of two moves. If the workspace already has a draft in that cell
 * the addresses are copied into it and the anonymous draft is dropped; the
 * copy ignores conflicts on the primary key, so an address collected on both
 * sides stays one address. Otherwise the row itself changes hands.
 *
 * Insert first, delete second, and never the other way round: there is no
 * transaction here, and the worst a broken connection can leave behind in this
 * order is a draft that got copied and not dropped — a duplicate the next call
 * merges again, because the copy is idempotent. The reverse order loses
 * addresses outright, which is the one outcome worth writing a comment about.
 */
export async function claimAnonMailings(
  admin: SupabaseClient,
  anonId: string,
  workspaceId: string,
): Promise<void> {
  const { data, error } = await admin
    .from('mailings')
    .select('id, city, trade')
    .eq('anon_id', anonId)
    .is('workspace_id', null)

  if (error) throw new Error('anon mailings lookup failed · ' + technicalLine(error))
  const drafts = (data ?? []) as { id: string; city: string; trade: string }[]

  for (const draft of drafts) {
    const target = await findMailing(
      admin,
      { kind: 'workspace', workspaceId },
      draft.city,
      draft.trade,
    )

    if (!target) {
      const { error: moveError } = await admin
        .from('mailings')
        .update({ workspace_id: workspaceId, anon_id: null })
        .eq('id', draft.id)
      if (moveError) throw new Error('mailing claim failed · ' + technicalLine(moveError))
      continue
    }

    const { data: rows, error: readError } = await admin
      .from('mailing_addresses')
      .select('address, snapshot_stamp, nhood, label, added_at')
      .eq('mailing_id', draft.id)

    if (readError) throw new Error('mailing merge read failed · ' + technicalLine(readError))

    const carried = (rows ?? []) as Record<string, unknown>[]
    if (carried.length > 0) {
      // added_at travels with the address so the merged draft keeps the order
      // the man collected it in.
      const { error: mergeError } = await admin
        .from('mailing_addresses')
        .upsert(
          carried.map((row) => ({ ...row, mailing_id: target })),
          { onConflict: 'mailing_id,address', ignoreDuplicates: true },
        )
      if (mergeError) throw new Error('mailing merge failed · ' + technicalLine(mergeError))
    }

    // The addresses go with it, by the cascade on the foreign key.
    const { error: dropError } = await admin.from('mailings').delete().eq('id', draft.id)
    if (dropError) throw new Error('mailing drop failed · ' + technicalLine(dropError))
  }
}
