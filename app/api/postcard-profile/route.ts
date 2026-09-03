import { NextResponse } from 'next/server'
import { supabaseSession } from '@/lib/supabase-session'
import { ensureWorkspace } from '@/lib/workspace'
import { technicalLine } from '@/lib/ui-error'
import {
  MAX_BODY_TEXT_LENGTH,
  MAX_COMPANY_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_LICENSE_NUMBER_LENGTH,
  MAX_PHONE_LENGTH,
  MAX_QR_TARGET_LENGTH,
  MAX_RETURN_CITY_LENGTH,
  MAX_RETURN_LINE1_LENGTH,
  MAX_RETURN_LINE2_LENGTH,
  MAX_WEBSITE_LENGTH,
  PREFERRED_CONTACT_VALUES,
  STATE_RE,
  ZIP_RE,
  type PostcardProfileInput,
  type PreferredContact,
} from '@/lib/postcard-profile'

export const runtime = 'nodejs'

/**
 * Writes the one postcard_profiles row of the caller's workspace.
 *
 * Every read and write here goes through the session client, and the
 * service-role client is not imported at all. That is deliberate: RLS on
 * postcard_profiles carries SELECT, INSERT and UPDATE policies, all of them by
 * membership in the workspace, so the table already answers the question of who
 * may write this row. Reaching past it with service-role would put a second
 * answer to that question in this file, and a second place where access is
 * decided is a place the first one can be wrong about.
 *
 * POST only. The page reads the row under the same session on render, so a GET
 * here would be a second way to fetch what is already on screen.
 */

/** One person's profile. Nothing between here and them may keep a copy. */
function noStore(response: NextResponse) {
  response.headers.set('cache-control', 'private, no-store')
  return response
}

function invalid(field: string) {
  return noStore(NextResponse.json({ error: 'invalid_request', field }, { status: 400 }))
}

/** A required text: present, not empty, within the column's bound. */
function readRequired(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  if (value === '' || value.length > max) return null
  return value
}

/**
 * An optional text. Missing, null and the empty string are one state and it is
 * null: a field the form drew and he left alone reads the same as a field the
 * form never drew. undefined is the refusal, which is why it cannot also be an
 * accepted input.
 */
function readOptional(value: unknown, max: number): string | null | undefined {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || value.length > max) return undefined
  return value
}

export async function POST(request: Request) {
  const supabase = supabaseSession()
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) {
    return noStore(NextResponse.json({ error: 'auth_required' }, { status: 401 }))
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return invalid('body')
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return invalid('body')
  const input = body as Record<string, unknown>

  // Every field is read before anything is written. A body that fails on its
  // last field must not leave the first ones behind it in the table.
  const companyName = readRequired(input.company_name, MAX_COMPANY_NAME_LENGTH)
  if (companyName === null) return invalid('company_name')

  const returnLine1 = readRequired(input.return_line1, MAX_RETURN_LINE1_LENGTH)
  if (returnLine1 === null) return invalid('return_line1')

  const returnLine2 = readOptional(input.return_line2, MAX_RETURN_LINE2_LENGTH)
  if (returnLine2 === undefined) return invalid('return_line2')

  const returnCity = readRequired(input.return_city, MAX_RETURN_CITY_LENGTH)
  if (returnCity === null) return invalid('return_city')

  // Upper-cased before the pattern sees it: a man who typed his own state in
  // lower case made no mistake, and answering him with one would be our error
  // dressed as his.
  const rawState = typeof input.return_state === 'string' ? input.return_state : ''
  const returnState = rawState.toUpperCase()
  if (!STATE_RE.test(returnState)) return invalid('return_state')

  const rawZip = typeof input.return_zip === 'string' ? input.return_zip : ''
  if (!ZIP_RE.test(rawZip)) return invalid('return_zip')
  const returnZip = rawZip

  const phone = readOptional(input.phone, MAX_PHONE_LENGTH)
  if (phone === undefined) return invalid('phone')

  const email = readOptional(input.email, MAX_EMAIL_LENGTH)
  if (email === undefined) return invalid('email')

  const website = readOptional(input.website, MAX_WEBSITE_LENGTH)
  if (website === undefined) return invalid('website')

  if (!PREFERRED_CONTACT_VALUES.includes(input.preferred_contact as PreferredContact)) {
    return invalid('preferred_contact')
  }
  const preferredContact = input.preferred_contact as PreferredContact

  const licenseNumber = readOptional(input.license_number, MAX_LICENSE_NUMBER_LENGTH)
  if (licenseNumber === undefined) return invalid('license_number')

  const bodyText = readOptional(input.body_text, MAX_BODY_TEXT_LENGTH)
  if (bodyText === undefined) return invalid('body_text')

  const qrTarget = readOptional(input.qr_target, MAX_QR_TARGET_LENGTH)
  if (qrTarget === undefined) return invalid('qr_target')

  // The channel the card points at has to be a channel he filled in. The table
  // checks this too; if the check were left to the table alone it would come
  // back as a 500, and a 500 says the site broke rather than that a field is
  // empty.
  const chosen = { phone, email, website }[preferredContact]
  if (chosen === null) return invalid('preferred_contact')

  // The slug is passed as an explicit null: p_source_demo_slug belongs to the
  // first touch on the workspace page and must not be overwritten from here.
  const workspace = await ensureWorkspace(supabase, null)
  if (!workspace.ok) {
    console.error('[postcard-profile] ensure_workspace failed:', workspace.detail)
    return noStore(
      NextResponse.json({ error: 'workspace_unavailable' }, { status: 503 }),
    )
  }

  const values: PostcardProfileInput = {
    company_name: companyName,
    return_line1: returnLine1,
    return_line2: returnLine2,
    return_city: returnCity,
    return_state: returnState,
    return_zip: returnZip,
    phone,
    email,
    website,
    preferred_contact: preferredContact,
    license_number: licenseNumber,
    body_text: bodyText,
    qr_target: qrTarget,
  }

  // The workspace comes from the session and from nowhere else: no field of the
  // body took part in choosing which row this lands on. There is no trigger on
  // the table, so the stamp is written here or it is not written at all.
  //
  // The column holding the logo is absent from this object on purpose. An
  // upsert updates the columns it is handed and leaves the rest of the row
  // where it was, so a profile saved from this form cannot empty a path that
  // something else put there.
  const { error } = await supabase.from('postcard_profiles').upsert(
    {
      ...values,
      workspace_id: workspace.workspace.workspace_id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'workspace_id' },
  )

  if (error) {
    console.error('[postcard-profile] upsert failed:', technicalLine(error))
    return noStore(NextResponse.json({ error: 'save_failed' }, { status: 500 }))
  }

  return noStore(NextResponse.json({ ok: true }, { status: 200 }))
}
