import { NextResponse } from 'next/server'
import { supabaseSession } from '@/lib/supabase-session'

export const runtime = 'nodejs'

/**
 * Export endpoint — permanent address, empty room.
 *
 * The gate is the session and nothing more, which is exactly the state of order
 * item 11a: there is no entitlement object yet (item 12) and no checkout that
 * could create one (item 14). The subscription check goes here, next to this
 * one, when they exist. Building the export itself — reading the snapshot,
 * collecting the addressed rows, emitting CSV — is the work of item 11b.
 *
 * Until then a signed-in caller gets 501: proof the cookie reached the server,
 * and nothing else.
 */
export async function POST() {
  const supabase = supabaseSession()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  }

  return NextResponse.json({ error: 'not_implemented' }, { status: 501 })
}
