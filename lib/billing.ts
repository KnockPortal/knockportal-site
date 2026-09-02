import Stripe from 'stripe'
import { COMBINATIONS } from '@/lib/combinations'
import { ANON_RE } from '@/lib/mailing'

/**
 * Everything the paid side of the product needs to know that is not a request
 * and not a response: the Stripe client, the price of a cell, and the shapes
 * both ends of checkout are checked against.
 *
 * It neither logs nor builds an HTTP response — the same discipline as
 * lib/entitlements.ts. A route turns a null into a status code, and that shape
 * does not belong to the resolution itself.
 */

// Lazy singleton — construct on first request, not at module load. Building the
// route (Next collects page data by importing this module) must not require
// STRIPE_SECRET_KEY to be present; a CI build with no secrets would otherwise
// fail at `new Stripe(undefined)`.
let _stripe: Stripe | null = null
export function getStripe(): Stripe {
  if (!_stripe) {
    // @ts-ignore — pinned to API version declared at webhook endpoint
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-06-24.dahlia' })
  }
  return _stripe
}

/**
 * The canonical origin, and the only address Stripe is ever sent back to. The
 * apex answers 308, so a return built on it would cost every buyer a redirect
 * on the one hop where the page has to be there already.
 *
 * Deliberately a literal and not an env var, the same reasoning MAPBOX_TOKEN
 * carries in lib/surface.ts: it is not a secret, and an env var would add a
 * deploy precondition for a value that never changes.
 */
export const SITE_ORIGIN = 'https://www.knockportal.com'

/**
 * The lookup key of the cell's price. The number itself lives in Stripe and
 * nowhere else: this project names a price, it never states one.
 */
export function priceLookupKey(city: string, trade: string): string {
  return `${city}-${trade}-monthly`
}

/**
 * How a cell is written out for a person to read. The two labels come from the
 * selector's registry, so the words on the offer are the words on the map. An
 * unknown cell has no name, and a cell with no name is not sold.
 */
export function cellLabel(city: string, trade: string): string | null {
  const cityRow = COMBINATIONS.find((c) => c.slug === city)
  if (!cityRow) return null
  const tradeRow = cityRow.trades.find((t) => t.slug === trade)
  if (!tradeRow) return null
  return `${cityRow.label} · ${tradeRow.label}`
}

/** What a cell costs, as Stripe answered it. Nothing here is written down by us. */
export type Offer = {
  price_id: string
  amount_cents: number
  currency: string
  interval: string
  label: string
}

// Ten minutes. The price of a cell moves at the speed of a decision, not of a
// request, and a lookup on every 402 would put a Stripe round trip inside the
// wall. Only a resolved offer is kept: caching a null would go on refusing to
// name a price for ten minutes after the owner had created one.
const OFFER_TTL_MS = 10 * 60 * 1000
const OFFER_CACHE = new Map<string, { offer: Offer; until: number }>()

/**
 * The price of a cell, by lookup key. Null when there is nothing to sell —
 * no price under that key, a price with no amount, a one-off price, or a cell
 * the registry cannot name. A Stripe failure is not a null: it is thrown, and
 * it is not cached, because "we could not ask" and "there is nothing" are two
 * different answers and only one of them is worth remembering.
 */
export async function resolveOffer(city: string, trade: string): Promise<Offer | null> {
  const key = priceLookupKey(city, trade)

  const hit = OFFER_CACHE.get(key)
  if (hit && hit.until > Date.now()) return hit.offer

  const label = cellLabel(city, trade)
  if (!label) return null

  const { data } = await getStripe().prices.list({
    lookup_keys: [key],
    active: true,
    limit: 1,
  })

  const price = data[0]
  if (!price || price.unit_amount == null || !price.recurring) return null

  const offer: Offer = {
    price_id: price.id,
    amount_cents: price.unit_amount,
    currency: price.currency,
    interval: price.recurring.interval,
    label,
  }

  OFFER_CACHE.set(key, { offer, until: Date.now() + OFFER_TTL_MS })
  return offer
}

// A cell name is at most this long. The columns are plain text with no bound of
// their own, and metadata arrives from Stripe rather than from this codebase:
// the check is on the shape, not on the vocabulary.
const CELL_FIELD_MAX = 80

/**
 * The cell a Stripe object was bought for, read off its metadata. Every field
 * has to be there and has to be the right shape — a subscription that carries
 * half of a cell names no row to write, and writing a guess is worse than
 * writing nothing.
 *
 * workspace_id goes through the same uuid test the anonymous cookie does: it is
 * a uuid column at the other end, and a value that is not one comes back as a
 * type error on every query rather than as the missing workspace it really is.
 */
export function readCellMetadata(
  meta: Record<string, string> | null | undefined,
): { workspace_id: string; city: string; trade: string } | null {
  if (!meta) return null

  const workspaceId = meta.workspace_id
  if (typeof workspaceId !== 'string' || !ANON_RE.test(workspaceId)) return null

  const city = meta.city
  const trade = meta.trade
  const named = (v: unknown): v is string =>
    typeof v === 'string' && v !== '' && v.length <= CELL_FIELD_MAX
  if (!named(city) || !named(trade)) return null

  return { workspace_id: workspaceId, city, trade }
}

/**
 * The shape of a path checkout may send him back to, and of a path the sign-in
 * may hand him on to. It is a surface address and its own query and nothing
 * else: an open redirect is exactly what a return_to becomes when it is taken
 * on trust, and the query is allowed because ?from= is how the personal variant
 * is addressed and losing it would return him to a different page than he left.
 */
export const RETURN_TO_RE =
  /^\/[a-z0-9-]{1,40}\/[a-z0-9-]{1,40}(\?[A-Za-z0-9=&_.%-]{0,160})?$/

/**
 * The page half of a return path, with the query cut off — or null when the
 * value is not a return path at all.
 *
 * It exists so a caller can compare the page against a cell it knows, by
 * equality. A prefix test cannot do that job: /sf/roofingx starts with
 * /sf/roofing and is a different address, and the man would come back from a
 * paid checkout onto a 404. The query is not part of that comparison — ?from=
 * is how the personal variant is addressed, and it varies by design.
 */
export function returnToPath(value: string): string | null {
  if (typeof value !== 'string' || !RETURN_TO_RE.test(value)) return null
  const cut = value.indexOf('?')
  return cut === -1 ? value : value.slice(0, cut)
}
