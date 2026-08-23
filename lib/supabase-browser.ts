'use client'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Browser client — publishable key only. Never import lib/supabase-server here:
// that module holds the service-role client and bypasses RLS.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

let client: SupabaseClient | null = null

export function supabaseBrowser(): SupabaseClient {
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    )
  }
  // Single instance: a second GoTrueClient on the same storage key fights over
  // token refresh and emits duplicate auth events.
  if (!client) {
    client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // No link-based flow exists: both templates carry {{ .Token }} only and
        // Redirect URLs are empty, so there is never a session in the URL.
        detectSessionInUrl: false,
      },
    })
  }
  return client
}
