import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Keeps the cookie session alive on the routes that read it on the server.
 * It never redirects and never blocks: an unauthenticated request is answered
 * by the route itself (see app/api/export/route.ts).
 */
export async function middleware(request: NextRequest) {
  // The response is built first and then handed to the cookie writer, because
  // the refreshed tokens are written onto THIS response. Returning a
  // NextResponse created after the auth call would drop those Set-Cookie
  // headers: the session stops refreshing, nothing errors, and the user is
  // signed out an hour later for no visible reason.
  let response = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return response

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // Onto the request so anything downstream in this same pass reads the
        // fresh values, then onto a response rebuilt from that request so the
        // browser gets them.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  // Asks Supabase who the user is rather than decoding the token locally: this
  // round trip is what actually refreshes an expiring session.
  await supabase.auth.getUser()

  return response
}

export const config = {
  // Deliberately narrow. The public surface /<city>/<trade> and the marketing
  // pages are absent: they need no session, and an extra server round trip on
  // an indexed address costs every anonymous visit.
  //
  // /api/webhooks/stripe is absent under any circumstance — it reads the raw
  // body and verifies the Stripe signature, and no intermediate layer belongs
  // on that path.
  matcher: ['/app', '/app/:path*', '/api/export', '/api/export/:path*'],
}
