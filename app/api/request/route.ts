import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { TRADE_CATEGORIES } from '@/lib/categories'

export const runtime = 'nodejs'

// A1: store the homeowner request honestly. No email is sent here — the lead lands with
// opt_in_status = 'pending' (the table default) and the double opt-in flow arrives in A4.
// Success copy on the client says "Request received", never "confirmation email sent".
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const categorySlug = typeof body.category === 'string' ? body.category : ''
  const metroSlug = typeof body.metro === 'string' ? body.metro : ''
  const details = typeof body.details === 'string' ? body.details.trim() : ''
  const consent = body.consent === true

  // Minimal validation — the DB has NOT NULL / check constraints, but fail fast with a
  // clear message rather than surfacing a Postgres error to the client.
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  if (!emailOk) {
    return NextResponse.json({ ok: false, error: 'A valid email is required.' }, { status: 400 })
  }

  const category = TRADE_CATEGORIES.find((c) => c.slug === categorySlug)
  if (!category) {
    return NextResponse.json({ ok: false, error: 'Unknown work category.' }, { status: 400 })
  }
  if (!consent) {
    return NextResponse.json({ ok: false, error: 'Consent is required.' }, { status: 400 })
  }

  const category_status: 'live' | 'coming_soon' = category.live ? 'live' : 'coming_soon'

  const db = supabaseAdmin()

  // Resolve metro slug -> metro_id. metro_id is nullable, so a miss is non-fatal:
  // we still capture the lead and stash the raw slug for later reconciliation.
  let metroId: string | null = null
  if (metroSlug) {
    const { data: metro } = await db
      .from('metros')
      .select('id')
      .eq('slug', metroSlug)
      .maybeSingle()
    metroId = metro?.id ?? null
  }

  const { error } = await db.from('leads').insert({
    audience: 'homeowner',
    category: category.slug,
    category_status,
    metro_id: metroId,
    email,
    message: details || null,
    consent: true,
    consent_at: new Date().toISOString(),
    consent_version: 'a1',
    // opt_in_status intentionally left to default ('pending'); no confirmation email in A1.
    source: 'request-form',
    user_agent: req.headers.get('user-agent'),
    referer: req.headers.get('referer'),
    raw: { metro_slug: metroSlug || null },
  })

  if (error) {
    console.error('[request] lead insert failed', { message: error.message })
    return NextResponse.json(
      { ok: false, error: 'Something went wrong saving your request. Please try again.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, message: 'Request received' }, { status: 200 })
}
