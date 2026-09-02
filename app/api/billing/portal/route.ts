import { NextResponse } from 'next/server'
import { supabaseSession } from '@/lib/supabase-session'
import { ensureWorkspace } from '@/lib/workspace'
import { technicalLine } from '@/lib/ui-error'
import { SITE_ORIGIN, getStripe } from '@/lib/billing'

export const runtime = 'nodejs'

/**
 * The way out. Everything a subscriber may do to his own subscription — read
 * the card, change it, cancel — is done at Stripe, in Stripe's hosted portal,
 * and this route only opens the door to it.
 *
 * There is no body to read: the only thing a portal session needs is which
 * customer, and that is not the caller's to name. It is read off his workspace.
 */
export async function POST() {
  try {
    const supabase = supabaseSession()
    const { data: auth, error: authError } = await supabase.auth.getUser()
    if (authError || !auth.user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 })
    }

    const workspace = await ensureWorkspace(supabase, null)
    if (!workspace.ok) {
      console.error('[billing/portal] ensure_workspace failed:', workspace.detail)
      return NextResponse.json({ error: 'workspace_unavailable' }, { status: 503 })
    }
    const workspaceId = workspace.workspace.workspace_id

    // Under the session: the SELECT policy is what limits this to workspaces he
    // belongs to, and a service-role read here would be a second place where
    // access to somebody's billing is decided.
    const { data: wsRow, error: wsError } = await supabase
      .from('workspaces')
      .select('stripe_customer_id')
      .eq('id', workspaceId)
      .maybeSingle()

    if (wsError) {
      console.error('[billing/portal] workspace read failed:', technicalLine(wsError))
      return NextResponse.json({ error: 'workspace_unavailable' }, { status: 503 })
    }

    const stripeCustomerId = (wsRow as { stripe_customer_id?: string | null } | null)
      ?.stripe_customer_id

    // Nobody has ever paid from this workspace, so Stripe has nothing to show
    // him. That is not a failure and it is not an empty portal — it is a
    // sentence on the screen, which is what the 409 becomes.
    if (!stripeCustomerId) {
      return NextResponse.json({ error: 'no_billing' }, { status: 409 })
    }

    try {
      const session = await getStripe().billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: SITE_ORIGIN + '/app',
      })
      return NextResponse.json({ url: session.url })
    } catch (e) {
      // Most often this is the portal configuration missing at the Stripe end:
      // without a saved one, the API refuses to create a session at all.
      console.error('[billing/portal] portal session failed:', technicalLine(e))
      return NextResponse.json({ error: 'portal_unavailable' }, { status: 503 })
    }
  } catch (e) {
    console.error('[billing/portal] failed:', technicalLine(e))
    return NextResponse.json({ error: 'portal_unavailable' }, { status: 503 })
  }
}
