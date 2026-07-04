import { cn } from '@/lib/utils'

export function DottedBg({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('relative bg-ink dotted-bg', className)}>
      {children}
    </div>
  )
}
