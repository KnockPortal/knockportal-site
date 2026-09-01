'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { COMBINATIONS, SURFACE_HREF, type CombinationTrade } from '@/lib/combinations'
import { DATA_BASE } from '@/lib/surface'
import { cn } from '@/lib/utils'
import {
  DemandRequestForm,
  DEMAND_FORM_ID,
  type DemandOrigin,
} from '@/components/home/DemandRequestForm'

const S_NA = 'Not available yet'
const S_DOWN =
  'The San Francisco data feed is temporarily unavailable. The map cannot open until it returns.'
const S_SUB_BADGE = 'Your subscription'
const S_OTHER = 'My city or trade is not listed'

/**
 * What the form is seeded with, and null while it is closed. `key` names the
 * trigger the values came from, so only that one reports itself as expanded;
 * `seed` counts the clicks, so asking twice from the same cell still reaches
 * the form as two separate requests.
 */
type Demand = {
  key: string
  city: string
  trade: string
  origin: DemandOrigin
  seed: number
}

/**
 * Every state a combination row can be in. Exhaustive by construction: the
 * switch below closes with a `never` assignment, so a fifth state added here
 * fails the type check instead of rendering nothing.
 */
type RowState = 'available' | 'subscribed' | 'data_down' | 'unavailable'

/**
 * Entitlements do not exist yet — no table to read, no checkout that could
 * write one. Unreachable until entitlements (order item 12) and checkout
 * (item 14) exist; wired to a real check there. Typed as boolean so the
 * subscribed branch stays live code rather than being narrowed away.
 */
const SUBSCRIBED: boolean = false

function rowState(trade: CombinationTrade, dataDown: boolean): RowState {
  if (!trade.filled) return 'unavailable'
  if (dataDown) return 'data_down'
  if (SUBSCRIBED) return 'subscribed'
  return 'available'
}

const ROW_BASE =
  'flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm transition-colors duration-150'
const ROW_DISABLED = 'cursor-not-allowed text-muted'
const ROW_LINK =
  'bg-orange font-semibold text-ink hover:bg-[#E85D10] focus-visible:outline-hail focus-visible:outline-2 focus-visible:-outline-offset-2'
// An empty cell is a question, not a wall: it stays quiet like the disabled row
// it replaced, and answers to a click.
const ROW_REQUEST =
  'text-muted hover:bg-hairline/40 hover:text-hail focus-visible:outline-orange focus-visible:outline-2 focus-visible:-outline-offset-2'

function TradeRow({
  trade,
  state,
  expanded,
  onRequest,
}: {
  trade: CombinationTrade
  state: RowState
  expanded: boolean
  onRequest: () => void
}) {
  switch (state) {
    case 'available':
      return (
        <Link href={SURFACE_HREF} className={cn(ROW_BASE, 'pl-8', ROW_LINK)}>
          <span>{trade.label}</span>
        </Link>
      )
    case 'subscribed':
      return (
        <Link href={SURFACE_HREF} className={cn(ROW_BASE, 'pl-8', ROW_LINK)}>
          <span>{trade.label}</span>
          <span className="shrink-0 text-xs font-medium">{S_SUB_BADGE}</span>
        </Link>
      )
    case 'data_down':
      // The reason is stated once, above the tree; the row only stops offering
      // a door that will not open.
      return (
        <button type="button" disabled className={cn(ROW_BASE, 'pl-8', ROW_DISABLED)}>
          <span>{trade.label}</span>
        </button>
      )
    case 'unavailable':
      // The label does not change and still carries no date: the row now takes
      // the click that used to go nowhere and asks who wanted it.
      return (
        <button
          type="button"
          onClick={onRequest}
          aria-controls={DEMAND_FORM_ID}
          aria-expanded={expanded}
          className={cn(ROW_BASE, 'pl-8', ROW_REQUEST)}
        >
          <span>{trade.label}</span>
          <span className="shrink-0 text-xs">{S_NA}</span>
        </button>
      )
    default: {
      const exhaustive: never = state
      return exhaustive
    }
  }
}

export function CombinationSelector({ className }: { className?: string }) {
  const [dataDown, setDataDown] = useState(false)
  const [demand, setDemand] = useState<Demand | null>(null)

  // Every trigger goes through here. The counter rises on each call, which is
  // what tells the form to come back to its fields even when the click landed
  // on the cell it is already holding.
  function openDemand(key: string, city: string, trade: string, origin: DemandOrigin) {
    setDemand((previous) => ({
      key,
      city,
      trade,
      origin,
      seed: (previous?.seed ?? 0) + 1,
    }))
  }

  // Optimistic default: the row is clickable until the probe says otherwise, so
  // a visit never waits on the feed. In the worst race a person reaches the
  // surface, which carries its own handling of missing data.
  useEffect(() => {
    let alive = true
    fetch(DATA_BASE + 'latest.json', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('HTTP ' + response.status)
        return response.json()
      })
      .then((parsed: unknown) => {
        const stamp =
          parsed && typeof parsed === 'object'
            ? (parsed as { stamp?: unknown }).stamp
            : undefined
        if (alive && !(typeof stamp === 'string' && stamp !== '')) setDataDown(true)
      })
      .catch(() => {
        if (alive) setDataDown(true)
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className={className}>
      {dataDown && (
        <p
          role="status"
          className="mb-4 rounded border border-hairline bg-slate px-4 py-3 text-sm leading-relaxed text-hail"
        >
          {S_DOWN}
        </p>
      )}

      <ul className="divide-y divide-hairline overflow-hidden rounded border border-hairline bg-slate">
        {COMBINATIONS.map((city) => (
          <li key={city.slug}>
            {city.filled ? (
              <>
                <h2 className="px-4 py-3 font-display text-base font-semibold text-hail">
                  {city.label}
                </h2>
                <ul className="divide-y divide-hairline border-t border-hairline">
                  {city.trades.map((trade) => {
                    const key = `trade:${city.slug}/${trade.slug}`
                    return (
                      <li key={trade.slug}>
                        <TradeRow
                          trade={trade}
                          state={rowState(trade, dataDown)}
                          expanded={demand?.key === key}
                          onRequest={() =>
                            openDemand(key, city.label, trade.label, 'cell')
                          }
                        />
                      </li>
                    )
                  })}
                </ul>
              </>
            ) : (
              // A city with nothing filled has no trades to show, so the whole
              // row is the cell: it names the city and leaves the trade open.
              <button
                type="button"
                onClick={() => openDemand(`city:${city.slug}`, city.label, '', 'cell')}
                aria-controls={DEMAND_FORM_ID}
                aria-expanded={demand?.key === `city:${city.slug}`}
                className={cn(ROW_BASE, 'font-display text-base font-semibold', ROW_REQUEST)}
              >
                <span>{city.label}</span>
                <span className="shrink-0 text-xs font-normal">{S_NA}</span>
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* Off the grid entirely: the combination someone needs may not be a cell
          of this tree at all, and that demand is worth the same as the rest. */}
      <button
        type="button"
        onClick={() => openDemand('free', '', '', 'free')}
        aria-controls={DEMAND_FORM_ID}
        aria-expanded={demand?.key === 'free'}
        className="mt-4 text-sm text-hail underline decoration-muted underline-offset-4 transition-colors duration-150 hover:decoration-orange focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-orange"
      >
        {S_OTHER}
      </button>

      {/* One form under the tree rather than one inside every row: a second
          click moves the values into the fields that are already on screen.
          It is never re-keyed, so the form survives every click and keeps the
          address; what it resets on is the seed. */}
      {demand && (
        <DemandRequestForm
          city={demand.city}
          trade={demand.trade}
          origin={demand.origin}
          seed={demand.seed}
        />
      )}
    </div>
  )
}
