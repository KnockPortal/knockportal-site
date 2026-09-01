import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseSession } from '@/lib/supabase-session'
import { supabaseAdmin } from '@/lib/supabase-server'
import { ensureWorkspace } from '@/lib/workspace'
import { technicalLine } from '@/lib/ui-error'
import { SURFACE_CITY, SURFACE_TRADE } from '@/lib/surface'
import {
  ANON_COOKIE,
  ANON_COOKIE_MAX_AGE,
  ANON_RE,
  MAX_ADDRESSES_PER_REQUEST,
  MAX_ADDRESS_LENGTH,
  MAX_MAILING_ADDRESSES,
  MAX_NHOOD_LENGTH,
  MAX_STAMP_LENGTH,
  MAX_TEXT_LENGTH,
  STAMP_RE,
  claimAnonMailings,
  createMailing,
  emptyCart,
  findMailing,
  loadCart,
  type MailingCart,
  type MailingOwner,
} from '@/lib/mailing'

export const runtime = 'nodejs'

const OPS = ['add', 'remove', 'clear'] as const
type Op = (typeof OPS)[number]

/**
 * Nothing here may be cached by anything: the answer is one man's mailing, and
 * on the guest path it is keyed by a cookie a shared cache cannot see.
 */
function noStore(response: NextResponse) {
  response.headers.set('cache-control', 'private, no-store')
  return response
}

function invalid(field: string) {
  return noStore(NextResponse.json({ error: 'invalid_request', field }, { status: 400 }))
}

function cart200(cart: MailingCart) {
  return noStore(NextResponse.json(cart, { status: 200 }))
}

function failed(where: string, e: unknown) {
  // The service string names tables and columns; the caller has no use for it.
  console.error('[mailing] ' + where + ' failed:', technicalLine(e))
  return noStore(NextResponse.json({ error: 'mailing_unavailable' }, { status: 500 }))
}

type Resolved =
  | { ok: true; owner: MailingOwner | null }
  | { ok: false; response: NextResponse }

/**
 * Who this request is collecting for.
 *
 * A signed-in person collects for their workspace, and whatever they collected
 * before signing in comes with them: the cookie is still on the request, so the
 * drafts it owns are handed over here, before anything is read back. A guest
 * collects under the cookie alone. A request with neither has no owner yet, and
 * what that means is the method's business — GET answers empty, POST mints one.
 *
 * The cookie is never issued here. This runs on GET too, and the surface page is
 * open to robots: handing an identifier to every crawler that touches it would
 * write a draft row for each of them.
 */
async function resolveOwner(): Promise<Resolved> {
  const cookieValue = cookies().get(ANON_COOKIE)?.value
  const anonId = cookieValue && ANON_RE.test(cookieValue) ? cookieValue : null

  const supabase = supabaseSession()
  const { data: auth, error: authError } = await supabase.auth.getUser()

  if (authError || !auth.user) {
    return { ok: true, owner: anonId ? { kind: 'anon', anonId } : null }
  }

  // Idempotent, and the slug is passed as an explicit null: p_source_demo_slug
  // belongs to the first touch in the workspace page and must not be overwritten
  // from here.
  const workspace = await ensureWorkspace(supabase, null)
  if (!workspace.ok) {
    console.error('[mailing] ensure_workspace failed:', workspace.detail)
    return {
      ok: false,
      response: noStore(
        NextResponse.json({ error: 'workspace_unavailable' }, { status: 503 }),
      ),
    }
  }

  const workspaceId = workspace.workspace.workspace_id
  if (anonId) await claimAnonMailings(supabaseAdmin(), anonId, workspaceId)
  return { ok: true, owner: { kind: 'workspace', workspaceId } }
}

function readAddresses(value: unknown): string[] | null {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > MAX_ADDRESSES_PER_REQUEST
  ) {
    return null
  }
  for (const entry of value) {
    if (typeof entry !== 'string' || entry === '' || entry.length > MAX_ADDRESS_LENGTH) {
      return null
    }
  }
  return value as string[]
}

// The limit comes in as an argument because the two texts do not share one:
// the schema gives nhood 120 characters and label 200.
function readOptionalText(value: unknown, max: number): string | null | undefined {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || value.length > max) return undefined
  return value
}

/** The draft moved, so the row that carries it says when. */
async function touchMailing(
  admin: ReturnType<typeof supabaseAdmin>,
  mailingId: string,
): Promise<void> {
  const { error } = await admin
    .from('mailings')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', mailingId)
  if (error) throw new Error('mailing touch failed · ' + technicalLine(error))
}

/**
 * Reads the mailing. Never writes, never issues the cookie, never creates a
 * draft: a cell nobody has collected in answers with an empty cart, which is the
 * truth about it and costs no row.
 */
export async function GET(request: Request) {
  try {
    const resolved = await resolveOwner()
    if (!resolved.ok) return resolved.response

    const params = new URL(request.url).searchParams
    if (params.get('city') !== SURFACE_CITY) return invalid('city')
    if (params.get('trade') !== SURFACE_TRADE) return invalid('trade')

    if (!resolved.owner) return cart200(emptyCart())

    const admin = supabaseAdmin()
    const mailingId = await findMailing(admin, resolved.owner, SURFACE_CITY, SURFACE_TRADE)
    return cart200(await loadCart(admin, mailingId))
  } catch (e) {
    return failed('GET', e)
  }
}

/**
 * Changes the mailing and answers with the whole of it. The surface keeps no
 * count of its own: what it draws is what came back from here.
 *
 * Every read and write of both tables goes through the service-role client.
 * That is not a shortcut around the policies — RLS on mailings and
 * mailing_addresses carries SELECT for members and no write policy for anyone
 * at all, so a guest's draft cannot be written under any other identity. The
 * session client is used for the two things it is the only honest source of:
 * who the caller is, and which workspace is theirs.
 */
export async function POST(request: Request) {
  try {
    const resolved = await resolveOwner()
    if (!resolved.ok) return resolved.response

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

    if (!OPS.includes(input.op as Op)) return invalid('op')
    const op = input.op as Op

    // Every field the operation carries is read before the operation runs: a
    // malformed request is a 400 whether or not there is a draft to run it on.
    let addresses: string[] = []
    let stamp = ''
    let nhood: string | null = null
    let label: string | null = null

    if (op === 'add' || op === 'remove') {
      const read = readAddresses(input.addresses)
      if (read === null) return invalid('addresses')
      addresses = read
    }
    if (op === 'add') {
      const value = input.snapshot_stamp
      if (
        typeof value !== 'string' ||
        value === '' ||
        value.length > MAX_STAMP_LENGTH ||
        !STAMP_RE.test(value)
      ) {
        return invalid('snapshot_stamp')
      }
      stamp = value

      const readNhood = readOptionalText(input.nhood, MAX_NHOOD_LENGTH)
      if (readNhood === undefined) return invalid('nhood')
      nhood = readNhood
      const readLabel = readOptionalText(input.label, MAX_TEXT_LENGTH)
      if (readLabel === undefined) return invalid('label')
      label = readLabel
    }

    const admin = supabaseAdmin()

    if (op === 'add') {
      // The ceiling is answered before a single row is written, the empty draft
      // included: a refusal that leaves a draft behind has still written.
      let owner = resolved.owner
      let mailingId: string | null = null
      let count = 0
      if (owner) {
        mailingId = await findMailing(admin, owner, SURFACE_CITY, SURFACE_TRADE)
        if (mailingId) count = (await loadCart(admin, mailingId)).count
      }

      // Counted on the distinct addresses of the request, because the primary
      // key is what the insert lands on: the same address twice is one row.
      const distinct = Array.from(new Set(addresses))
      if (count + distinct.length > MAX_MAILING_ADDRESSES) {
        return noStore(
          NextResponse.json(
            { error: 'mailing_full', limit: MAX_MAILING_ADDRESSES },
            { status: 409 },
          ),
        )
      }

      // First collection of a guest with no cookie: the identifier is minted
      // here and goes out on this same answer, because the draft written below
      // is reachable by nothing else.
      let mintedAnonId: string | null = null
      if (!owner) {
        mintedAnonId = crypto.randomUUID()
        owner = { kind: 'anon', anonId: mintedAnonId }
      }
      if (!mailingId) mailingId = await createMailing(admin, owner, SURFACE_CITY, SURFACE_TRADE)

      const { error: insertError } = await admin.from('mailing_addresses').upsert(
        distinct.map((address) => ({
          mailing_id: mailingId,
          address,
          snapshot_stamp: stamp,
          nhood,
          label,
        })),
        { onConflict: 'mailing_id,address', ignoreDuplicates: true },
      )
      if (insertError) {
        throw new Error('mailing addresses insert failed · ' + technicalLine(insertError))
      }
      await touchMailing(admin, mailingId)

      const response = cart200(await loadCart(admin, mailingId))
      if (mintedAnonId) {
        response.cookies.set(ANON_COOKIE, mintedAnonId, {
          httpOnly: true,
          sameSite: 'lax',
          secure: true,
          path: '/',
          maxAge: ANON_COOKIE_MAX_AGE,
        })
      }
      return response
    }

    // Nothing to take away from and nothing to own it: an empty cart is the
    // whole truth, and it is not worth a cookie.
    if (!resolved.owner) return cart200(emptyCart())
    const mailingId = await findMailing(admin, resolved.owner, SURFACE_CITY, SURFACE_TRADE)
    if (!mailingId) return cart200(emptyCart())

    if (op === 'remove') {
      const { error } = await admin
        .from('mailing_addresses')
        .delete()
        .eq('mailing_id', mailingId)
        .in('address', Array.from(new Set(addresses)))
      if (error) throw new Error('mailing addresses delete failed · ' + technicalLine(error))
    } else {
      // The draft row itself stays: it is the cell he is collecting in, and he
      // has not left it.
      const { error } = await admin
        .from('mailing_addresses')
        .delete()
        .eq('mailing_id', mailingId)
      if (error) throw new Error('mailing clear failed · ' + technicalLine(error))
    }

    await touchMailing(admin, mailingId)
    return cart200(await loadCart(admin, mailingId))
  } catch (e) {
    return failed('POST', e)
  }
}
