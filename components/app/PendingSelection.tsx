'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { technicalLine, type UiError } from '@/lib/ui-error'

// Where the surface parks a selection it could not save because nobody was
// signed in. It hands the browser here; this island finishes the save.
const PENDING_SELECTION_KEY = 'kp_pending_selection'

export default function PendingSelection() {
  const router = useRouter()
  const [error, setError] = useState<UiError | null>(null)
  const ran = useRef(false)

  // The selection made on the surface before signing in. The key is removed
  // before the request goes out and not after it: left in place, a refusal
  // would be retried on every visit to this page for the rest of the tab's
  // life, and the same body would keep failing the same way.
  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const raw = window.sessionStorage.getItem(PENDING_SELECTION_KEY)
    if (!raw) return
    window.sessionStorage.removeItem(PENDING_SELECTION_KEY)

    let body: unknown
    try {
      body = JSON.parse(raw)
    } catch {
      // Nothing usable, and nothing worth saying about it: whatever was in
      // there did not come from a save this page can finish.
      return
    }

    const finish = async () => {
      const res = await fetch('/api/selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          error?: string
          field?: string
        } | null
        throw new Error(
          ['HTTP ' + res.status, payload?.error, payload?.field]
            .filter(Boolean)
            .join(' · '),
        )
      }
      router.refresh()
    }

    finish().catch((e: unknown) => {
      setError({
        headline: 'We could not save the selection you made before signing in.',
        detail: technicalLine(e),
      })
    })
  }, [router])

  if (!error) return null

  return (
    <div className="rounded border border-hairline bg-slate px-4 py-3">
      <p className="text-sm text-hail">{error.headline}</p>
      {error.detail && (
        <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted">
          {error.detail}
        </p>
      )}
    </div>
  )
}
