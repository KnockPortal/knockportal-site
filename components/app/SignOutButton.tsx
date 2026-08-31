'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { secondaryClass } from '@/lib/ui-error'

export default function SignOutButton() {
  const supabase = supabaseBrowser()
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  // No confirmation on screen afterwards: signing out clears the cookie, and the
  // re-rendered page comes back as the sign-in form, which says it better than a
  // line of text would.
  async function signOut() {
    setBusy(true)
    await supabase.auth.signOut()
    setBusy(false)
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={busy}
      className={secondaryClass}
    >
      Sign out
    </button>
  )
}
