'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'

interface FaqItem {
  question: string
  answer: string
}

interface FaqAccordionProps {
  items: FaqItem[]
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="divide-y divide-hairline border-t border-hairline">
      {items.map((item, i) => (
        <div key={i}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
            className="w-full flex items-center justify-between py-5 text-left gap-4 focus-visible:outline-orange focus-visible:outline-2"
          >
            <span className="text-hail font-medium text-base">{item.question}</span>
            <span className="text-orange shrink-0" aria-hidden="true">
              {open === i ? <Minus size={18} /> : <Plus size={18} />}
            </span>
          </button>
          {open === i && (
            <div className="pb-5 text-muted text-sm leading-relaxed">{item.answer}</div>
          )}
        </div>
      ))}
    </div>
  )
}
