// Columns of public.saved_selections that the list needs. center_lat and
// center_lon exist on the table but no row here shows a coordinate, so they are
// not fetched.
export type SavedSelectionRow = {
  id: string
  city: string
  trade: string
  snapshot_stamp: string
  nhood: string | null
  label: string | null
  addresses: string[]
  created_at: string
}

export const SAVED_SELECTION_COLUMNS =
  'id, city, trade, snapshot_stamp, nhood, label, addresses, created_at'

/**
 * One row as the screen needs it, which is not the same thing as the row of the
 * table above. It carries only what the island draws — the addresses arrive
 * counted rather than listed, because a count is all the line says — and the
 * date arrives as words, because the words are made on the server. A date
 * turned into words in the browser and the same date turned into words on the
 * server are two different strings, and hydrating one over the other is the
 * mismatch React reports.
 */
export type SavedSelectionItem = {
  id: string
  city: string
  trade: string
  snapshot_stamp: string
  nhood: string | null
  label: string | null
  address_count: number
  /** Already formatted, or null when the stamp did not parse — then say nothing. */
  created_label: string | null
}
