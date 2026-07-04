interface ConsentProps {
  name?: string
  label: string
  required?: boolean
}

export function Consent({ name = 'consent', label, required }: ConsentProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <input
        type="checkbox"
        name={name}
        required={required}
        defaultChecked={false}
        className="mt-0.5 w-4 h-4 shrink-0 border border-hairline bg-slate rounded accent-orange focus:outline-none focus-visible:outline-orange focus-visible:outline-2 cursor-pointer"
      />
      <span className="text-muted text-sm leading-snug group-has-[:checked]:text-hail transition-colors duration-150">
        {label}
      </span>
    </label>
  )
}
