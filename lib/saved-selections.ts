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
