import { SITE_STATS } from '@/lib/stats'

export function CounterStrip() {
  return (
    <div className="border-t border-hairline">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 font-mono text-[11px]">
            <span>
              <span className="text-muted">TRACKED · 90D </span>
              <span className="text-hail">{SITE_STATS.tracked90d}</span>
            </span>
            <span>
              <span className="text-muted">PEAK </span>
              <span className="text-hail">{SITE_STATS.peak}</span>
            </span>
            <span>
              <span className="text-muted">TODAY </span>
              <span className="text-orange">{SITE_STATS.today}</span>
            </span>
            <span>
              <span className="text-muted">MEDIAN VALUE </span>
              <span className="text-hail">{SITE_STATS.medianValue}</span>
            </span>
          </div>
          <span className="font-mono text-[11px] text-muted">
            stream updates {SITE_STATS.streamTime}
          </span>
        </div>
      </div>
    </div>
  )
}
