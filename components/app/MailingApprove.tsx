'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { primaryClass } from '@/lib/ui-error'

/**
 * The one button on the approval screen.
 *
 * It draws nothing but itself. A successful approval is answered with
 * router.refresh() and the approved state arrives as a server render — the same
 * render that formatted the date and the money in the first place. An island
 * that wrote "Approved <today>" on its own would be formatting a date in the
 * browser, which is the one thing this screen is written to avoid.
 *
 * Nothing is checked here before the request goes out, and the count is not
 * sent: the route counts the rows itself. What travels is the stamp of the
 * snapshot the numbers on screen were read against, so the row records which
 * data he was looking at when he agreed to it.
 */
export default function MailingApprove({
  city,
  trade,
  snapshotStamp,
}: {
  city: string
  trade: string
  snapshotStamp: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function approve() {
    setBusy(true)
    setError(null)

    try {
      const res = await fetch('/api/mailing/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ city, trade, snapshot_stamp: snapshotStamp }),
      })

      if (res.status === 200) {
        // busy stays set: the refresh replaces this island with the approved
        // state, and a button that comes back to life for the moment in between
        // is a button that can be pressed twice.
        router.refresh()
        return
      }

      // The mailing emptied under him — another tab, or the surface. The screen
      // he is looking at is describing a list that is no longer there.
      if (res.status === 409) {
        setError('Nothing in this mailing yet.')
      } else {
        setError('Something went wrong. HTTP ' + res.status)
      }
    } catch (e) {
      setError('Something went wrong. ' + String((e as Error)?.message || e))
    }

    setBusy(false)
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={approve} disabled={busy} className={primaryClass}>
        {busy ? 'Approving…' : 'Approve this mailing'}
      </button>
      {error && <p className="text-sm text-hail">{error}</p>}
    </div>
  )
}
