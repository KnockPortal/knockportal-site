'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SavedSelectionItem } from '@/lib/saved-selections'
import { secondaryClass, technicalLine, type UiError } from '@/lib/ui-error'

/**
 * Draws the rows the server read. It holds no Supabase client of its own: the
 * page already fetched this list under the caller's session, and a second
 * reader in the browser would be a second answer to the same question.
 */
export default function SavedSelectionsList({ rows }: { rows: SavedSelectionItem[] }) {
  const router = useRouter()

  // At most one row is ever awaiting confirmation, so this is an id and not a
  // flag per row.
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<UiError | null>(null)

  // The row leaves the screen when the server says it is gone, not when the
  // click lands: an optimistic removal would have to be put back on a refusal,
  // and for a moment the list would disagree with the table.
  async function deleteSaved(id: string) {
    setDeletingId(id)
    setError(null)
    try {
      const res = await fetch('/api/selections/' + encodeURIComponent(id), {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null
        setError({
          headline: 'We could not delete that selection.',
          detail: ['HTTP ' + res.status, payload?.error].filter(Boolean).join(' · '),
        })
        return
      }
      router.refresh()
    } catch (e: unknown) {
      setError({
        headline: 'We could not delete that selection.',
        detail: technicalLine(e),
      })
    } finally {
      setDeletingId(null)
      setConfirmingId(null)
    }
  }

  return (
    <>
      {error && (
        <div className="rounded border border-hairline bg-slate px-4 py-3">
          <p className="text-sm text-hail">{error.headline}</p>
          {error.detail && (
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted">
              {error.detail}
            </p>
          )}
        </div>
      )}

      {rows.length === 0 && (
        <p className="text-sm text-muted">
          Nothing saved yet. Pick houses on the map and save the selection to find it
          here.
        </p>
      )}

      {rows.length > 0 && (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded border border-hairline bg-slate px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-hail">{row.nhood || row.label || '—'}</p>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted">
                    {row.address_count === 1
                      ? '1 address'
                      : `${row.address_count} addresses`}
                    {' · '}
                    {`snapshot ${row.snapshot_stamp}`}
                    {/* The date came formatted, and it came from the server; a
                        row whose stamp did not parse loses the separator with
                        it rather than trailing a dot into nothing. */}
                    {row.created_label && ' · '}
                    {row.created_label}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-3">
                  {/* The combination comes from the row, not from the surface
                      constants: a saved selection carries the city and trade it
                      was made in. The surface reads ?selection=, finds the group
                      by the stored centre and puts the addresses back on the
                      map. */}
                  <a
                    href={`/${encodeURIComponent(row.city)}/${encodeURIComponent(
                      row.trade,
                    )}?selection=${encodeURIComponent(row.id)}`}
                    className="text-sm text-orange hover:underline"
                  >
                    Open on the map
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirmingId === row.id) {
                        void deleteSaved(row.id)
                        return
                      }
                      // Arming this row disarms whichever was armed before, so
                      // only one row is ever one click from being deleted.
                      setConfirmingId(row.id)
                    }}
                    disabled={deletingId !== null}
                    className={`${secondaryClass} px-3 py-1`}
                  >
                    {confirmingId === row.id ? 'Confirm delete' : 'Delete'}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
