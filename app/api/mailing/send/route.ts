import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseSession } from '@/lib/supabase-session'
import { supabaseAdmin } from '@/lib/supabase-server'
import { ensureWorkspace } from '@/lib/workspace'
import { readEntitlement } from '@/lib/entitlements'
import { technicalLine } from '@/lib/ui-error'
import { SURFACE_CITY, SURFACE_TRADE } from '@/lib/surface'
import { ANON_COOKIE, ANON_RE, claimAnonMailings } from '@/lib/mailing'
import { resolveOffer } from '@/lib/billing'

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
 * What is reachable today: all three. Since item 14 the webhook writes rows of
 * right, so a paid workspace crosses this gate and lands on the 501 — which
 * still stands, because past here there is no postcard, no approval step and no
 * vendor. The 402 no longer merely refuses: it carries the offer, so the wall
 * says its own price.
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
      // The offer rides along so the refusal can name its own price. Without
      // price_id: nothing on the page may pick which price is charged, and the
      // checkout route resolves it again on its own side.
      //
      // A price that could not be read is not a reason to hold the wall shut
      // differently — the wall already stands. The refusal goes out with a null
      // offer and the strip says the shorter sentence.
      let offer: { amount_cents: number; currency: string; interval: string; label: string } | null =
        null
      try {
        const resolved = await resolveOffer(SURFACE_CITY, SURFACE_TRADE)
        if (resolved) {
          offer = {
            amount_cents: resolved.amount_cents,
            currency: resolved.currency,
            interval: resolved.interval,
            label: resolved.label,
          }
        }
      } catch (e) {
        console.error('[mailing/send] price lookup failed:', technicalLine(e))
      }

      return NextResponse.json(
        { error: 'subscription_required', reason: check.reason, offer },
        { status: 402 },
      )
    }

    return NextResponse.json({ error: 'not_available_yet' }, { status: 501 })
  } catch (e) {
    console.error('[mailing/send] failed:', technicalLine(e))
    return NextResponse.json({ error: 'send_unavailable' }, { status: 500 })
  }
}
