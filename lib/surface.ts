import demoCompanies from './demo-companies.json'

/** The one filled combination of the /<city>/<trade> surface. */
export const SURFACE_CITY = 'sf'
export const SURFACE_TRADE = 'roofing'

/**
 * Public by construction: this token ships inside the source of every page that
 * draws the map, so anyone who opens the surface can read it. It is scoped and
 * URL-restricted on the Mapbox side, which is where the restriction belongs.
 * Deliberately a literal and not an env var: an env var would add a deploy
 * precondition for a value that is not a secret.
 */
export const MAPBOX_TOKEN =
  'pk.eyJ1Ijoia25vY2twb3J0YWwiLCJhIjoiY21zejFvdDd0MDVzdjJ4c2ExemVqeWV4OSJ9.QBX4adhVFaKMfp11eQmGXw'

/**
 * The bucket holds no snapshot id: the page asks latest.json which one is
 * current, so a fresh publish reaches every page already in the field.
 */
export const DATA_BASE =
  'https://hxvxklqagzqxlfjfxnno.supabase.co/storage/v1/object/public/data/'

/**
 * Cache-busting suffix for page.js and page.css. First 12 characters of the
 * sha256 of the two files concatenated in that order. Both are served as static
 * assets, byte for byte, so nothing derives this at build time: either file may
 * be edited only together with this literal, recomputed in the same change —
 * otherwise browsers and CDNs go on serving the previous asset.
 *
 *   cat public/assets/surface/page.js public/assets/surface/page.css \
 *     | shasum -a 256 | cut -c1-12
 *
 * A literal, because reading public/ from the filesystem at request time is not
 * something a page should do.
 */
export const SURFACE_BUILD = '97f87c8fd1fb'

export type SurfaceVariant = {
  /** Company name for the personal variant; empty string on the public one. */
  company: string
  /** Prefix of the downloaded CSV: the demo slug, or the city on the public one. */
  slug: string
  personal: boolean
}

const PUBLIC_VARIANT: SurfaceVariant = {
  company: '',
  slug: SURFACE_CITY,
  personal: false,
}

/**
 * Resolves ?from=<slug> against the demo list. An unknown slug falls back to
 * the public variant rather than rendering what was passed: otherwise any
 * address at all would show "Built for" over arbitrary text.
 */
export function resolveSurfaceVariant(
  from: string | string[] | undefined,
): SurfaceVariant {
  if (typeof from !== 'string' || from === '') return PUBLIC_VARIANT
  const match = demoCompanies.find((entry) => entry.slug === from)
  if (!match) return PUBLIC_VARIANT
  return { company: match.company, slug: match.slug, personal: true }
}
