// No date here on purpose: this renders in a statically prerendered page, so any
// `new Date()` freezes at build time and would sit next to the LIVE dot going stale.
export function TelemetryBar() {
  return (
    <div className="border-b border-hairline">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <p className="font-mono text-[11px] text-muted text-center tracking-wide">
          37.7749°N · 122.4194°W{'  '}|{'  '}SAN FRANCISCO{'  '}|{'  '}
          <span className="text-orange">●</span> LIVE
        </p>
      </div>
    </div>
  )
}
