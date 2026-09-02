import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getStripe, readCellMetadata } from '@/lib/billing'

export const runtime = 'nodejs'

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
      await syncEntitlement((event.data.object as Stripe.Subscription).id, db)
      break

    case 'customer.subscription.deleted': {
      // No re-fetch here, unlike everywhere else: the object is gone at Stripe,
      // so the event is the last word there will ever be about it. The term is
      // left as it stands — a canceled row is refused on the status alone, and
      // the date it ran to is the only record of when it did. The flag goes
      // back to false because there is no longer a subscription to schedule the
      // end of.
      //
      // The error throws, like the other two writes here: swallowing it would
      // mark the event processed, Stripe would never retry, and a cancellation
      // that did not land leaves the right alive until its term runs out.
      const { error: cancelErr } = await db
        .from('entitlements')
        .update({
          status: 'canceled',
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', (event.data.object as Stripe.Subscription).id)

      if (cancelErr) {
        throw new Error('entitlement cancel write failed · ' + cancelErr.message)
      }
      break
    }

    case 'invoice.payment_failed':
    case 'invoice.payment_succeeded': {
      const inv = event.data.object as Stripe.Invoice
      const subId = extractInvoiceSubscriptionId(inv)
      if (subId) await syncEntitlement(subId, db)
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

/**
 * The one place the customer id is mirrored onto the workspace. It is written
 * here and nowhere else because this is the one event that carries both halves
 * at once, and the portal has nothing to open without it.
 */
async function onCheckoutCompleted(session: Stripe.Checkout.Session, db: DB) {
  const stripeCustomerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id
  const stripeSubId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id

  if (!stripeCustomerId || !stripeSubId) {
    console.error('[stripe-webhook] checkout session without customer or subscription', {
      sessionId: session.id,
    })
    return
  }

  // A session with no cell on it is not ours to write a right for: a session of
  // the retired tariff model, or somebody else's endpoint pointed at this URL.
  // It is logged and dropped rather than thrown — a foreign session must not
  // park this event in the ledger as an error and have Stripe retry it forever.
  const cell = readCellMetadata(session.metadata)
  if (!cell) {
    console.error('[stripe-webhook] checkout session without cell metadata', {
      sessionId: session.id,
    })
    return
  }

  const { error: customerErr } = await db
    .from('workspaces')
    .update({ stripe_customer_id: stripeCustomerId })
    .eq('id', cell.workspace_id)

  // This one throws. Without the customer id on the workspace the portal has no
  // door, and the man has already paid: an unwritten column is ours to retry.
  if (customerErr) {
    throw new Error('workspace customer write failed · ' + customerErr.message)
  }

  await syncEntitlement(stripeSubId, db)
}

/**
 * The right, as Stripe currently states it. Re-fetched rather than read off the
 * event payload — the truth about a subscription is at Stripe, and events
 * arrive out of order.
 *
 * A second subscription on the same cell overwrites the first row: the unique
 * index is on the cell, not on the subscription. The last sync wins, which is a
 * known simplification and not an accident. It is unreachable through this
 * site — /api/billing/checkout answers 409 to a workspace that already holds
 * the right — and it would take a subscription created straight in the Stripe
 * dashboard to produce one.
 */
async function syncEntitlement(stripeSubId: string, db: DB) {
  const sub = await getStripe().subscriptions.retrieve(stripeSubId)

  // Same reasoning as the checkout branch: a subscription of the retired model
  // names no cell, and it must not drop this event into the ledger as an error.
  const cell = readCellMetadata(sub.metadata)
  if (!cell) {
    console.error('[stripe-webhook] subscription without cell metadata', { stripeSubId })
    return
  }

  const periodEnd = resolveCurrentPeriodEnd(sub)
  const periodEndIso = periodEnd != null ? new Date(periodEnd * 1000).toISOString() : null

  // Build the row without current_period_end first. We only write that column when we
  // could actually resolve it — writing null would clobber a known-good value. The term
  // is what an entitlement check reads, and losing it would lock out an active
  // subscriber on nothing more than an unexpected payload shape.
  //
  // On a first sync with no resolvable term there is no known-good value to
  // keep, and the upsert fails on the not-null column. That is the right
  // outcome and it is left alone: a right with no term is a right nothing can
  // check, and a default would invent one.
  const row: Record<string, unknown> = {
    workspace_id: cell.workspace_id,
    city: cell.city,
    trade: cell.trade,
    status: sub.status,
    cancel_at_period_end: resolveCancelAtPeriodEnd(sub),
    stripe_subscription_id: stripeSubId,
    updated_at: new Date().toISOString(),
  }
  if (periodEndIso) row.current_period_end = periodEndIso

  const { error } = await db
    .from('entitlements')
    .upsert(row, { onConflict: 'workspace_id,city,trade' })

  if (error) {
    throw new Error('entitlement upsert failed · ' + error.message)
  }
}

// Cancellation at the end of the term is stated by two different fields, and on
// a live object only the second one is filled. Measured on sub_1UBCQACLmZAjrLym
// on 2026-09-02, after a cancellation through the hosted portal: status active,
// cancel_at_period_end false, cancel_at set to the end of the term. So the flag
// alone reads a cancelled subscription as a renewing one, and the workspace is
// told it renews — a false sentence about money.
//
// The flag is still asked first: it is the truth for objects created before the
// shape changed and for replayed older events. cancel_at is the fallback, and it
// is compared against now, because the field carries two meanings at once — a
// moment ahead is a cancellation scheduled, a moment behind is one that has
// already happened. The second kind arrives with status canceled, and the status
// is what should refuse it; calling it "ending at the end of the period" would
// have the workspace say a subscription that is already gone is still active.
//
// The neighbouring field that timestamps the request itself is deliberately not
// read: it says when he asked for the cancellation, not when the service stops,
// and on a live subscription it is filled alongside cancel_at.
function resolveCancelAtPeriodEnd(sub: Stripe.Subscription): boolean {
  if (sub.cancel_at_period_end === true) return true
  if (typeof sub.cancel_at === 'number') return sub.cancel_at * 1000 > Date.now()
  return false
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
