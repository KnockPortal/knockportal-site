import type { SupabaseClient } from '@supabase/supabase-js'

// Returns true when the customer has an active subscription covering the given metro.
// Gate: status in (active, trialing) AND current_period_end > now AND metro linked.
export async function hasMetroAccess(
  customerId: string,
  metroId: string,
  db: SupabaseClient,
): Promise<boolean> {
  const now = new Date().toISOString()
  const { data, error } = await db
    .from('subscriptions')
    .select('id, subscription_metros!inner(metro_id)')
    .eq('customer_id', customerId)
    .in('status', ['active', 'trialing'])
    .gt('current_period_end', now)
    .eq('subscription_metros.metro_id', metroId)
    .limit(1)

  if (error) throw error
  return (data?.length ?? 0) > 0
}
