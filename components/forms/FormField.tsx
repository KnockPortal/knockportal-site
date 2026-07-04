import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: string
  name: string
  type?: 'text' | 'email' | 'tel' | 'textarea' | 'select'
  required?: boolean
  placeholder?: string
  children?: React.ReactNode
  className?: string
  rows?: number
}

export function FormField({
  label,
  name,
  type = 'text',
  required,
  placeholder,
  children,
  className,
  rows = 4,
}: FormFieldProps) {
  const inputClass =
    'w-full bg-slate border border-hairline rounded px-4 py-3 text-hail text-sm placeholder:text-muted focus:outline-none focus:border-orange transition-colors duration-150'

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={name} className="text-hail text-sm font-medium">
        {label}
        {required && <span className="text-orange ml-1">*</span>}
      </label>

      {type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          required={required}
          placeholder={placeholder}
          rows={rows}
          className={cn(inputClass, 'resize-none')}
        />
      ) : type === 'select' ? (
        <select
          id={name}
          name={name}
          required={required}
          className={cn(inputClass, 'appearance-none cursor-pointer')}
        >
          {children}
        </select>
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          className={inputClass}
        />
      )}
    </div>
  )
}
