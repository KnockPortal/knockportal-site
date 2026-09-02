import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseSession } from '@/lib/supabase-session'
import { supabaseAdmin } from '@/lib/supabase-server'
import { ensureWorkspace } from '@/lib/workspace'
import { readEntitlement } from '@/lib/entitlements'
import { technicalLine } from '@/lib/ui-error'
import { SURFACE_CITY, SURFACE_TRADE } from '@/lib/surface'
import { ANON_COOKIE, ANON_RE, claimAnonMailings } from '@/lib/mailing'
import { RETURN_TO_RE, SITE_ORIGIN, getStripe, resolveOffer } from '@/lib/billing'

export const runtime = 'nodejs'

function invalid(field: string) {
  return NextResponse.json({ error: 'invalid_request', field }, { status: 400 })
}

/**
 * The door in the wall. It opens a Stripe Checkout Session for one cell of the
 * grid and answers with its address; it never redirects, because a route that
 * redirects cannot say why it did not.
 *
 * The order is the owner's decision of 02.09 and it is the whole shape of this
 * handler: the code goes to his email first and the card second. So a workspace
 * exists before checkout does, its id travels in the metadata, and the webhook
 * writes the right against it. Nothing registers anybody here.
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

    // The one filled combination. Every other cell has nothing to sell.
    if (input.city !== SURFACE_CITY) return invalid('city')
    if (input.trade !== SURFACE_TRADE) return invalid('trade')

    // Where Stripe hands him back. It has to be the surface he left, so it is
    // checked against the shape of a surface address and then against this
    // cell's own prefix: the query may vary — ?from= carries the personal
    // variant — the page may not.
    const returnTo = input.return_to
    if (
      typeof returnTo !== 'string' ||
      !RETURN_TO_RE.test(returnTo) ||
      !returnTo.startsWith(`/${SURFACE_CITY}/${SURFACE_TRADE}`)
    ) {
      return invalid('return_to')
    }

    const workspace = await ensureWorkspace(supabase, null)
    if (!workspace.ok) {
      console.error('[billing/checkout] ensure_workspace failed:', workspace.detail)
      return NextResponse.json({ error: 'workspace_unavailable' }, { status: 503 })
    }
    const workspaceId = workspace.workspace.workspace_id

    // The service-role client, here and nowhere else in this file. RLS grants
    // anon no write on either mailing table, so the claim cannot run under the
    // session client — holding the cookie is what stands in for identity, and
    // this is the same step, for the same reason, as in mailing/send.
    //
    // It runs before Stripe on purpose: the cart he collected as a guest has to
    // belong to the workspace by the time he leaves the page, or he comes back
    // from a paid checkout to an empty strip.
    const cookieValue = cookies().get(ANON_COOKIE)?.value
    if (cookieValue && ANON_RE.test(cookieValue)) {
      await claimAnonMailings(supabaseAdmin(), cookieValue, workspaceId)
    }

    // The session client, and never the service-role one — the same rule the
    // sending gate is written on: everything the check can see is what the
    // signed-in man can see.
    const check = await readEntitlement(supabase, workspaceId, SURFACE_CITY, SURFACE_TRADE)
    if (!check.ok) {
      console.error('[billing/checkout] entitlement read failed:', check.detail)
      return NextResponse.json({ error: 'right_unknown' }, { status: 503 })
    }

    // He already has it. Selling it to him twice would leave two subscriptions
    // against one row of right, and he would be paying for one of them for
    // nothing.
    if (check.granted) {
      return NextResponse.json({ error: 'already_subscribed' }, { status: 409 })
    }

    let offer
    try {
      offer = await resolveOffer(SURFACE_CITY, SURFACE_TRADE)
    } catch (e) {
      console.error('[billing/checkout] price lookup failed:', technicalLine(e))
      return NextResponse.json({ error: 'price_unavailable' }, { status: 503 })
    }
    if (!offer) {
      console.error('[billing/checkout] no active price for cell', {
        city: SURFACE_CITY,
        trade: SURFACE_TRADE,
      })
      return NextResponse.json({ error: 'price_unavailable' }, { status: 503 })
    }

    // Under the session, so this reads the workspace he belongs to and no
    // other. A returning buyer keeps his Stripe customer; the column is empty
    // until the first checkout completes, and then the webhook fills it.
    const { data: wsRow, error: wsError } = await supabase
      .from('workspaces')
      .select('stripe_customer_id')
      .eq('id', workspaceId)
      .maybeSingle()

    if (wsError) {
      console.error('[billing/checkout] workspace read failed:', technicalLine(wsError))
      return NextResponse.json({ error: 'workspace_unavailable' }, { status: 503 })
    }

    const stripeCustomerId = (wsRow as { stripe_customer_id?: string | null } | null)
      ?.stripe_customer_id

    const back = (outcome: string) =>
      SITE_ORIGIN + returnTo + (returnTo.includes('?') ? '&' : '?') + 'checkout=' + outcome

    // The cell is written twice, and both are needed. The session carries it for
    // checkout.session.completed; the subscription carries it for every event
    // that comes after, because those arrive with no session attached at all.
    const cellMetadata = {
      workspace_id: workspaceId,
      city: SURFACE_CITY,
      trade: SURFACE_TRADE,
    }

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: offer.price_id, quantity: 1 }],
      ...(stripeCustomerId
        ? { customer: stripeCustomerId }
        : { customer_email: auth.user.email }),
      client_reference_id: workspaceId,
      metadata: cellMetadata,
      subscription_data: { metadata: cellMetadata },
      allow_promotion_codes: true,
      success_url: back('success'),
      cancel_url: back('cancel'),
    })

    if (!session.url) {
      console.error('[billing/checkout] session created without url', { sessionId: session.id })
      return NextResponse.json({ error: 'checkout_unavailable' }, { status: 503 })
    }

    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('[billing/checkout] failed:', technicalLine(e))
    return NextResponse.json({ error: 'checkout_unavailable' }, { status: 500 })
  }
}
