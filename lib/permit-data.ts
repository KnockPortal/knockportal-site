// Real SF permit data (masked per design spec — full addresses for subscribers only).
// ZIP comes straight from the city record; the DB stores no neighborhood names.
// Static sample: issued 2026-07-30 — 2026-08-12. Labels referencing this data must state
// that fixed range, never a relative window ("this week"), which rots as soon as the page
// is built and the content freezes.
export const SAMPLE_PERMITS = [
  { address: '3XX Cumberland St', zip: '94114', value: '$20,000', issued: '2026-08-12' },
  { address: '4XX 45th Av (solar)', zip: '94121', value: '$51,460', issued: '2026-08-11' },
  { address: '17XX Noe St (solar)', zip: '94131', value: '$17,500', issued: '2026-08-11' },
  { address: '1XX Downey St (solar)', zip: '94117', value: '$39,350', issued: '2026-08-07' },
  { address: '6XX San Bruno Av (solar)', zip: '94107', value: '$28,850', issued: '2026-07-30' },
] as const
