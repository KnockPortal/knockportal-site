// Real SF permit data (masked per design spec — full addresses for subscribers only)
export const SAMPLE_PERMITS = [
  { address: '7XX Montgomery St', neighborhood: 'Chinatown', value: '$40,000', issued: '2026-06-26' },
  { address: '2XX Clipper St', neighborhood: 'Noe Valley', value: '$37,000', issued: '2026-06-26' },
  { address: '23XX 43rd Av', neighborhood: 'Sunset/Parkside', value: '$32,300', issued: '2026-06-26' },
  { address: '5XX Rhode Island St', neighborhood: 'Potrero Hill', value: '$18,000', issued: '2026-06-26' },
  { address: '2XX 27th St (solar)', neighborhood: 'Noe Valley', value: '$52,465', issued: '2026-06-22' },
] as const
