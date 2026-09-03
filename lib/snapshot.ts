import { DATA_BASE } from '@/lib/surface'

// Server-side reads of the published snapshot. The bucket is public and takes
// no authorisation: what is read here is the same static JSON the surface page
// reads in the browser, and it is read on the server because the postcard is
// rendered on the server.
//
// The loader below is the one in app/api/export/route.ts, written again rather
// than imported: that file is a route handler and exports POST, so importing it
// would drag a route into a page's module graph to get at a fetch helper.

// The snapshot is public static JSON on a CDN. Ten seconds is far past a normal
// answer and short enough that a hung fetch does not hold the render open.
const SNAPSHOT_TIMEOUT_MS = 10000

export type Loaded<T> =
  | { state: 'ok'; json: T }
  | { state: 'gone' }
  | { state: 'error'; detail: string }

/**
 * One file of the snapshot. 404 is told apart from every other failure the way
 * the export route tells them apart: a folder that is gone means the data was
 * republished while the page was being read, and anything else is ours.
 */
export async function loadSnapshotJson<T>(url: string): Promise<Loaded<T>> {
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

/** latest.json: which folder of the bucket is current. */
type LatestFile = { stamp?: unknown; generated?: unknown }

/** Only the two fields of clusters.json the card is counted against. */
type ClustersFile = { meta?: { window_days?: unknown; generated?: unknown } }

/** One row of permits.json, as far as anything here looks at it. */
export type SnapshotPermit = {
  a: string
  d: string
  lat: number
  lon: number
  cluster: number | string | null
  record: string
  url: string
}

type PermitsFile = { permits?: unknown }

/**
 * The counting context of the current snapshot: which folder it is, how wide
 * its window is, when it was pulled, and every permit in it.
 */
export type SnapshotContext = {
  stamp: string
  windowDays: number
  generated: string
  permits: SnapshotPermit[]
}

/**
 * Reads the three files the postcard is counted from, or answers null.
 *
 * Null is one answer for every way this can go wrong — a refusal, a timeout, a
 * republished folder, a file whose shape is not the one documented — because
 * the caller does one thing about all of them: it prints the card without the
 * counted line and says on screen that the snapshot could not be read. A window
 * that is not a number is a failure of the same kind and not a smaller one: it
 * is the denominator of the sentence, and a sentence built on a value we cannot
 * read is not a fact.
 *
 * The detail goes to the log and no further: it names our bucket and our
 * failure, and neither is the reader's to act on.
 */
export async function readSnapshotContext(): Promise<SnapshotContext | null> {
  const latest = await loadSnapshotJson<LatestFile>(DATA_BASE + 'latest.json')
  if (latest.state !== 'ok') {
    console.error('[snapshot] latest.json unreadable:', describeLoad(latest))
    return null
  }

  const stamp = latest.json?.stamp
  if (typeof stamp !== 'string' || stamp === '') {
    console.error('[snapshot] latest.json carries no stamp')
    return null
  }

  const base = DATA_BASE + stamp + '/'
  const [clustersLoad, permitsLoad] = await Promise.all([
    loadSnapshotJson<ClustersFile>(base + 'clusters.json'),
    loadSnapshotJson<PermitsFile>(base + 'permits.json'),
  ])

  if (clustersLoad.state !== 'ok') {
    console.error('[snapshot] clusters.json unreadable:', describeLoad(clustersLoad))
    return null
  }
  if (permitsLoad.state !== 'ok') {
    console.error('[snapshot] permits.json unreadable:', describeLoad(permitsLoad))
    return null
  }

  const meta = clustersLoad.json?.meta
  const windowDays = meta?.window_days
  if (typeof windowDays !== 'number' || !Number.isFinite(windowDays)) {
    console.error('[snapshot] clusters.json meta.window_days is not a number')
    return null
  }

  const generated = meta?.generated
  if (typeof generated !== 'string' || generated === '') {
    console.error('[snapshot] clusters.json meta.generated is missing')
    return null
  }

  const rawPermits = permitsLoad.json?.permits
  if (!Array.isArray(rawPermits)) {
    console.error('[snapshot] permits.json carries no permits array')
    return null
  }

  return {
    stamp,
    windowDays,
    generated,
    permits: rawPermits as SnapshotPermit[],
  }
}

function describeLoad(load: Loaded<unknown>): string {
  return load.state === 'gone' ? 'HTTP 404' : (load as { detail: string }).detail
}
