export type TradeCategory = {
  slug: string
  label: string
}

export const TRADE_CATEGORIES: TradeCategory[] = [
  { slug: 'roofing', label: 'Roofing' },
  { slug: 'solar', label: 'Solar' },
  { slug: 'hvac', label: 'HVAC' },
  { slug: 'electrical', label: 'Electrical' },
  { slug: 'plumbing', label: 'Plumbing' },
  { slug: 'windows', label: 'Windows / Siding' },
]
