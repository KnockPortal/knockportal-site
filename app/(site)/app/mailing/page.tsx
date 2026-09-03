import { notFound, redirect } from 'next/navigation'
import { supabaseSession } from '@/lib/supabase-session'
import { ensureWorkspace } from '@/lib/workspace'
import { readEntitlement } from '@/lib/entitlements'
import { cellLabel } from '@/lib/billing'
import { findMailing, printCostCents } from '@/lib/mailing'
import { PROFILE_COLUMNS, type PostcardProfileRow } from '@/lib/postcard-profile'
import { formatLongDate, permitLine } from '@/lib/postcard-line'
import { readSnapshotContext } from '@/lib/snapshot'
import { SURFACE_CITY, SURFACE_TRADE } from '@/lib/surface'
import { describeError, secondaryClass, type UiError } from '@/lib/ui-error'
import MailingApprove from '@/components/app/MailingApprove'
import PostcardMockup from '@/components/app/PostcardMockup'

// Every read on this page is keyed to the session in the request cookies, and
// one of them reaches a bucket that republishes on its own schedule. There is
// nothing here a build-time copy could be right about.
export const dynamic = 'force-dynamic'

/**
 * Step four of the round: the card, the doors and the price on one screen, with
 * one button under them.
 *
 * The page is a Server Component and it stays one. Everything shown is read,
 * counted and formatted here — the money out of the one function that knows the
 * price, the dates out of the one module that spells the months — and the only
 * thing shipped to the browser is the button. That is not a preference: a date
 * or a sum formatted in the browser and again on the server are two strings,
 * and this workspace has already paid for that lesson once.
 *
 * The order of the checks below is the order of the refusals, and each one ends
 * the page where it stands: the wrong cell is not a page at all, no session is
 * not this page's business, no right is a wall, and an empty mailing has
 * nothing to approve. Nothing past a refusal is read — the snapshot in
 * particular, which costs three fetches nobody behind a wall should pay for.
 */

const MAP_HREF = `/${SURFACE_CITY}/${SURFACE_TRADE}`

/** The one place money is turned into words on this screen. */
function money(cents: number): string {
  return '$' + (cents / 100).toFixed(2)
}

/** Singular at one, the way the strip on the surface says it. */
function doors(n: number): string {
  return n === 1 ? 'address' : 'addresses'
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-16">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-hail">
        Approve the mailing
      </h1>
      <div className="mt-8 space-y-8">{children}</div>
    </div>
  )
}

function ErrorBlock({ error }: { error: UiError }) {
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

function MapLink() {
  return (
    <a href={MAP_HREF} className={`${secondaryClass} inline-block`}>
      Open the map
    </a>
  )
}

/** One row of the mailing, as the page reads it. */
type AddressRow = {
  address: string
  zip: string | null
  lat: number | null
  lon: number | null
  added_at: string
}

export default async function MailingApprovePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // The cell is part of the address of this screen and not a preference on it.
  // Anything but the one filled combination has no mailing, no snapshot and no
  // page — a 404 and not an empty state, which would imply there is a cell here
  // that happens to be empty.
  if (searchParams.city !== SURFACE_CITY || searchParams.trade !== SURFACE_TRADE) {
    notFound()
  }

  const supabase = supabaseSession()
  const { data: auth } = await supabase.auth.getUser()

  // Sent to the workspace rather than shown a sign-in panel here. The way to
  // this screen is the Send button on the surface, and that button already
  // knows what to say to someone who is not signed in.
  if (!auth.user) redirect('/app')

  // The same block every other failure on this screen uses. The workspace page
  // says a sentence of its own here; this one does not, because a screen that
  // shows nothing but refusals has no business inventing words for them — the
  // service string is what a support ticket is answered from, and describeError
  // is the one place that turns it into something to read.
  const workspace = await ensureWorkspace(supabase, null)
  if (!workspace.ok) {
    return (
      <Shell>
        <ErrorBlock error={describeError({ message: workspace.detail })} />
      </Shell>
    )
  }

  const workspaceId = workspace.workspace.workspace_id

  // The session client, and never the service-role one — the same rule the send
  // gate and the export are written under. A right that could not be read is
  // not a right.
  const check = await readEntitlement(supabase, workspaceId, SURFACE_CITY, SURFACE_TRADE)
  if (!check.ok) {
    return (
      <Shell>
        <ErrorBlock error={describeError({ message: check.detail })} />
      </Shell>
    )
  }

  // The wall. Nothing below it is read: not the card, not the doors, not the
  // price. A screen that shows the work behind a wall it is refusing has not
  // refused anything.
  if (!check.granted) {
    return (
      <Shell>
        <section className="space-y-4">
          <p className="text-sm text-hail">Sending needs a subscription.</p>
          <MapLink />
        </section>
      </Shell>
    )
  }

  const label = cellLabel(SURFACE_CITY, SURFACE_TRADE)

  // Under the session, and the SELECT policy is what decides it can be seen.
  // findMailing takes any client for exactly this reason.
  let mailingId: string | null = null
  let readError: UiError | null = null
  try {
    mailingId = await findMailing(
      supabase,
      { kind: 'workspace', workspaceId },
      SURFACE_CITY,
      SURFACE_TRADE,
    )
  } catch (e) {
    readError = describeError(e)
  }

  if (readError) {
    return (
      <Shell>
        <ErrorBlock error={readError} />
      </Shell>
    )
  }

  let rows: AddressRow[] = []
  let approval: {
    approved_at: string | null
    approved_count: number | null
    approved_price_cents: number | null
  } | null = null

  if (mailingId) {
    const { data: addressData, error: addressError } = await supabase
      .from('mailing_addresses')
      .select('address, zip, lat, lon, added_at')
      .eq('mailing_id', mailingId)
      .order('added_at', { ascending: true })
      .returns<AddressRow[]>()

    if (addressError) {
      return (
        <Shell>
          <ErrorBlock error={describeError(addressError)} />
        </Shell>
      )
    }
    rows = addressData ?? []

    const { data: mailingRow, error: mailingError } = await supabase
      .from('mailings')
      .select('approved_at, approved_count, approved_price_cents')
      .eq('id', mailingId)
      .maybeSingle<{
        approved_at: string | null
        approved_count: number | null
        approved_price_cents: number | null
      }>()

    if (mailingError) {
      return (
        <Shell>
          <ErrorBlock error={describeError(mailingError)} />
        </Shell>
      )
    }
    approval = mailingRow
  }

  // No draft and an empty draft are one state to the man looking at the screen:
  // there is nothing here to approve, and the way to fix it is the map.
  if (rows.length === 0) {
    return (
      <Shell>
        <section className="space-y-4">
          <p className="text-sm text-hail">Nothing in this mailing yet.</p>
          <MapLink />
        </section>
      </Shell>
    )
  }

  const n = rows.length
  const priceCents = printCostCents(n)

  const { data: profile, error: profileError } = await supabase
    .from('postcard_profiles')
    .select(PROFILE_COLUMNS)
    .eq('workspace_id', workspaceId)
    .maybeSingle<PostcardProfileRow>()

  if (profileError) {
    return (
      <Shell>
        <ErrorBlock error={describeError(profileError)} />
      </Shell>
    )
  }

  const list = (
    <div className="max-h-64 overflow-y-auto rounded border border-hairline bg-slate px-3 py-2">
      {rows.map((row) => (
        <div key={row.address} className="font-mono text-xs leading-relaxed text-hail">
          {row.address}
        </div>
      ))}
    </div>
  )

  const countLine = (
    <p className="text-sm text-hail">
      <b>{n}</b> {doors(n)} · {money(priceCents)} print
    </p>
  )

  // No profile, no card — and no approval either, because what would be
  // approved is a card that cannot be printed. The doors and the price still
  // show: they are true whether or not the profile has been filled in, and
  // seeing them is what makes the missing profile worth going to fix.
  if (!profile) {
    return (
      <Shell>
        {label && <p className="text-sm text-muted">{label}</p>}
        <section className="space-y-4">
          <p className="text-sm text-hail">
            The postcard prints from your postcard details. Fill them in first.
          </p>
          <a href="/app" className={`${secondaryClass} inline-block`}>
            Open postcard details
          </a>
        </section>
        <section className="space-y-3">
          {countLine}
          {list}
        </section>
      </Shell>
    )
  }

  // Only now, and only behind everything above: three fetches of a public
  // bucket, paid for by a page that has already decided it has something to
  // show.
  const snapshot = await readSnapshotContext()

  // One door, printed and counted. The card is addressed to the first row that
  // has a point, because that is the row the sentence is counted around, and
  // the sentence says "this address": printing one door and counting another
  // would put a claim on the card about a house that is not on it. A list where
  // no row has a point — every row added by an older copy of the surface script
  // — is shown addressed to its first door with no sentence under it, which
  // claims nothing and so cannot claim it of the wrong house.
  const coordRow =
    rows.find((row) => Number.isFinite(row.lat) && Number.isFinite(row.lon)) ?? null
  const printed = coordRow ?? rows[0]
  const addressee = { address: printed.address, zip: printed.zip }

  const line =
    snapshot && coordRow
      ? permitLine({
          permits: snapshot.permits,
          centre: { lat: coordRow.lat as number, lon: coordRow.lon as number },
          windowDays: snapshot.windowDays,
          generated: snapshot.generated,
        })
      : null

  const approvedDate = approval?.approved_at ? formatLongDate(approval.approved_at) : null
  const approvedCount = approval?.approved_count ?? 0
  const approvedPrice = approval?.approved_price_cents ?? 0

  return (
    <Shell>
      {label && <p className="text-sm text-muted">{label}</p>}

      <PostcardMockup profile={profile} permitLine={line} addressee={addressee} />

      <section className="space-y-2">
        <p className="text-sm text-muted">
          The addressee line is confirmed with the print vendor before anything is
          mailed.
        </p>
        {profile.qr_target && (
          <p className="text-sm text-muted">
            The QR code is generated at print and points at this address.
          </p>
        )}
        {!profile.license_number && (
          <p className="text-sm text-hail">
            California requires the contractor license number on a mailed ad. Add it in
            postcard details before print.
          </p>
        )}
        {/* Said once and plainly. A snapshot that could not be read costs the
            counted sentence on the card and the button under it: approving
            against figures we could not stand behind is worse than asking him
            to load the page again. */}
        {!snapshot && (
          <p className="text-sm text-hail">
            The current data snapshot could not be read. Reload to try again.
          </p>
        )}
      </section>

      <section className="space-y-3">
        {countLine}
        {list}
      </section>

      {approval?.approved_at ? (
        <section className="space-y-2">
          <p className="text-sm text-hail">
            Approved {approvedDate} · {approvedCount} {doors(approvedCount)} ·{' '}
            {money(approvedPrice)}
          </p>
          <p className="text-sm text-muted">Sending to print is not available yet.</p>
        </section>
      ) : (
        snapshot && (
          <MailingApprove
            city={SURFACE_CITY}
            trade={SURFACE_TRADE}
            snapshotStamp={snapshot.stamp}
          />
        )
      )}
    </Shell>
  )
}
