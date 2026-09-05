'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { COMBINATIONS, type CombinationTrade } from '@/lib/combinations'
import { DATA_BASE } from '@/lib/surface'
import { cn } from '@/lib/utils'
import { DemandRequestForm, type DemandOrigin } from '@/components/home/DemandRequestForm'

const S_NA = 'Not available yet'
const S_NA_SUFFIX = ' — ' + S_NA
const S_DOWN =
  'The San Francisco data feed is temporarily unavailable. The map cannot open until it returns.'
const S_SUB_BADGE = 'Your subscription'
const L_CITY = 'City'
const L_TRADE = 'Trade'
const P_CITY = 'Choose a city'
const P_TRADE = 'Choose a trade'
const S_CITY_OTHER = 'My city is not listed'
const S_TRADE_OTHER = 'My trade is not listed'
const S_OPEN = 'Open the map'
const S_LIVE = 'Live today: '

/**
 * What the form is seeded with, and null while it is closed. `key` names the
 * choice the values came from; `seed` counts the openings, so asking twice for
 * the same cell still reaches the form as two separate requests.
 */
type Demand = {
  key: string
  city: string
  trade: string
  origin: DemandOrigin
  seed: number
}

/**
 * Every state a chosen combination can be in. Exhaustive by construction: the
 * switch below closes with a `never` assignment, so a fifth state added here
 * fails the type check instead of rendering nothing.
 */
type RowState = 'available' | 'subscribed' | 'data_down' | 'unavailable'

/**
 * Entitlements are stored now, but nothing writes them until checkout (order
 * item 14), and reading them here would put a cookie read on a static page.
 * Unreachable until then; wired to a real check with checkout. Typed as boolean
 * so the subscribed branch stays live code rather than being narrowed away.
 */
const SUBSCRIBED: boolean = false

function rowState(trade: CombinationTrade, dataDown: boolean): RowState {
  if (!trade.filled) return 'unavailable'
  if (dataDown) return 'data_down'
  if (SUBSCRIBED) return 'subscribed'
  return 'available'
}

const LABEL = 'block text-xs font-medium text-muted'
const SELECT =
  'mt-1 w-full rounded border border-hairline bg-ink px-3 py-2 text-sm text-hail focus:border-orange focus:outline-none disabled:cursor-not-allowed disabled:opacity-40'
const ACTION_BASE = 'inline-flex items-center gap-3 rounded px-4 py-3 text-sm'
const ROW_DISABLED = 'cursor-not-allowed text-muted'
const ROW_LINK =
  'bg-orange font-semibold text-ink hover:bg-[#E85D10] focus-visible:outline-hail focus-visible:outline-2 focus-visible:-outline-offset-2'
const LIVE_LINK =
  'underline decoration-muted underline-offset-4 transition-colors duration-150 hover:decoration-orange focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-orange'

/**
 * The one filled cell of the registry, or the several of them later. Computed
 * at module scope so the door is in the served HTML before anything is chosen.
 */
const LIVE = COMBINATIONS.flatMap((city) =>
  city.trades
    .filter((trade) => trade.filled)
    .map((trade) => ({
      key: `${city.slug}/${trade.slug}`,
      href: trade.href,
      label: `${city.label} · ${trade.label}`,
    }))
)

function optionLabel(item: { label: string; filled: boolean }) {
  return item.filled ? item.label : item.label + S_NA_SUFFIX
}

/**
 * What the chosen pair offers. An empty cell offers nothing here — the demand
 * form was already opened by the choice itself.
 */
function TradeAction({ trade, state }: { trade: CombinationTrade; state: RowState }) {
  switch (state) {
    case 'available':
      return (
        <Link href={trade.href} className={cn(ACTION_BASE, ROW_LINK)}>
          <span>{S_OPEN}</span>
        </Link>
      )
    case 'subscribed':
      return (
        <Link href={trade.href} className={cn(ACTION_BASE, ROW_LINK)}>
          <span>{S_OPEN}</span>
          <span className="shrink-0 text-xs font-medium">{S_SUB_BADGE}</span>
        </Link>
      )
    case 'data_down':
      // The reason is stated once, above the selects; the action only stops
      // offering a door that will not open.
      return (
        <button type="button" disabled className={cn(ACTION_BASE, ROW_DISABLED)}>
          <span>{S_OPEN}</span>
        </button>
      )
    case 'unavailable':
      return null
    default: {
      const exhaustive: never = state
      return exhaustive
    }
  }
}

export function CombinationSelector({ className }: { className?: string }) {
  const [dataDown, setDataDown] = useState(false)
  const [cityValue, setCityValue] = useState('')
  const [tradeValue, setTradeValue] = useState('')
  const [demand, setDemand] = useState<Demand | null>(null)

  const city = COMBINATIONS.find((item) => item.slug === cityValue) ?? null
  const trade = city?.trades.find((item) => item.slug === tradeValue) ?? null

  // Every opening goes through here. The counter rises on each call, which is
  // what tells the form to come back to its fields even when the choice landed
  // on the cell it is already holding.
  function openDemand(key: string, cityLabel: string, tradeLabel: string, origin: DemandOrigin) {
    setDemand((previous) => ({
      key,
      city: cityLabel,
      trade: tradeLabel,
      origin,
      seed: (previous?.seed ?? 0) + 1,
    }))
  }

  // A new city invalidates the trade chosen under the old one, and with it
  // whatever the form was holding. Only "not listed" carries a request of its
  // own, and it carries no city to seed.
  function chooseCity(value: string) {
    setCityValue(value)
    setTradeValue('')
    if (value === '__other__') {
      openDemand('city-other', '', '', 'free')
      return
    }
    setDemand(null)
  }

  function chooseTrade(value: string) {
    setTradeValue(value)
    if (!city) return
    if (value === '__other__') {
      openDemand(`trade-other:${city.slug}`, city.label, '', 'free')
      return
    }
    const chosen = city.trades.find((item) => item.slug === value)
    if (!chosen || chosen.filled) {
      setDemand(null)
      return
    }
    openDemand(`cell:${city.slug}/${chosen.slug}`, city.label, chosen.label, 'cell')
  }

  // Optimistic default: the action is clickable until the probe says otherwise,
  // so a visit never waits on the feed. In the worst race a person reaches the
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

      {/* Two dependent lists rather than a grid: the second one holds the
          trades of the city chosen in the first, so a pair that is not in the
          registry cannot be assembled here at all. */}
      <div className="max-w-md space-y-4">
        <div>
          <label htmlFor="combo-city" className={LABEL}>
            {L_CITY}
          </label>
          <select
            id="combo-city"
            value={cityValue}
            onChange={(event) => chooseCity(event.target.value)}
            className={SELECT}
          >
            <option value="" disabled>
              {P_CITY}
            </option>
            {COMBINATIONS.map((item) => (
              <option key={item.slug} value={item.slug}>
                {optionLabel(item)}
              </option>
            ))}
            <option value="__other__">{S_CITY_OTHER}</option>
          </select>
        </div>

        <div>
          <label htmlFor="combo-trade" className={LABEL}>
            {L_TRADE}
          </label>
          <select
            id="combo-trade"
            value={tradeValue}
            disabled={!city}
            onChange={(event) => chooseTrade(event.target.value)}
            className={SELECT}
          >
            <option value="" disabled>
              {P_TRADE}
            </option>
            {city?.trades.map((item) => (
              <option key={item.slug} value={item.slug}>
                {optionLabel(item)}
              </option>
            ))}
            {city && <option value="__other__">{S_TRADE_OTHER}</option>}
          </select>
        </div>
      </div>

      {trade && (
        <div className="mt-4">
          <TradeAction trade={trade} state={rowState(trade, dataDown)} />
        </div>
      )}

      {/* What is open right now, said in full and without a choice being made:
          the only surface link the page carries on its own. */}
      <p className="mt-6 text-sm text-hail/80">
        {S_LIVE}
        {LIVE.map((item, index) => (
          <span key={item.key}>
            {index > 0 && ', '}
            <Link href={item.href} className={LIVE_LINK}>
              {item.label}
            </Link>
          </span>
        ))}
      </p>

      {/* One form under the whole block rather than one under every choice: a
          second choice moves the values into the fields that are already on
          screen. It is never re-keyed, so the form survives every choice and
          keeps the address; what it resets on is the seed. */}
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
