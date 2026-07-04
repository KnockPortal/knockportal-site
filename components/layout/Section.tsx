import { cn } from '@/lib/utils'

interface SectionProps {
  children: React.ReactNode
  className?: string
  id?: string
  as?: 'section' | 'div' | 'article'
  elevated?: boolean
}

export function Section({ children, className, id, as: Tag = 'section', elevated }: SectionProps) {
  return (
    <Tag
      id={id}
      className={cn(
        'py-16 md:py-24',
        elevated && 'bg-slate border-t border-hairline',
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </Tag>
  )
}
