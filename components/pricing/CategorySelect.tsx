'use client'

import { cn } from '@/lib/utils'
import { TRADE_CATEGORIES } from '@/lib/categories'

export { TRADE_CATEGORIES } from '@/lib/categories'
export type { TradeCategory } from '@/lib/categories'

interface CategorySelectProps {
  value: string
  onChange: (slug: string) => void
  className?: string
}

export function CategorySelect({ value, onChange, className }: CategorySelectProps) {
  const selected = TRADE_CATEGORIES.find((c) => c.slug === value)

  return (
    <div
      className={cn(
        'flex items-center gap-4 bg-slate border border-hairline rounded-lg px-5 py-4',
        className
      )}
    >
      <span className="text-muted text-sm whitespace-nowrap">Choose your trade</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent text-hail text-sm focus:outline-none cursor-pointer appearance-none"
      >
        {TRADE_CATEGORIES.map((cat) => (
          <option key={cat.slug} value={cat.slug} className="bg-slate text-hail">
            {cat.label}{!cat.live ? ' · coming soon' : ''}
          </option>
        ))}
      </select>
      {selected?.live ? (
        <span className="font-mono text-orange text-[11px] whitespace-nowrap">
          ● Live in San Francisco
        </span>
      ) : (
        <span className="font-mono text-muted text-[11px] whitespace-nowrap">
          Coming soon
        </span>
      )}
    </div>
  )
}
