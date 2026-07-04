import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'

// @ts-ignore — pinned to API version declared at webhook endpoint
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-06-24.dahlia' })

type DB = ReturnType<typeof supabaseAdmin>

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
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
      const subId = typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id
      if (subId) await syncSubscription(subId, null, db)
      break
    }
  }
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session, db: DB) {
  const stripeCustomerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id
  const stripeSubId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id

  if (!stripeCustomerId || !stripeSubId) return

  // Mirror customer — fetch canonical data from Stripe
  const stripeCust = await stripe.customers.retrieve(stripeCustomerId)
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

  // Associate subscription with SF metro — v1 default (one metro only)
  // TODO multi-metro: derive metro from Payment Link or session.metadata.metro_slug
  const { data: sfMetro } = await db
    .from('metros')
    .select('id')
    .eq('slug', 'san-francisco')
    .single()

  if (sfMetro) {
    const { data: sub } = await db
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', stripeSubId)
      .single()

    if (sub) {
      await db
        .from('subscription_metros')
        .upsert(
          { subscription_id: sub.id, metro_id: sfMetro.id },
          { onConflict: 'subscription_id,metro_id', ignoreDuplicates: true },
        )
    }
  }
}

// Re-fetch from Stripe to get canonical status — never trust event payload alone.
async function syncSubscription(
  stripeSubId: string,
  customerId: string | null,
  db: DB,
) {
  const sub = await stripe.subscriptions.retrieve(stripeSubId)
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

  await db.from('subscriptions').upsert(
    {
      customer_id: resolvedCustomerId,
      stripe_subscription_id: stripeSubId,
      stripe_price_id: priceId,
      plan_key: planKey,
      status: sub.status,
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_subscription_id' },
  )
}

async function resolvePlanKey(priceId: string, db: DB): Promise<string | null> {
  const { data } = await db
    .from('plans')
    .select('key')
    .or(`stripe_price_monthly.eq.${priceId},stripe_price_yearly.eq.${priceId}`)
    .single()
  return data?.key ?? null
}
