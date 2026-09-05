import { TRADE_CATEGORIES } from '@/lib/categories'
import { SURFACE_CITY, SURFACE_TRADE } from '@/lib/surface'

/**
 * The selector's registry of city x trade combinations.
 *
 * Trades come from TRADE_CATEGORIES, in that order, as slug/label pairs only:
 * the `live` flag there is the Stripe webhook's configuration (which vertical
 * may be checked out) and says nothing about whether a surface is filled.
 * Filledness has exactly one source — the SURFACE_CITY / SURFACE_TRADE pair.
 * Every trade also carries the address of that cell's surface, whether or not
 * the cell is filled.
 */

export type CombinationTrade = {
  slug: string
  label: string
  filled: boolean
  href: string
}

export type CombinationCity = {
  slug: string
  label: string
  /** True when the city holds at least one filled combination. */
  filled: boolean
  trades: CombinationTrade[]
}

/**
 * The city axis. Adding or replacing a city is one edit of this array; the
 * order shown on the page is the order written here.
 */
const CITIES: { slug: string; label: string }[] = [
  { slug: 'sf', label: 'San Francisco' },
  { slug: 'oakland', label: 'Oakland' },
  { slug: 'san-jose', label: 'San Jose' },
]

/** Address of the filled combination, built from the surface constants. */
export const SURFACE_HREF = `/${SURFACE_CITY}/${SURFACE_TRADE}`

export const COMBINATIONS: CombinationCity[] = CITIES.map((city) => {
  const trades = TRADE_CATEGORIES.map(({ slug, label }) => {
    const href = `/${city.slug}/${slug}`
    return {
      slug,
      label,
      filled: city.slug === SURFACE_CITY && slug === SURFACE_TRADE,
      href,
    }
  })
  return {
    slug: city.slug,
    label: city.label,
    filled: trades.some((trade) => trade.filled),
    trades,
  }
})
