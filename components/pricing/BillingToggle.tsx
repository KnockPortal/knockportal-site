'use client'

import { cn } from '@/lib/utils'

interface BillingToggleProps {
  value: 'monthly' | 'yearly'
  onChange: (v: 'monthly' | 'yearly') => void
}

export function BillingToggle({ value, onChange }: BillingToggleProps) {
  return (
    <div className="inline-flex items-center bg-slate border border-hairline rounded-full p-1 gap-1">
      <button
        onClick={() => onChange('monthly')}
        className={cn(
          'px-5 py-2 rounded-full text-sm font-medium transition-colors duration-150 focus-visible:outline-orange focus-visible:outline-2',
          value === 'monthly' ? 'bg-hail text-ink' : 'text-muted hover:text-hail'
        )}
      >
        Monthly
      </button>
      <button
        onClick={() => onChange('yearly')}
        className={cn(
          'px-5 py-2 rounded-full text-sm font-medium transition-colors duration-150 focus-visible:outline-orange focus-visible:outline-2 flex items-center gap-2',
          value === 'yearly' ? 'bg-hail text-ink' : 'text-muted hover:text-hail'
        )}
      >
        Yearly
        <span className="bg-orange text-ink text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full">
          2 months free
        </span>
      </button>
    </div>
  )
}
