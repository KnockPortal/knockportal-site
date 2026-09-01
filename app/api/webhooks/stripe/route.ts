import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-server'
import { TRADE_CATEGORIES } from '@/lib/categories'

export const runtime = 'nodejs'

// Verticals a checkout may grant. Derived from the shared category vocabulary rather than
// hardcoded, so flipping a trade live in lib/categories.ts is the only edit needed here.
const LIVE_TRADE_SLUGS: ReadonlySet<string> = new Set(
  TRADE_CATEGORIES.filter((c) => c.live).map((c) => c.slug),
)

// Lazy singleton — construct on first request, not at module load. Building the route
// (Next collects page data by importing this module) must not require STRIPE_SECRET_KEY
// to be present; a CI build with no secrets would otherwise fail at `new Stripe(undefined)`.
let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) {
    // @ts-ignore — pinned to API version declared at webhook endpoint
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-06-24.dahlia' })
  }
  return _stripe
}

type DB = ReturnType<typeof supabaseAdmin>

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  const db = supabaseAdmin()

  // Idempotency ledger: insert on first arrival; read status if row already exists.
  const { error: insertErr } = await db
    .from('webhook_events')
    .insert({ stripe_event_id: event.id, type: event.type, status: 'received' })

  if (insertErr) {
    const { data: ledger } = await db
      .from('webhook_events')
      .select('status')
      .eq('stripe_event_id', event.id)
      .single()
    if (ledger?.status === 'processed') {
      return NextResponse.json({ received: true })
    }
    // 'error' or 'received' — fall through and reprocess
  }

  try {
    await dispatch(event, db)
    await db
      .from('webhook_events')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('stripe_event_id', event.id)
  } catch (err) {
    await db
      .from('webhook_events')
      .update({ status: 'error' })
      .eq('stripe_event_id', event.id)
    console.error('[stripe-webhook] handler threw', { eventId: event.id, type: event.type, err })
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function dispatch(event: Stripe.Event, db: DB) {
  switch (event.type) {
    case 'checkout.session.completed':
      await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session, db)
      break

    case 'customer.subscription.updated':
      await syncSubscription((event.data.object as Stripe.Subscription).id, null, db)
      break

    case 'customer.subscription.deleted':
      await db
        .from('subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', (event.data.object as Stripe.Subscription).id)
      break

    case 'invoice.payment_failed':
    case 'invoice.payment_succeeded': {
      const inv = event.data.object as Stripe.Invoice
      const subId = extractInvoiceSubscriptionId(inv)
      if (subId) await syncSubscription(subId, null, db)
      break
    }
  }
}

// Resolve the subscription id from an invoice across Stripe API-shape changes.
// 2026-06-24.dahlia: invoice.parent.subscription_details.subscription.
// Pre-dahlia (replays / older event versions): top-level invoice.subscription.
// Returns null if neither is present — caller then no-ops instead of throwing.
function extractInvoiceSubscriptionId(inv: Stripe.Invoice): string | null {
  const parentSub = inv.parent?.subscription_details?.subscription
  if (parentSub) return typeof parentSub === 'string' ? parentSub : parentSub.id
  // Legacy field removed from the type in dahlia — read defensively for replayed events.
  const legacy = (inv as unknown as { subscription?: string | { id: string } }).subscription
  if (legacy) return typeof legacy === 'string' ? legacy : legacy.id
  return null
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session, db: DB) {
  const stripeCustomerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id
  const stripeSubId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id

  if (!stripeCustomerId || !stripeSubId) return

  // Mirror customer — fetch canonical data from Stripe
  const stripeCust = await getStripe().customers.retrieve(stripeCustomerId)
  if (!('deleted' in stripeCust)) {
    await db.from('customers').upsert(
      { stripe_customer_id: stripeCustomerId, email: stripeCust.email, name: stripeCust.name },
      { onConflict: 'stripe_customer_id' },
    )
  }

  const { data: customer } = await db
    .from('customers')
    .select('id')
    .eq('stripe_customer_id', stripeCustomerId)
    .single()

  await syncSubscription(stripeSubId, customer?.id ?? null, db)

  // Grants below both key off our subscription row — look it up once.
  const { data: sub } = await db
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', stripeSubId)
    .single()

  if (!sub) return

  // Associate subscription with SF metro — v1 default (one metro only)
  // TODO multi-metro: derive metro from Payment Link or session.metadata.metro_slug
  const { data: sfMetro } = await db
    .from('metros')
    .select('id')
    .eq('slug', 'san-francisco')
    .single()

  if (sfMetro) {
    await db
      .from('subscription_metros')
      .upsert(
        { subscription_id: sub.id, metro_id: sfMetro.id },
        { onConflict: 'subscription_id,metro_id', ignoreDuplicates: true },
      )
  }

  // Associate subscription with the trade the buyer picked on the pricing page, carried
  // through Checkout as client_reference_id. A missing or unrecognized value is logged and
  // skipped, never thrown: a bad query param must not fail the webhook or roll back the
  // metro grant above.
  const vertical = session.client_reference_id
  if (vertical && LIVE_TRADE_SLUGS.has(vertical)) {
    await db
      .from('subscription_verticals')
      .upsert(
        { subscription_id: sub.id, vertical },
        { onConflict: 'subscription_id,vertical', ignoreDuplicates: true },
      )
  } else {
    console.error('[stripe-webhook] checkout session has no valid trade — no vertical granted', {
      stripeSubscriptionId: stripeSubId,
      clientReferenceId: session.client_reference_id,
    })
  }
}

// Re-fetch from Stripe to get canonical status — never trust event payload alone.
async function syncSubscription(
  stripeSubId: string,
  customerId: string | null,
  db: DB,
) {
  const sub = await getStripe().subscriptions.retrieve(stripeSubId)
  const priceId = sub.items.data[0]?.price?.id ?? null

  // Resolve our internal customer_id if not provided (e.g. out-of-order delivery)
  let resolvedCustomerId = customerId
  if (!resolvedCustomerId) {
    const stripeCustomerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
    const { data: existing } = await db
      .from('customers')
      .select('id')
      .eq('stripe_customer_id', stripeCustomerId)
      .single()
    resolvedCustomerId = existing?.id ?? null
  }

  const planKey = priceId ? await resolvePlanKey(priceId, db) : null

  const periodEnd = resolveCurrentPeriodEnd(sub)
  const periodEndIso = periodEnd != null ? new Date(periodEnd * 1000).toISOString() : null

  // Build the row without current_period_end first. We only write that column when we
  // could actually resolve it — writing null would clobber a known-good value. The term
  // is what an entitlement check reads, and losing it would lock out an active
  // subscriber on nothing more than an unexpected payload shape.
  const row: Record<string, unknown> = {
    customer_id: resolvedCustomerId,
    stripe_subscription_id: stripeSubId,
    stripe_price_id: priceId,
    plan_key: planKey,
    status: sub.status,
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }
  if (periodEndIso) row.current_period_end = periodEndIso

  await db.from('subscriptions').upsert(row, { onConflict: 'stripe_subscription_id' })
}

// current_period_end moved off Subscription onto each SubscriptionItem in 2026-06-24.dahlia.
// Prefer the item value; fall back to the legacy top-level field for replayed/older events;
// null if neither is present (caller then leaves the stored value untouched).
function resolveCurrentPeriodEnd(sub: Stripe.Subscription): number | null {
  const fromItem = sub.items?.data?.[0]?.current_period_end
  if (typeof fromItem === 'number') return fromItem
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end
  if (typeof legacy === 'number') return legacy
  return null
}

async function resolvePlanKey(priceId: string, db: DB): Promise<string | null> {
  const { data } = await db
    .from('plans')
    .select('key')
    .or(`stripe_price_monthly.eq.${priceId},stripe_price_yearly.eq.${priceId}`)
    .single()
  return data?.key ?? null
}
