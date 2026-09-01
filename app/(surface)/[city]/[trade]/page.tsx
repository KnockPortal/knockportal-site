import { notFound } from 'next/navigation'
import type { Metadata, Viewport } from 'next'
import {
  DATA_BASE,
  MAPBOX_TOKEN,
  SURFACE_BUILD,
  SURFACE_CITY,
  SURFACE_TRADE,
  resolveSurfaceVariant,
} from '@/lib/surface'

type Params = { city: string; trade: string }
type Search = { [key: string]: string | string[] | undefined }

/** viewport-fit=cover carries the phone layout; it cannot be dropped. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

function isFilled(params: Params) {
  return params.city === SURFACE_CITY && params.trade === SURFACE_TRADE
}

export function generateMetadata({
  params,
  searchParams,
}: {
  params: Params
  searchParams: Search
}): Metadata {
  if (!isFilled(params)) return {}
  const variant = resolveSurfaceVariant(searchParams.from)
  if (!variant.personal) {
    return { title: 'Roofing permits in San Francisco' }
  }
  // A personal demo asks robots to stay away; the public surface is the one
  // indexable address.
  return {
    title: `${variant.company} — roofing permits in San Francisco`,
    robots: 'noindex,nofollow',
  }
}

/** Values page.js reads off the global scope, as JavaScript source. */
function configScript(company: string, slug: string) {
  const js = (value: string) => JSON.stringify(value).replace(/</g, '\\u003C')
  return `
/* Per-page config, written by the route. COMPANY is empty on the public surface
   and that emptiness is what page.js reads to tell it from a demo.
   DATA_BASE holds no snapshot: the page asks latest.json which one is current,
   so a fresh publish reaches every page already in the field without a rebuild.
   CITY and TRADE are the combination this page was rendered for; page.js sends
   them back with a saved selection rather than keeping a copy of its own. */
const MAPBOX_TOKEN = ${js(MAPBOX_TOKEN)};
const COMPANY      = ${js(company)};
const SLUG         = ${js(slug)};
const DATA_BASE    = ${js(DATA_BASE)};
const CITY         = ${js(SURFACE_CITY)};
const TRADE        = ${js(SURFACE_TRADE)};
`
}

export default function SurfacePage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: Search
}) {
  // One combination is filled. Everything else — including the two-segment
  // addresses that are not combinations at all — is a 404.
  if (!isFilled(params)) notFound()

  const { company, slug, personal } = resolveSurfaceVariant(searchParams.from)

  return (
    <>
      <div className="shell">
        <div className="screen">

          <header className="top">
            <div className="topline">
              <div className="built">{personal ? 'Built for' : null}</div>
              <div className="wordmark" aria-label="KnockPortal">
                <span>Knock</span>
                <span className="wm-o">Portal</span>
              </div>
            </div>
            <h1>
              {personal ? (
                <em>{company}</em>
              ) : (
                <>
                  Roofing permits in <em>San Francisco</em>
                </>
              )}
            </h1>
            <div className="dateline" id="dateline"></div>
            {/* every word of both ledes is written by page.js from the data it drew */}
            <p className="lede" id="lede-city"></p>
            <p className="lede" id="lede-cluster"></p>
            <p className="notice" id="notice" hidden></p>
          </header>

          <div className="controls">
            <button className="back" id="back" type="button">
              ← All of San Francisco
            </button>
            <label className="field">
              <span className="field-label">Group</span>
              <select id="pick" aria-label="Neighbourhood and group"></select>
            </label>
            <div
              className="tabs"
              role="tablist"
              aria-label="How you want to work the group"
            >
              <button className="tab" id="tab-walk" role="tab" aria-selected="false">
                <span className="tab-t">Walk the block</span>
                <span className="tab-s">print the list, knock in order</span>
              </button>
              <button className="tab" id="tab-mail" role="tab" aria-selected="true">
                <span className="tab-t">Postcards</span>
                <span className="tab-s">pick roofs off the satellite</span>
              </button>
            </div>
          </div>

          <div className="stage">
            <div className="maparea">
              <div id="map"></div>
              {/* The box is the anchor in the corner; the button sits under the list so
                  the list grows upward off it. On a phone the list starts folded away —
                  five rows of key cover half a 46vh map. Desktop never sees the button. */}
              <div className="legendbox">
                <div className="legend" id="legend-city">
                  <span><i className="lg-permit"></i>roofing permit with neighbouring permits around it</span>
                  <span><i className="lg-solo"></i>single permit, nothing around it to work with</span>
                  <span><i className="lg-box"></i>a group — click it to open the block</span>
                </div>
                <div className="legend" id="legend-cluster">
                  <span><i className="lg-permit"></i>roofing permit issued <span className="win"></span></span>
                  <span><i className="lg-open"></i>no qualifying roofing permit in <span className="yrs"></span> years of public records</span>
                  <span><i className="lg-sel"></i>picked for this mailing</span>
                  <span><i className="lg-x lg-recent"></i>reroofed since <span className="rsince"></span></span>
                  <span><i className="lg-x lg-done"></i>reroofed earlier, within <span className="yrs"></span> years</span>
                </div>
                <button
                  className="legend-toggle"
                  id="legend-toggle"
                  type="button"
                  aria-expanded="false"
                >
                  <i className="lg-permit" aria-hidden="true"></i>Key
                </button>
              </div>
              {/* Under the zoom where a house dot would be wider than the gap to the
                  next house, page.js drops the neighbour layers and unhides this. It is
                  a plate over a live map, not a replacement for one, and it never takes
                  a tap: a drag that starts on it belongs to the map underneath. */}
              <p className="zoomnote" id="zoomnote" hidden></p>
            </div>

            <aside id="panel">
              <div className="pane" id="pane"></div>
              <div className="foot">
                <div className="count" id="count"></div>
                <button className="ghost" id="clear" hidden>
                  Clear
                </button>
                {/* Saving needs a session and this page has none of its own: a
                    save answered with 401 parks the pick and hands the browser
                    to /app, which finishes it after the sign-in. */}
                <button className="ghost" id="save" hidden>
                  Save selection
                </button>
                {/* The mailing lives above the group: this button hands the
                    picks of one group to it, and the group is then left for
                    the next one. */}
                <button className="ghost" id="tomail" hidden>
                  Add to mailing
                </button>
                <button className="go" id="dl">
                  Download
                </button>
                {/* The whole word about the save, in front of the man who
                    pressed it — the header is off screen by then. */}
                <p className="savenote" id="savenote" hidden></p>
              </div>
            </aside>
          </div>

          {/* Outside the panel on purpose. The panel is taken out of the layout
              on the city screen, and the mailing has to be readable there too:
              it is collected group by group, and the city screen is where he
              goes to find the next one. */}
          <div className="strip" id="strip">
            <div className="strip-sum" id="strip-sum"></div>
            <p className="strip-note">Collecting is free. Sending needs a subscription.</p>
            <button className="ghost" id="mail-clear" hidden>
              Clear the mailing
            </button>
            <button className="go" id="mail-send" disabled>
              Send
            </button>
            <p className="strip-say" id="strip-say" hidden></p>
          </div>
        </div>
        {/* /.screen */}

        <footer className="endnote">
          <p className="note">
            A blue house is one with no qualifying roofing permit found in <span className="yrs"></span> years of available
            public records — nothing in the city’s permit history for that address. Roofs do get
            replaced without a permit, before the digital record starts, or filed under another category
            — so treat this as a strong lead, not a promise. Every permit here links to its own record
            on the city’s portal; check any line you like.
          </p>
          {/* No email carried the public address, so the line that answers one
              belongs to the personal variant alone. */}
          {personal ? (
            <p className="atcost">
              Postcards are printed and mailed for you.
              Reply to the email this page came with and we’ll set it up.
            </p>
          ) : null}
          <p className="provenance" id="provenance"></p>
          <p className="staleness" id="staleness" hidden></p>
        </footer>
      </div>

      {/* Load order, bottom up: the markup above is already in the document,
          page.css is applied from the head, mapbox-gl.js defines mapboxgl, the
          inline block declares the six constants — and only then page.js runs.
          page.js has no readiness check of its own: it expects a finished DOM,
          which is exactly what a plain blocking script at the end of the body
          gets. Nothing here may be deferred, bundled or moved. */}
      <script src="https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.js"></script>
      <script dangerouslySetInnerHTML={{ __html: configScript(company, slug) }} />
      <script src={`/assets/surface/page.js?v=${SURFACE_BUILD}`}></script>
    </>
  )
}
