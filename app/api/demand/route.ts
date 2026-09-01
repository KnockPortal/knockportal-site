import { NextResponse } from 'next/server'
import { supabaseSession } from '@/lib/supabase-session'

export const runtime = 'nodejs'

const MAX_EMAIL_LENGTH = 200
const MIN_EMAIL_LENGTH = 3
const MAX_NAME_LENGTH = 80

// Where the form was opened from. Two values and no more: the column is read to
// tell a cell of the grid from a request that fits no cell at all.
const ORIGINS = ['cell', 'free'] as const
type Origin = (typeof ORIGINS)[number]
const DEFAULT_ORIGIN: Origin = 'free'

function invalid(field: string) {
  return NextResponse.json({ error: 'invalid_request', field }, { status: 400 })
}

/**
 * Deliberately not a full RFC check, which no regular expression passes anyway.
 * It rejects what cannot be delivered to and lets the address itself be the
 * proof: exactly one @, something on either side, and a dot in the domain.
 */
function readEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim()
  if (email.length < MIN_EMAIL_LENGTH || email.length > MAX_EMAIL_LENGTH) return null
  const parts = email.split('@')
  if (parts.length !== 2) return null
  const [local, domain] = parts
  if (local === '' || domain === '') return null
  if (!domain.includes('.')) return null
  return email
}

function readName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const name = value.trim()
  if (name.length < 1 || name.length > MAX_NAME_LENGTH) return null
  return name
}

/**
 * Records that someone wants a combination the grid does not hold yet.
 *
 * Anonymous by design — the form sits on the public home page and asking for an
 * account before asking for the city would collect nothing. The write therefore
 * goes through the session client on the publishable key, with no session in
 * it: the INSERT policy on the table is what decides, and it is the only thing
 * that does. The service-role client of lib/supabase-server.ts has no business
 * here under any argument — it bypasses RLS, and a write like that behind an
 * open endpoint turns every gap in the validation below into a hole in the
 * whole schema.
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return invalid('body')
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return invalid('body')
  const input = body as Record<string, unknown>

  const email = readEmail(input.email)
  if (email === null) return invalid('email')

  const city = readName(input.city)
  if (city === null) return invalid('city')

  const trade = readName(input.trade)
  if (trade === null) return invalid('trade')

  let origin: Origin = DEFAULT_ORIGIN
  if (input.origin !== undefined) {
    if (!ORIGINS.includes(input.origin as Origin)) return invalid('origin')
    origin = input.origin as Origin
  }

  // The trap the form hides from eye and keyboard. Anything in it was typed by
  // something filling every input on the page, and the answer it gets is the
  // one a successful save gives: nothing is written, nothing is logged, and the
  // caller learns nothing from the difference.
  if (typeof input.company === 'string' && input.company.trim() !== '') {
    return NextResponse.json({ ok: true }, { status: 201 })
  }

  // No .select(): the row is written under the anonymous role, which has no
  // business reading the table back, and asking for the row would only give the
  // SELECT policy a refusal to report on a write that succeeded.
  const { error } = await supabaseSession()
    .from('combination_requests')
    .insert({ email, city, trade, origin })

  if (error) {
    // The service string names columns and policies; the caller has no use for
    // either, and this endpoint answers strangers.
    console.error('[demand] insert failed:', error.message)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
