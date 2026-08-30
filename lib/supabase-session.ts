import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Reads the session out of the request cookies. Server only — it calls
 * next/headers, which has no meaning in the browser.
 *
 * Publishable key and RLS, deliberately: lib/supabase-server.ts is the module
 * that holds the service-role client and bypasses RLS, and the two must not
 * meet. Whatever this client can see, the signed-in user can see.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export function supabaseSession(): SupabaseClient {
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    )
  }

  const store = cookies()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return store.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            store.set(name, value, options)
          })
        } catch {
          // A Server Component cannot write cookies — next/headers throws on
          // set outside a Route Handler or Server Action. That is the expected
          // mode, not a swallowed failure: middleware.ts already refreshed the
          // session and wrote the cookies onto its own response, so there is
          // nothing to lose here. Letting the throw through would take down the
          // render over a write that was never needed.
        }
      },
    },
  })
}
