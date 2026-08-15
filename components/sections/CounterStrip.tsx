import { SITE_STATS } from '@/lib/stats'

const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
]

// Strip a leading zero / normalize a raw count like "0919" → "919"
function formatCount(raw: string) {
  return String(parseInt(raw, 10))
}

// "05-15" → "MAY 15"
function formatPeak(raw: string) {
  const [mm, dd] = raw.split('-')
  return `${MONTHS[parseInt(mm, 10) - 1]} ${parseInt(dd, 10)}`
}

export function CounterStrip() {
  return (
    <div className="border-t border-hairline">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 font-mono text-[11px]">
            <span>
              <span className="text-hail">{formatCount(SITE_STATS.tracked90d)} PERMITS</span>
              <span className="text-muted"> · 90 DAYS TO JUN 30</span>
            </span>
            <span>
              <span className="text-muted">PEAK </span>
              <span className="text-hail">{formatPeak(SITE_STATS.peak)}</span>
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
