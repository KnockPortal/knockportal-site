import { NextResponse } from 'next/server'
import { supabaseSession } from '@/lib/supabase-session'

export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const SELECTION_COLUMNS =
  'id, city, trade, snapshot_stamp, nhood, label, center_lat, center_lon, addresses, created_at'

type SavedSelection = {
  id: string
  city: string
  trade: string
  snapshot_stamp: string
  nhood: string | null
  label: string | null
  center_lat: number | null
  center_lon: number | null
  addresses: string[]
  created_at: string
}

/**
 * Returns one saved selection so the surface — a vanilla script with no
 * Supabase client — can restore it from ?selection=<id>. The surface reads that
 * parameter and calls this route — see public/assets/surface/page.js.
 *
 * Ownership is not checked here, and deliberately so: the read goes through the
 * session client, and the SELECT policy already limits the rows to the caller's
 * workspaces. A second check in this file would be a second source of truth
 * about access, and the two would drift.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = supabaseSession()
  const { data: auth, error: authError } = await supabase.auth.getUser()

  if (authError || !auth.user) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  }

  // A malformed id is a row that does not exist, and it answers like one.
  // Passing it through would make PostgREST fail on the uuid cast and turn a
  // plain 404 into a service error.
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('saved_selections')
    .select(SELECTION_COLUMNS)
    .eq('id', params.id)
    .maybeSingle<SavedSelection>()

  if (error) {
    console.error('[selections] read failed:', error.message)
    return NextResponse.json({ error: 'read_failed' }, { status: 500 })
  }

  // Someone else's row comes back as no row at all, so this single answer covers
  // both cases and the two stay indistinguishable from outside.
  if (!data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  return NextResponse.json(data, { status: 200 })
}

/**
 * Deletes one saved selection. The workspace page calls it: the list is read on
 * the server now, and a browser-side delete would need a Supabase client in a
 * component that otherwise has none.
 *
 * Ownership is not checked here either, for the same reason as the read: the
 * delete goes through the session client and the DELETE policy decides. A row
 * belonging to someone else is refused by that policy, comes back as no row,
 * and is answered as a row that does not exist.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = supabaseSession()
  const { data: auth, error: authError } = await supabase.auth.getUser()

  if (authError || !auth.user) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  }

  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // The returned id is what separates "deleted" from "there was nothing to
  // delete": a delete that matches no row is not an error in PostgREST.
  const { data, error } = await supabase
    .from('saved_selections')
    .delete()
    .eq('id', params.id)
    .select('id')
    .returns<{ id: string }[]>()

  if (error) {
    console.error('[selections] delete failed:', error.message)
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  return NextResponse.json({ id: data[0].id }, { status: 200 })
}
