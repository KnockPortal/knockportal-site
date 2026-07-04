import { Section } from '@/components/layout/Section'
import Link from 'next/link'

export default function HowItWorksPage() {
  return (
    <Section className="min-h-[60vh]">
      <div className="max-w-2xl">
        <p className="font-mono text-[11px] text-muted uppercase tracking-widest mb-4">Coming soon</p>
        <h1 className="font-display text-5xl sm:text-6xl text-hail mb-6">How it works</h1>
        <p className="text-muted text-lg leading-relaxed mb-8">
          Full explanation of the contractor flow, the homeowner flow, and how permits become
          morning emails — coming shortly.
        </p>
        <Link href="/pricing" className="text-orange hover:text-orange/80 transition-colors duration-150 text-sm">
          See plans — from $99/mo →
        </Link>
      </div>
    </Section>
  )
}
