// The postcard profile: the return address and the contact block printed on
// every card a workspace sends. One row per workspace, keyed by workspace_id.
//
// No 'use client' here on purpose: the server page reads these columns, the
// route validates a body against these bounds, and the client island draws the
// fields. Three callers on both sides of the boundary, one set of numbers.
//
// Every length below mirrors a constraint on public.postcard_profiles. It is
// not a second opinion about what fits on a card: if the live schema moves a
// bound, the number here moves with it and nothing else does.

export const MAX_COMPANY_NAME_LENGTH = 120
export const MAX_RETURN_LINE1_LENGTH = 100
export const MAX_RETURN_LINE2_LENGTH = 100
export const MAX_RETURN_CITY_LENGTH = 60
export const MAX_PHONE_LENGTH = 40
export const MAX_EMAIL_LENGTH = 200
export const MAX_WEBSITE_LENGTH = 200
export const MAX_LICENSE_NUMBER_LENGTH = 40
export const MAX_BODY_TEXT_LENGTH = 300
export const MAX_QR_TARGET_LENGTH = 300
export const MAX_LOGO_PATH_LENGTH = 300

/** Two capital letters, the way the postal service writes a state. */
export const STATE_RE = /^[A-Z]{2}$/

/** Five digits, or five and four with a hyphen between them. */
export const ZIP_RE = /^\d{5}(-\d{4})?$/

/**
 * The channel the card tells a reader to use. A tuple rather than a bare list
 * so the type below is the same three words the check constraint knows.
 */
export const PREFERRED_CONTACT_VALUES = ['phone', 'email', 'website'] as const
export type PreferredContact = (typeof PREFERRED_CONTACT_VALUES)[number]

/**
 * What a read of the profile asks for. created_at is not selected — nothing on
 * screen says when the profile was first written — and neither is updated_at,
 * which the route writes but nobody reads back.
 */
export const PROFILE_COLUMNS =
  'workspace_id, company_name, return_line1, return_line2, return_city, return_state, return_zip, phone, email, website, preferred_contact, license_number, body_text, qr_target, logo_path'

/** The row as PROFILE_COLUMNS returns it. */
export type PostcardProfileRow = {
  workspace_id: string
  company_name: string
  return_line1: string
  return_line2: string | null
  return_city: string
  return_state: string
  return_zip: string
  phone: string | null
  email: string | null
  website: string | null
  preferred_contact: PreferredContact
  license_number: string | null
  body_text: string | null
  qr_target: string | null
  logo_path: string | null
}

/**
 * The body of a save. workspace_id is absent because the request does not get
 * to choose whose profile it writes — that comes from the session — and both
 * timestamps are absent because the row's own history is not the caller's to
 * state.
 *
 * logo_path is absent for a different reason: nothing writes it yet, and a
 * field the form cannot fill but the save still sends is a field the save
 * empties. Leaving it out of the body is what lets the column survive a save
 * once the upload exists to put something there.
 */
export type PostcardProfileInput = Omit<PostcardProfileRow, 'workspace_id' | 'logo_path'>

/**
 * Column name to the name a person reads. The route names a refused field by
 * its column; this is what turns that into something worth showing.
 */
export const FIELD_LABELS: Record<string, string> = {
  company_name: 'Company name',
  return_line1: 'Street address',
  return_line2: 'Street address, line 2',
  return_city: 'City',
  return_state: 'State',
  return_zip: 'ZIP',
  phone: 'Phone',
  email: 'Email',
  website: 'Website',
  preferred_contact: 'Preferred contact',
  license_number: 'Contractor license number',
  body_text: 'Message on the postcard',
  qr_target: 'QR code destination',
}
