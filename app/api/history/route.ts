import { NextResponse } from 'next/server'
import { supabaseSession } from '@/lib/supabase-session'
import { ensureWorkspace } from '@/lib/workspace'
import { technicalLine } from '@/lib/ui-error'
import { MAX_ADDRESS_LENGTH } from '@/lib/mailing'
import { SURFACE_CITY, SURFACE_TRADE } from '@/lib/surface'
import {
  MANUAL_KINDS,
  type HistoryEntry,
  type HistoryKind,
  loadHistory,
  recordEvent,
} from '@/lib/history'

export const runtime = 'nodejs'

/**
 * Nothing here may be cached by anything: the answer is one man's history of one
 * cell, and it is read out of his session cookie.
 */
function noStore(response: NextResponse) {
  response.headers.set('cache-control', 'private, no-store')
  return response
}

function invalid(field: string) {
  return noStore(NextResponse.json({ error: 'invalid_request', field }, { status: 400 }))
}

/** The one shape both methods answer with, so the client applies them alike. */
function history200(signedIn: boolean, addresses: HistoryEntry[]) {
  return noStore(
    NextResponse.json({ signed_in: signedIn, addresses }, { status: 200 }),
  )
}

function failed(where: string, e: unknown) {
  // The service string names tables and policies; the caller has no use for it.
  console.error('[history] ' + where + ' failed:', technicalLine(e))
  return noStore(NextResponse.json({ error: 'history_unavailable' }, { status: 500 }))
}

function unavailable() {
  return noStore(NextResponse.json({ error: 'workspace_unavailable' }, { status: 503 }))
}

/**
 * The history of one cell.
 *
 * A guest gets a 200 and an empty list, not a 401. The surface is open to
 * anyone and asks this on every load; a person who is not signed in has no
 * history, and that is an answer rather than a refusal — a 401 here would turn
 * the ordinary state of the public page into an error in the console of every
 * visitor. signed_in is the flag that carries the difference, and it is the only
 * thing page.js ever learns about a session.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  // The one filled combination. Anything else has no snapshot behind it and
  // therefore no address that could have a history.
  if (params.get('city') !== SURFACE_CITY) return invalid('city')
  if (params.get('trade') !== SURFACE_TRADE) return invalid('trade')

  try {
    const supabase = supabaseSession()
    const { data: auth, error: authError } = await supabase.auth.getUser()
    if (authError || !auth.user) return history200(false, [])

    // Idempotent, and the slug is an explicit null: p_source_demo_slug belongs
    // to the first touch in the workspace page and must not be overwritten here.
    const workspace = await ensureWorkspace(supabase, null)
    if (!workspace.ok) {
      console.error('[history] ensure_workspace failed:', workspace.detail)
      return unavailable()
    }

    const addresses = await loadHistory(
      supabase,
      workspace.workspace.workspace_id,
      SURFACE_CITY,
      SURFACE_TRADE,
    )
    return history200(true, addresses)
  } catch (e) {
    return failed('GET', e)
  }
}

/**
 * One hand-made event: a house struck off, or one put back.
 *
 * The body is checked whole before anything is read or written — a malformed
 * request is a 400 whether or not the caller has a workspace. `sent` and
 * `walked` are refused here as malformed and not as forbidden: they are not
 * things a person claims, they are things the machinery that did them records,
 * and a body carrying one is a body naming a kind this route does not take.
 *
 * The answer is the whole list after the write, the same shape GET returns: the
 * client replaces its set rather than patching it, exactly as it does with the
 * mailing.
 */
export async function POST(request: Request) {
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

  if (input.city !== SURFACE_CITY) return invalid('city')
  if (input.trade !== SURFACE_TRADE) return invalid('trade')

  const address = input.address
  if (
    typeof address !== 'string' ||
    address === '' ||
    address.length > MAX_ADDRESS_LENGTH
  ) {
    return invalid('address')
  }

  const kind = input.kind
  if (
    typeof kind !== 'string' ||
    !(MANUAL_KINDS as readonly string[]).includes(kind)
  ) {
    return invalid('kind')
  }

  try {
    const workspace = await ensureWorkspace(supabase, null)
    if (!workspace.ok) {
      console.error('[history] ensure_workspace failed:', workspace.detail)
      return unavailable()
    }
    const workspaceId = workspace.workspace.workspace_id

    // No mailing stands behind a hand-made event: the column is there for the
    // print run, which knows which mailing a postcard left in.
    await recordEvent(supabase, {
      workspace_id: workspaceId,
      city: SURFACE_CITY,
      trade: SURFACE_TRADE,
      address,
      kind: kind as HistoryKind,
      mailing_id: null,
    })

    const addresses = await loadHistory(
      supabase,
      workspaceId,
      SURFACE_CITY,
      SURFACE_TRADE,
    )
    return history200(true, addresses)
  } catch (e) {
    return failed('POST', e)
  }
}
