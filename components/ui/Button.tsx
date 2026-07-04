import { cn } from '@/lib/utils'
import Link from 'next/link'

type Variant = 'primary' | 'outline' | 'ghost' | 'slate-strong'

interface ButtonProps {
  variant?: Variant
  href?: string
  external?: boolean
  className?: string
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

const variants: Record<Variant, string> = {
  primary:
    'bg-orange text-ink font-semibold hover:bg-[#E85D10] transition-colors duration-150',
  outline:
    'border border-hail text-hail bg-transparent hover:bg-hail/10 transition-colors duration-150',
  'slate-strong':
    'border border-hail/60 text-hail bg-transparent hover:bg-hail/10 transition-colors duration-150',
  ghost:
    'text-hail bg-transparent hover:text-orange transition-colors duration-150',
}

const base =
  'inline-flex items-center justify-center px-5 py-2.5 rounded text-sm font-medium cursor-pointer focus-visible:outline-orange focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

export function Button({
  variant = 'primary',
  href,
  external,
  className,
  children,
  onClick,
  type = 'button',
  disabled,
}: ButtonProps) {
  const classes = cn(base, variants[variant], className)

  if (href) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
          {children}
        </a>
      )
    }
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  )
}
