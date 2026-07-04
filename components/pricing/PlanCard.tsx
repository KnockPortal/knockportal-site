import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PlanCardProps {
  name: string
  tagline: string
  monthlyPrice: string
  yearlyPrice: string
  yearlyLabel: string
  features: string[]
  billing: 'monthly' | 'yearly'
  stripeUrl: string
  badge?: string
  comingSoon?: boolean
  className?: string
}

export function PlanCard({
  name,
  tagline,
  monthlyPrice,
  yearlyPrice,
  yearlyLabel,
  features,
  billing,
  stripeUrl,
  badge,
  comingSoon,
  className,
}: PlanCardProps) {
  const price = billing === 'monthly' ? monthlyPrice : yearlyPrice
  const period = billing === 'monthly' ? '/mo' : '/yr'

  return (
    <div className={cn('relative bg-slate border border-hairline rounded-lg p-7 flex flex-col', className)}>
      {badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="bg-orange text-ink text-[10px] font-mono font-semibold uppercase tracking-widest px-3 py-1 rounded-full">
            {badge}
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-hail font-semibold text-xl mb-1">{name}</h3>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-hail font-display text-5xl">{price.split('/')[0]}</span>
          <span className="text-muted text-base">{period}</span>
        </div>
        {billing === 'yearly' && (
          <p className="text-muted text-xs font-mono">{yearlyLabel}</p>
        )}
        <p className="text-muted text-sm mt-2">{tagline}</p>
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <Check size={15} className="text-orange mt-0.5 shrink-0" />
            <span className="text-hail text-sm leading-snug"
              dangerouslySetInnerHTML={{ __html: feature }}
            />
          </li>
        ))}
      </ul>

      {comingSoon ? (
        <div className="text-center text-muted text-sm py-3 border border-hairline rounded">
          Coming soon — join the waitlist
        </div>
      ) : (
        <a
          href={stripeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full text-center py-3 bg-orange text-ink font-semibold text-sm rounded hover:bg-[#E85D10] transition-colors duration-150 focus-visible:outline-orange focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Subscribe — {price.split('/')[0]}{period}
        </a>
      )}
    </div>
  )
}
