// Real SF permit data (masked per design spec — full addresses for subscribers only).
// ZIP comes straight from the city record; the DB stores no neighborhood names.
//
// Static sample: issued 2026-08-11 — 2026-08-17. Labels referencing this data must state
// that fixed range, never a relative window ("this week"), which rots as soon as the page
// is built and the content freezes.
//
// Roofing rows carry NO value: since the city's 2026-07-01 migration, reroofing permits are
// published in a dataset with no job-cost field. Do not add a value to a roofing row — there
// is no source for it. Solar rows still carry cost (older dataset, unaffected).
//
// Roofing rows verified against the live city feed 2026-08-18:
//   22XX Chestnut St  BLDG-26-2095   10XX Church St  BLDG-26-2149   17XX Irving St  BLDG-26-2045
export type SamplePermit = {
  address: string
  zip: string
  trade: 'Roofing' | 'Solar'
  value: string | null
  issued: string
}

export const SAMPLE_PERMITS: readonly SamplePermit[] = [
  { address: '22XX Chestnut St', zip: '94123', trade: 'Roofing', value: null, issued: '2026-08-17' },
  { address: '10XX Church St', zip: '94114', trade: 'Roofing', value: null, issued: '2026-08-17' },
  { address: '17XX Irving St', zip: '94122', trade: 'Roofing', value: null, issued: '2026-08-17' },
  { address: '4XX 45th Av', zip: '94121', trade: 'Solar', value: '$51,460', issued: '2026-08-11' },
  { address: '17XX Noe St', zip: '94131', trade: 'Solar', value: '$17,500', issued: '2026-08-11' },
] as const
