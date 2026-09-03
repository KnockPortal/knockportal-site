import {
  PREFERRED_CONTACT_VALUES,
  type PostcardProfileRow,
  type PreferredContact,
} from '@/lib/postcard-profile'
import { SURFACE_MAIL_CITY_LINE } from '@/lib/surface'

/**
 * The card, both faces, at the proportion it is printed at.
 *
 * A Server Component: everything on it is either a column of the profile or a
 * sentence counted on the server, and there is nothing here to click.
 *
 * This is a sheet of paper and not a panel of the workspace. The page around it
 * is dark and every token of the dark theme stays outside the two rectangles —
 * white ground, dark text — because what is being shown is what the vendor will
 * print, and a mockup that borrows the colours of the screen it sits on is a
 * mockup of the screen. The one orange mark on the front is the exception, and
 * it is there because the card carries a wordmark.
 *
 * Two things are deliberately absent. There is no QR code — only the square it
 * will occupy and the address it will point at — because generating one would
 * mean a dependency, and the card does not need one to be approved. And there
 * is no addressee line: how the vendor writes it is not settled, and inventing
 * a line here would put a decision on the card that nobody has made. The space
 * for it is left empty and the screen says why, which is the honest place for
 * an explanation the card itself cannot carry.
 */

/** 6 by 4.25 inches, the size in the vendor's quotation. */
const FACE = 'aspect-[24/17] w-full border border-hairline bg-white text-ink'

export type PostcardAddressee = { address: string; zip: string | null }

/**
 * The channels the back prints, preferred one first. The rest keep the order
 * the schema lists them in — it is the order the form draws, and a card whose
 * contact block reshuffles itself between two profiles is a different card.
 */
function contactOrder(row: PostcardProfileRow): PreferredContact[] {
  const rest = PREFERRED_CONTACT_VALUES.filter((c) => c !== row.preferred_contact)
  return [row.preferred_contact, ...rest]
}

function contactValue(row: PostcardProfileRow, channel: PreferredContact): string | null {
  if (channel === 'phone') return row.phone
  if (channel === 'email') return row.email
  return row.website
}

export default function PostcardMockup({
  profile,
  permitLine,
  addressee,
}: {
  profile: PostcardProfileRow
  permitLine: string | null
  addressee: PostcardAddressee | null
}) {
  const channels = contactOrder(profile)
    .map((channel) => ({ channel, value: contactValue(profile, channel) }))
    .filter((entry): entry is { channel: PreferredContact; value: string } => !!entry.value)

  const lead = channels[0] ?? null
  const rest = channels.slice(1)

  return (
    <div className="space-y-6">
      <figure className="w-full max-w-[30rem] space-y-2">
        <div className={FACE}>
          <div className="flex h-full flex-col justify-between p-[5%]">
            <div>
              <div className="font-display text-lg font-semibold leading-tight tracking-tight sm:text-2xl">
                {profile.company_name}
              </div>
              {/* The one orange mark on the card. A rule and not a coloured
                  letter: the wordmark colours its own K and P, and a company
                  name we did not write has no letters we may claim. */}
              <div className="mt-2 h-[3px] w-12 bg-orange sm:w-16" />

              {profile.body_text && (
                <p className="mt-3 whitespace-pre-line text-[10px] leading-relaxed sm:mt-4 sm:text-xs">
                  {profile.body_text}
                </p>
              )}
            </div>

            <div>
              {/* Set apart from his text, and smaller than it: the sentence
                  above is the contractor speaking and this one is not. */}
              {permitLine && (
                <p className="border-t border-hairline/40 pt-2 text-[8px] leading-snug text-ink/70 sm:text-[10px]">
                  {permitLine}
                </p>
              )}
              {profile.license_number && (
                <p className="mt-2 text-[8px] text-ink/60 sm:text-[9px]">
                  CA License #{profile.license_number}
                </p>
              )}
            </div>
          </div>
        </div>
        <figcaption className="text-xs text-muted">Front</figcaption>
      </figure>

      <figure className="w-full max-w-[30rem] space-y-2">
        <div className={FACE}>
          <div className="flex h-full gap-[4%] p-[5%]">
            <div className="flex w-[42%] flex-col justify-between">
              <div>
                {lead && (
                  <div className="text-xs font-semibold leading-tight sm:text-sm">
                    {lead.value}
                  </div>
                )}
                {rest.map((entry) => (
                  <div
                    key={entry.channel}
                    className="mt-1 text-[9px] leading-tight text-ink/70 sm:text-[11px]"
                  >
                    {entry.value}
                  </div>
                ))}
              </div>

              {profile.qr_target && (
                <div className="mt-2 flex aspect-square w-[62%] items-center justify-center border border-hairline p-1">
                  <span className="break-all text-center font-mono text-[6px] leading-tight text-ink/60 sm:text-[8px]">
                    {profile.qr_target}
                  </span>
                </div>
              )}
            </div>

            <div className="flex w-[58%] flex-col">
              <div className="text-[8px] leading-tight text-ink/70 sm:text-[10px]">
                <div>{profile.company_name}</div>
                <div>{profile.return_line1}</div>
                {profile.return_line2 && <div>{profile.return_line2}</div>}
                <div>
                  {profile.return_city}, {profile.return_state} {profile.return_zip}
                </div>
              </div>

              <div className="mt-auto text-[10px] leading-tight sm:text-xs">
                {/* Where the addressee line goes. It is blank on purpose and the
                    screen carries the reason; see the note at the top of this
                    file. */}
                <div className="h-3 sm:h-4" />
                {addressee && (
                  <>
                    <div>{addressee.address}</div>
                    <div>
                      {addressee.zip
                        ? SURFACE_MAIL_CITY_LINE + ' ' + addressee.zip
                        : SURFACE_MAIL_CITY_LINE}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <figcaption className="text-xs text-muted">Back</figcaption>
      </figure>
    </div>
  )
}
