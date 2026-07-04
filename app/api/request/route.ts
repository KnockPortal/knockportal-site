import { NextResponse } from 'next/server'

// TODO: Connect to Supabase (homeowner_leads table) + Resend (double opt-in email)
export async function POST() {
  return NextResponse.json({ ok: true, message: 'stub — backend not yet connected' }, { status: 200 })
}
