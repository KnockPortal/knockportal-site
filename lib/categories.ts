export type TradeCategory = {
  slug: string
  label: string
  live: boolean
}

export const TRADE_CATEGORIES: TradeCategory[] = [
  { slug: 'roofing', label: 'Roofing', live: true },
  { slug: 'solar', label: 'Solar', live: true },
  { slug: 'hvac', label: 'HVAC', live: false },
  { slug: 'electrical', label: 'Electrical', live: false },
  { slug: 'plumbing', label: 'Plumbing', live: false },
  { slug: 'windows', label: 'Windows / Siding', live: false },
]
