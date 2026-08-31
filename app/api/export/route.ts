import { NextResponse } from 'next/server'
import { supabaseSession } from '@/lib/supabase-session'
import { DATA_BASE, SURFACE_CITY, SURFACE_TRADE } from '@/lib/surface'

export const runtime = 'nodejs'

// Same bounds as app/api/selections/route.ts: a selection cannot hold more
// houses than the clusters contain, so anything past this is a malformed body
// rather than a large honest selection.
const MAX_ADDRESSES = 2000
const MAX_ADDRESS_LENGTH = 200
const MAX_STAMP_LENGTH = 64

// The stamp is pasted into a storage URL, so it is checked as a path segment
// and not merely as a string: "../" in it would address another folder of the
// bucket. Same alphabet the publisher writes, nothing else.
const STAMP_RE = /^[0-9A-Za-z._-]+$/

// The snapshot is public static JSON on a CDN. Ten seconds is far past a normal
// answer and short enough that a hung fetch does not hold the request open.
const SNAPSHOT_TIMEOUT_MS = 10000

// The last cell of every file, both modes. A found-nothing row is a lead and
// not a verdict, and the file says so where the file is read.
const DISCLAIMER =
  'No permit found does not mean that roofing work was never performed. ' +
  'Results reflect the available public permit history.'

type Neighbour = { a: string; zip: string; nhood?: string }
type Permit = { a: string; d: string; record: string; url: string }
type ClusterPayload = {
  nhood?: string
  neighbours: Neighbour[]
  permits: Permit[]
}
type IndexRow = { cluster: number | string; nhood?: string }
type SnapshotIndex = {
  meta: { suppress_years: number }
  clusters: IndexRow[]
}

type Cell = string | number | null | undefined

function invalid(field: string) {
  return NextResponse.json({ error: 'invalid_request', field }, { status: 400 })
}

/**
 * The bucket failed us, not him. The detail names our storage and our failure,
 * so it goes to the log and no further.
 */
function unavailable(detail: string) {
  console.error('[export] snapshot read failed:', detail)
  return NextResponse.json({ error: 'snapshot_unavailable' }, { status: 502 })
}

/* ------------------------------------------------------------ the snapshot */

type Loaded<T> =
  | { state: 'ok'; json: T }
  | { state: 'gone' }
  | { state: 'error'; detail: string }

/**
 * One file of the snapshot. 404 is told apart from every other failure because
 * the two mean different things to the man at the other end: a folder that is
 * gone means the data was republished while his page was open and he has to
 * pick again, while anything else is ours to fix and nothing of his to redo.
 */
async function loadJson<T>(url: string): Promise<Loaded<T>> {
  let response: Response
  try {
    response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(SNAPSHOT_TIMEOUT_MS),
    })
  } catch (e) {
    return { state: 'error', detail: String((e as Error)?.message || e) }
  }
  if (response.status === 404) return { state: 'gone' }
  if (!response.ok) return { state: 'error', detail: 'HTTP ' + response.status }
  try {
    return { state: 'ok', json: (await response.json()) as T }
  } catch (e) {
    return { state: 'error', detail: String((e as Error)?.message || e) }
  }
}

/* --------------------------------------------------------- the walk order */
/* Ported from public/assets/surface/page.js, behaviour for behaviour: the file
   the server builds has to come out in the order he read on the screen, and the
   screen is still drawn by that copy. Both are edited together or neither is.

   localeCompare stays without an explicit locale. Node and the browser agree on
   these strings, and naming a locale would reorder files that already exist. */

/* "95 CASELLI AVE" -> CASELLI AVE. SF writes unit letters loose from the number
   ("1421 A CLAYTON ST" is 1421A Clayton), so a lone letter after the number is
   a unit, not the start of a street name. */
function street(a: string): string {
  return String(a)
    .replace(/^\d+[A-Za-z]?\s+(?:[A-Za-z]\s+(?=\S+\s))?/, '')
    .toUpperCase()
}

function num(a: string): number {
  return parseInt(a, 10) || 0
}

function groupStreets(list: Neighbour[], permits: Permit[]) {
  const hot = new Set(permits.map((p) => street(p.a)))
  const by: Record<string, Neighbour[]> = {}
  list.forEach((n) => (by[street(n.a)] ||= []).push(n))
  const key = (s: string): [number, number, string] => [
    hot.has(s) ? 0 : 1,
    -by[s].length,
    s,
  ]
  const order = Object.keys(by).sort((a, b) => {
    const ka = key(a),
      kb = key(b)
    return ka[0] - kb[0] || ka[1] - kb[1] || String(ka[2]).localeCompare(kb[2])
  })
  order.forEach((s) => by[s].sort((a, b) => num(a.a) - num(b.a)))
  return { by, order, hot }
}

/* ------------------------------------------------------------- the file */

/**
 * Every field quoted, inner quotes doubled, CRLF between rows, no trailing
 * newline — byte for byte what the browser used to write, because a file that
 * differs from the one already in his folder is a new file to him.
 */
function toCsv(rows: Cell[][]): string {
  return rows
    .map((r) =>
      r
        .map((v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"')
        .join(','),
    )
    .join('\r\n')
}

/**
 * Builds the export.
 *
 * The gate is the session and nothing more, which is exactly the state of order
 * item 11b: there is no entitlement object yet (item 12) and no checkout that
 * could create one (item 14). The subscription check goes in beside this one,
 * ahead of the snapshot read, when they exist.
 *
 * What the body may say is deliberately small: which snapshot, which group,
 * which mode, and — for postcards — which addresses he picked. Every other cell
 * of the file is read out of the snapshot here. A finished CSV is not accepted
 * in any form, and neither is a zip, a neighbourhood or a permit line: the file
 * this route signs its name to is the file the data says, not the one the
 * caller typed.
 */
export async function POST(request: Request) {
  const supabase = supabaseSession()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return invalid('body')
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return invalid('body')
  const input = body as Record<string, unknown>

  // The one filled combination. Anything else has no snapshot to read.
  if (input.city !== SURFACE_CITY) return invalid('city')
  if (input.trade !== SURFACE_TRADE) return invalid('trade')

  const stamp = input.snapshot_stamp
  if (
    typeof stamp !== 'string' ||
    stamp === '' ||
    stamp.length > MAX_STAMP_LENGTH ||
    !STAMP_RE.test(stamp)
  ) {
    return invalid('snapshot_stamp')
  }

  // Cluster ids are written as numbers in the index and travel as either; the
  // digits are what matters, and they are checked because this too becomes a
  // path segment.
  const rawCluster = input.cluster
  if (typeof rawCluster !== 'number' && typeof rawCluster !== 'string') {
    return invalid('cluster')
  }
  const cluster = String(rawCluster)
  if (!/^[0-9]+$/.test(cluster)) return invalid('cluster')

  const mode = input.mode
  if (mode !== 'walk' && mode !== 'mail') return invalid('mode')

  // Walk takes the whole block, so it carries no address list and none is read.
  let addresses: string[] = []
  if (mode === 'mail') {
    const raw = input.addresses
    if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_ADDRESSES) {
      return invalid('addresses')
    }
    for (const entry of raw) {
      if (
        typeof entry !== 'string' ||
        entry === '' ||
        entry.length > MAX_ADDRESS_LENGTH
      ) {
        return invalid('addresses')
      }
    }
    addresses = raw as string[]
  }

  const base = DATA_BASE + stamp + '/'
  const [indexLoad, payloadLoad] = await Promise.all([
    loadJson<SnapshotIndex>(base + 'clusters.json'),
    loadJson<ClusterPayload>(base + 'cluster_' + cluster + '.json'),
  ])

  // A stamp is immutable while it exists, so a 404 on either file is the
  // publisher having moved on — the page in his hands is reading a folder that
  // is no longer there.
  if (indexLoad.state === 'gone' || payloadLoad.state === 'gone') {
    return NextResponse.json({ error: 'snapshot_gone' }, { status: 409 })
  }
  if (indexLoad.state === 'error') return unavailable(indexLoad.detail)
  if (payloadLoad.state === 'error') return unavailable(payloadLoad.detail)

  const index = indexLoad.json
  const payload = payloadLoad.json
  const row = index.clusters.find((c) => String(c.cluster) === cluster) || null
  const years = index.meta.suppress_years
  // The cluster payload names its own neighbourhood when it has one; the index
  // row is the fallback, same order the page uses.
  const nhood = payload.nhood || (row && row.nhood) || null

  const rows: Cell[][] = []
  let name: string

  const nice =
    (nhood || SURFACE_CITY).replace(/[^A-Za-z]/g, '').slice(0, 14) || SURFACE_CITY

  if (mode === 'walk') {
    const g = groupStreets(payload.neighbours, payload.permits)
    rows.push(['address', 'zip', 'neighbourhood', 'street has a fresh permit', 'note'])
    g.order.forEach((s) =>
      g.by[s].forEach((n) =>
        rows.push([
          n.a,
          n.zip,
          n.nhood,
          g.hot.has(s) ? 'yes' : 'no',
          'no qualifying roofing permit found in ' +
            years +
            ' years of available public records',
        ]),
      ),
    )
    rows.push([])
    rows.push(['--- permits issued in this window ---'])
    rows.push(['address', 'issued', 'record', 'city record'])
    payload.permits.forEach((p) => rows.push([p.a, p.d, p.record, p.url]))
    name = SURFACE_CITY + '__walk__' + nice + '.csv'
  } else {
    // His order, not the request's: the rows go in the order of the neighbour
    // list he read on the screen, whatever order the picks arrived in.
    const want = new Set(addresses)
    const chosen = payload.neighbours.filter((n) => want.has(n.a))
    const found = new Set(chosen.map((n) => n.a))
    let missing = 0
    want.forEach((a) => {
      if (!found.has(a)) missing += 1
    })
    // An address the snapshot does not have is not quietly dropped. A file one
    // line short of what he picked is worse than no file: he would never know
    // which door went missing.
    if (missing > 0) {
      return NextResponse.json(
        { error: 'selection_stale', missing },
        { status: 409 },
      )
    }
    rows.push(['address', 'zip', 'neighbourhood'])
    chosen.forEach((n) => rows.push([n.a, n.zip, n.nhood]))
    name = SURFACE_CITY + '__postcards__' + nice + '.csv'
  }

  rows.push([])
  rows.push([DISCLAIMER])

  return new NextResponse(toCsv(rows), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="' + name + '"',
      'Cache-Control': 'no-store',
    },
  })
}
