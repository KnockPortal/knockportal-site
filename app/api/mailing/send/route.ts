import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseSession } from '@/lib/supabase-session'
import { supabaseAdmin } from '@/lib/supabase-server'
import { ensureWorkspace } from '@/lib/workspace'
import { readEntitlement } from '@/lib/entitlements'
import { technicalLine } from '@/lib/ui-error'
import { SURFACE_CITY, SURFACE_TRADE } from '@/lib/surface'
import { ANON_COOKIE, ANON_RE, claimAnonMailings } from '@/lib/mailing'

export const runtime = 'nodejs'

function invalid(field: string) {
  return NextResponse.json({ error: 'invalid_request', field }, { status: 400 })
}

/**
 * The gate. It answers one question — who is allowed to send — and it does not
 * touch the other one: there is no payload contract here on purpose, because
 * there is nothing yet to send. That is what the 501 says.
 *
 * Nothing in this handler writes. It reads the right and hands back a status.
 * The one thing it does that leaves a mark is claiming the guest's drafts for
 * the workspace, which is a step of its own below and belongs to the mailing
 * rather than to the answer: the man is standing at the send button, and the
 * drafts he collected before signing in have to be his by then.
 *
 * What is reachable today: 401 and 402. public.entitlements holds zero rows and
 * nothing can write one — checkout arrives with item 14 — so no request from
 * the field reaches the 402/501 boundary from the granting side. The 501 branch
 * is checked by hand, by inserting a row of right through SQL, and it exists
 * because past this gate there is still no postcard, no approval step and no
 * vendor.
 */
export async function POST(request: Request) {
  try {
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

    if (input.city !== SURFACE_CITY) return invalid('city')
    if (input.trade !== SURFACE_TRADE) return invalid('trade')

    const workspace = await ensureWorkspace(supabase, null)
    if (!workspace.ok) {
      console.error('[mailing/send] ensure_workspace failed:', workspace.detail)
      return NextResponse.json({ error: 'workspace_unavailable' }, { status: 503 })
    }
    const workspaceId = workspace.workspace.workspace_id

    const cookieValue = cookies().get(ANON_COOKIE)?.value
    if (cookieValue && ANON_RE.test(cookieValue)) {
      await claimAnonMailings(supabaseAdmin(), cookieValue, workspaceId)
    }

    // The session client, and never the service-role one. The module is written
    // for exactly this: everything the check can see is what the signed-in man
    // can see. Handing it the admin client would take RLS off the paid wall —
    // it would break the one thing the wall is for.
    const check = await readEntitlement(supabase, workspaceId, SURFACE_CITY, SURFACE_TRADE)

    // A right that could not be read is not a right. The failure is a refusal
    // here and not a pass-through: a branch that lets the request on when the
    // query breaks is not a wall.
    if (!check.ok) {
      console.error('[mailing/send] entitlement read failed:', check.detail)
      return NextResponse.json({ error: 'right_unknown' }, { status: 503 })
    }

    // The reason travels as the module returned it — none, status, expired —
    // because the three of them are three different sentences to the man.
    if (!check.granted) {
      return NextResponse.json(
        { error: 'subscription_required', reason: check.reason },
        { status: 402 },
      )
    }

    return NextResponse.json({ error: 'not_available_yet' }, { status: 501 })
  } catch (e) {
    console.error('[mailing/send] failed:', technicalLine(e))
    return NextResponse.json({ error: 'send_unavailable' }, { status: 500 })
  }
}
