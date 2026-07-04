import { Section } from '@/components/layout/Section'
import { TRADE_CATEGORIES } from '@/lib/categories'

export default function CoveragePage() {
  return (
    <Section className="min-h-[60vh]">
      <div className="max-w-2xl">
        <h1 className="font-display text-5xl sm:text-6xl text-hail mb-6">Coverage</h1>
        <p className="text-muted text-base leading-relaxed mb-10">
          New service, expanding coverage. Currently live in San Francisco. More metros rolling out.
        </p>

        <h2 className="font-display text-2xl text-hail mb-4">Trades</h2>
        <div className="flex flex-wrap gap-2 mb-10">
          {TRADE_CATEGORIES.map((cat) => (
            <span
              key={cat.slug}
              className={`px-3 py-1.5 rounded-full border font-mono text-sm ${
                cat.live ? 'border-orange/40 text-hail' : 'border-hairline text-muted'
              }`}
            >
              {cat.live && <span className="text-orange mr-1.5">●</span>}
              {cat.label}
              {!cat.live && <span className="text-muted ml-1.5">· coming soon</span>}
            </span>
          ))}
        </div>

        <h2 className="font-display text-2xl text-hail mb-4">Metro areas</h2>
        <div className="bg-slate border border-hairline rounded-lg p-5">
          <div className="flex items-center gap-3">
            <span className="text-orange">●</span>
            <span className="text-hail">San Francisco, CA</span>
            <span className="font-mono text-muted text-xs ml-auto">Live — roofing, solar</span>
          </div>
        </div>
      </div>
    </Section>
  )
}
