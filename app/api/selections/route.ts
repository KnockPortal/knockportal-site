import { NextResponse } from 'next/server'
import { supabaseSession } from '@/lib/supabase-session'
import { SURFACE_CITY, SURFACE_TRADE } from '@/lib/surface'

export const runtime = 'nodejs'

// Upper bound on the address list. It comes from max_neighbours of the
// snapshot: a selection cannot hold more houses than the clusters contain, so
// anything past this is a malformed body rather than a large honest selection.
const MAX_ADDRESSES = 2000
const MAX_ADDRESS_LENGTH = 200
const MAX_TEXT_LENGTH = 200
const MAX_STAMP_LENGTH = 64

// Shape confirmed against pg_proc on 2026-08-30:
// ensure_workspace(p_source_demo_slug text)
//   RETURNS TABLE(workspace_id uuid, member_role text, is_new boolean)
// RETURNS TABLE means PostgREST hands back an array, not an object.
type EnsureWorkspaceRow = {
  workspace_id: string
  member_role: string
  is_new: boolean
}

type SelectionInsert = {
  workspace_id: string
  city: string
  trade: string
  snapshot_stamp: string
  nhood: string | null
  label: string | null
  center_lat: number | null
  center_lon: number | null
  addresses: string[]
}

function invalid(field: string) {
  return NextResponse.json({ error: 'invalid_request', field }, { status: 400 })
}

function readOptionalText(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || value.length > MAX_TEXT_LENGTH) return undefined
  return value
}

function readOptionalNumber(value: unknown): number | null | undefined {
  if (value === undefined || value === null) return null
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return value
}

/**
 * Creates a saved selection.
 *
 * This route exists because the surface is a vanilla script with no Supabase
 * client of its own: reading and deleting a selection happen in the browser
 * straight through RLS from the workspace page, but writing one has to come
 * from somewhere the surface can reach. The surface starts calling it in the
 * next pass; nothing calls it yet.
 *
 * The insert goes through the session client, so the row is written under the
 * caller's identity and the RLS policy — not the service role — decides whether
 * it is allowed. created_by is deliberately not sent: the column defaults to
 * auth.uid(), which is the one value a request body must never get to choose.
 */
export async function POST(request: Request) {
  const supabase = supabaseSession()
  const { data: auth, error: authError } = await supabase.auth.getUser()

  if (authError || !auth.user) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return invalid('body')
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return invalid('body')
  const input = body as Record<string, unknown>

  // The one filled combination. Anything else would store a selection for which
  // no snapshot exists, and it would open on an empty map.
  if (input.city !== SURFACE_CITY) return invalid('city')
  if (input.trade !== SURFACE_TRADE) return invalid('trade')

  const stamp = input.snapshot_stamp
  if (typeof stamp !== 'string' || stamp === '' || stamp.length > MAX_STAMP_LENGTH) {
    return invalid('snapshot_stamp')
  }

  const addresses = input.addresses
  if (
    !Array.isArray(addresses) ||
    addresses.length < 1 ||
    addresses.length > MAX_ADDRESSES
  ) {
    return invalid('addresses')
  }
  for (const entry of addresses) {
    if (typeof entry !== 'string' || entry === '' || entry.length > MAX_ADDRESS_LENGTH) {
      return invalid('addresses')
    }
  }

  const nhood = readOptionalText(input.nhood)
  if (nhood === undefined) return invalid('nhood')
  const label = readOptionalText(input.label)
  if (label === undefined) return invalid('label')
  const centerLat = readOptionalNumber(input.center_lat)
  if (centerLat === undefined) return invalid('center_lat')
  const centerLon = readOptionalNumber(input.center_lon)
  if (centerLon === undefined) return invalid('center_lon')

  // A user can sign in and never open the workspace page, in which case no
  // workspace row exists yet and the insert would be refused by its policy for
  // a reason that has nothing to do with the request. The function is
  // idempotent, so calling it on every write costs a round trip and no state.
  // The argument is passed explicitly: acquisition context belongs to the first
  // touch in the workspace page, and this call must not overwrite it.
  const { data: rows, error: rpcError } = await supabase.rpc('ensure_workspace', {
    p_source_demo_slug: null,
  })
  if (rpcError) {
    console.error('[selections] ensure_workspace failed:', rpcError.message)
    return NextResponse.json({ error: 'workspace_unavailable' }, { status: 500 })
  }
  const workspaces = (rows ?? []) as EnsureWorkspaceRow[]
  if (workspaces.length === 0) {
    console.error('[selections] ensure_workspace returned no rows')
    return NextResponse.json({ error: 'workspace_unavailable' }, { status: 500 })
  }

  const row: SelectionInsert = {
    workspace_id: workspaces[0].workspace_id,
    city: SURFACE_CITY,
    trade: SURFACE_TRADE,
    snapshot_stamp: stamp,
    nhood,
    label,
    center_lat: centerLat,
    center_lon: centerLon,
    addresses: addresses as string[],
  }

  const { data: inserted, error: insertError } = await supabase
    .from('saved_selections')
    .insert(row)
    .select('id')
    .single<{ id: string }>()

  if (insertError || !inserted) {
    // The service string stays in the server log: it names columns and policies,
    // and the caller has no use for either.
    console.error('[selections] insert failed:', insertError?.message)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  return NextResponse.json({ id: inserted.id }, { status: 201 })
}
