// The one sentence on the postcard that the product says rather than the
// contractor. Everything else printed on the card is his text; this line is a
// fact counted out of the snapshot, and it is written here so there is exactly
// one copy of it in the project.
//
// Pure on purpose: no Supabase, no 'use client', no fetch. It is handed numbers
// and hands back either a finished sentence or null, so the page that draws the
// card and any later caller cannot disagree about the wording.

/** A quarter of a statute mile, in metres. The radius the sentence claims. */
export const QUARTER_MILE_M = 1609.344 / 4

/**
 * Spelled out here rather than taken from toLocaleDateString: the card is
 * printed from a server render, and a date turned into words by the runtime's
 * locale is a date that can come out differently on two machines.
 */
export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/**
 * The first sixteen characters of a stamp the publisher writes, in either of
 * the two shapes it writes them in: "YYYY-MM-DD HH:MM" and full ISO. Same
 * expression the surface script reads the snapshot age with.
 */
const GENERATED_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/

export type Point = { lat: number; lon: number }

/**
 * Only the two fields the count reads, and neither of them typed as a number:
 * these come out of a JSON file, and a record whose coordinates are strings or
 * missing is a record the count steps over rather than a file it refuses.
 */
export type MaybePoint = { lat?: unknown; lon?: unknown }

const M_PER_DEG = 111320

/**
 * Flat-earth distance in metres, the cosine of the mean latitude keeping
 * longitude honest. Ported from the surface script, which measures the same
 * neighbourhoods the same way: over a few hundred metres the error is far under
 * the width of a house, and the two have to agree or the map and the card would
 * count different permits.
 */
export function metresBetween(a: Point, b: Point): number {
  const k = Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180)
  const dx = (a.lon - b.lon) * k
  const dy = a.lat - b.lat
  return Math.sqrt(dx * dx + dy * dy) * M_PER_DEG
}

/**
 * How many permits of the snapshot stand within the radius of one address,
 * the boundary itself included. A record without usable coordinates cannot be
 * placed and is skipped: it is missing from the count, never counted as far
 * away, because "far away" is a claim the record does not support.
 */
export function countPermitsNear(
  permits: readonly MaybePoint[],
  centre: Point,
  radiusM: number = QUARTER_MILE_M,
): number {
  let n = 0
  for (const permit of permits) {
    const { lat, lon } = permit
    if (typeof lat !== 'number' || !Number.isFinite(lat)) continue
    if (typeof lon !== 'number' || !Number.isFinite(lon)) continue
    if (metresBetween({ lat, lon }, centre) <= radiusM) n += 1
  }
  return n
}

/**
 * "September 3, 2026" out of whichever of the two stamps arrived. Null when the
 * string is not one the publisher writes: a date nobody can read is not a date
 * to print, and every caller here treats null as "say nothing" rather than
 * guessing at one.
 */
export function formatLongDate(value: string | null | undefined): string | null {
  const m = GENERATED_RE.exec(String(value ?? ''))
  if (!m) return null
  const month = MONTH_NAMES[Number(m[2]) - 1]
  if (!month) return null
  return month + ' ' + Number(m[3]) + ', ' + Number(m[1])
}

/**
 * The sentence, or nothing at all.
 *
 * Nothing at all in three cases, and they are one case: the card has no claim
 * to make. No permit was found near the address, or the window the snapshot
 * covers is not a number, or its date is unreadable — in each the card is
 * printed without the line and the rest of it is unchanged. A sentence that
 * says nought, or one that names a window or a date we could not read, is worse
 * than the blank space it would fill.
 */
export function permitLine(input: {
  permits: readonly MaybePoint[]
  centre: Point
  windowDays: number
  generated: string | null | undefined
}): string | null {
  const n = countPermitsNear(input.permits, input.centre)
  if (n < 1) return null

  if (typeof input.windowDays !== 'number' || !Number.isFinite(input.windowDays)) return null

  const date = formatLongDate(input.generated)
  if (!date) return null

  const noun = n === 1 ? 'permit' : 'permits'
  return (
    n +
    ' roofing ' +
    noun +
    ' issued within a quarter mile of this address in the ' +
    input.windowDays +
    ' days to ' +
    date +
    '.'
  )
}
