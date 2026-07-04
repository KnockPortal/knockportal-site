import Link from 'next/link'
import { SAMPLE_PERMITS } from '@/lib/permit-data'

export function RegistryConsole() {
  return (
    <div className="bg-slate border border-hairline rounded-lg overflow-hidden font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
        <span className="text-muted tracking-wide">
          <span className="text-orange">●</span> INCOMING · LAST 7 DAYS
        </span>
        <span className="text-muted tracking-wide">SF · ROOFING+SOLAR</span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 px-4 py-2 border-b border-hairline">
        <span className="text-muted uppercase tracking-widest text-[10px]">Address (Masked)</span>
        <span className="text-muted uppercase tracking-widest text-[10px]">Neighborhood</span>
        <span className="text-muted uppercase tracking-widest text-[10px]">Value</span>
      </div>

      {/* Data rows */}
      {SAMPLE_PERMITS.map((permit, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_auto_auto] gap-x-6 px-4 py-2.5 border-b border-hairline last:border-0"
        >
          <span className="text-hail">{permit.address}</span>
          <span className="text-hail whitespace-nowrap">{permit.neighborhood}</span>
          <span className="text-orange whitespace-nowrap">{permit.value}</span>
        </div>
      ))}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-hairline bg-ink/20">
        <span className="text-muted text-[11px]">Full address &amp; value, every morning.</span>
        <Link
          href="/pricing"
          className="text-orange hover:text-orange/80 transition-colors duration-150 text-[11px]"
        >
          Unlock →
        </Link>
      </div>
    </div>
  )
}
