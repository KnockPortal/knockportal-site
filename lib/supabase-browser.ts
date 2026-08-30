'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Browser client — publishable key only. Never import lib/supabase-server here:
// that module holds the service-role client and bypasses RLS.
//
// The token now lives in cookies rather than in browser-only web storage, which
// the server could never see. A cookie rides along with every request, so the
// session is readable server-side too — lib/supabase-session.ts for Server
// Components and Route Handlers, middleware.ts for the refresh. Callers see none
// of this: the export, its signature and its return type are unchanged.
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
    client = createBrowserClient(url, key, {
      auth: {
        persistSession: true,
        // No link-based flow exists: both templates carry {{ .Token }} only and
        // Redirect URLs are empty, so there is never a session in the URL.
        detectSessionInUrl: false,
        // autoRefreshToken is deliberately left unset. @supabase/ssr defaults it
        // to "is this a browser": true in the browser, false while Next
        // pre-renders — where a refresh ticker would have no cookie to read and
        // nothing to refresh.
      },
    })
  }
  return client
}
