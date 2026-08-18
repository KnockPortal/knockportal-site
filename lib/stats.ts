// Verified against the city feed 2026-08-18: 303 reroofing permits issued 2026-07-20 — 2026-08-17
// (issued only, cancelled/stopped excluded); busiest single day 2026-08-05 with 24; busiest ZIP
// 94112 with 31. Refresh monthly — these are static, and a stale window is visible to any reader
// who checks. medianValue was removed on purpose: the new roofing dataset carries no job cost.
export const SITE_STATS = {
  tracked30d: '0303',
  windowLabel: '30 DAYS TO AUG 17',
  peak: '08-05',
  busiestZip: '94112',
  streamTime: '06:00 PT daily',
} as const
