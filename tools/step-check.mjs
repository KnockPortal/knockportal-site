#!/usr/bin/env node
/* Holds the step measurement in page.js against a full O(n²) sweep of the same
   points. O-020: the median used to be read off a sample on BOTH sides — the
   points asked and the points asked about — which can only ever report a step
   wider than the real one. The shape required instead is a sample of the
   QUESTIONS and the whole list as the answer, and this is where "the whole
   list" and "exactly" are proved rather than asserted.
   =========================================================================
   The block between the two markers in page.js is cut out and run here through
   new Function, with metres() and the four constants handed in as arguments —
   metres() as three lines of this file's own, so the block cannot quietly come
   to depend on anything else in page.js and still pass. The constants are read
   out of page.js by name: a copy of a number here would be a second place to
   change it, which is the thing being avoided.

     node tools/step-check.mjs
   ========================================================================= */

import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const PAGE_JS = join(ROOT, 'public', 'assets', 'surface', 'page.js')
const FIXTURE = join(HERE, 'fixtures', 'addr')

const BEGIN = '/* step: begin */'
const END = '/* step: end */'
/* how far the sampled median may sit from the full one, as a share */
const TOLERANCE = 0.05

let failed = false
function say(ok, line) {
  if (!ok) failed = true
  console.log('  ' + (ok ? 'ok   ' : 'FAIL ') + line)
}

/* --------------------------------------------------------- cut out the block */
const source = readFileSync(PAGE_JS, 'utf8')
const countOf = (marker) => source.split(marker).length - 1
if (countOf(BEGIN) !== 1 || countOf(END) !== 1) {
  console.error('step-check: page.js must hold exactly one ' + BEGIN + ' and one ' + END
              + ' — found ' + countOf(BEGIN) + ' and ' + countOf(END))
  process.exit(1)
}
const from = source.indexOf(BEGIN) + BEGIN.length
const to = source.indexOf(END)
if (to < from) {
  console.error('step-check: ' + END + ' stands before ' + BEGIN + ' in page.js')
  process.exit(1)
}
const block = source.slice(from, to)

const NAMES = ['M_PER_DEG', 'STEP_SAMPLE_MAX', 'STEP_CELL_M', 'STEP_MAX_RING']
const values = NAMES.map((name) => {
  const m = new RegExp('^const ' + name + ' = (-?[0-9.]+);', 'm').exec(source)
  if (!m) {
    console.error('step-check: page.js holds no line `const ' + name + ' = <number>;`')
    process.exit(1)
  }
  return Number(m[1])
})
const [M_PER_DEG, STEP_SAMPLE_MAX] = values

/* This file's own copy of the one function the block is allowed to reach for.
   Same three lines as page.js, written out rather than imported: if the block
   ever starts leaning on something else over there, it fails here. */
function metres(a, b) {
  const k = Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180)
  const dx = (a.lon - b.lon) * k, dy = a.lat - b.lat
  return Math.sqrt(dx * dx + dy * dy) * M_PER_DEG
}

const medianStep = new Function('metres', ...NAMES, block + '\nreturn medianStep;')(
  metres, ...values,
)

/* ------------------------------------------------------------- the points */
/* The fixture publishes a duplex as two addresses on one pair of coordinates.
   page.js folds those into one building before it measures anything, and
   groupBuildings() is not part of the block under test — so the duplicates are
   dropped here instead, and what goes in is one point per roof. */
const stampDir = readdirSync(FIXTURE, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort()[0]
if (!stampDir) {
  console.error('step-check: no stamp directory under ' + FIXTURE
              + ' — run node tools/addr-fixture-gen.mjs first')
  process.exit(1)
}
const index = JSON.parse(readFileSync(join(FIXTURE, stampDir, 'index.json'), 'utf8'))
const seen = new Set()
const points = []
let addressesRead = 0
index.files.forEach((f) => {
  const body = JSON.parse(readFileSync(join(FIXTURE, stampDir, f.file), 'utf8'))
  addressesRead += body.addresses.length
  body.addresses.forEach((x) => {
    const key = x.lon + ',' + x.lat
    if (seen.has(key)) return
    seen.add(key)
    points.push({ lon: x.lon, lat: x.lat })
  })
})

/* the answer the block is held against: every point against every other one */
function brute(list) {
  const ds = []
  for (let i = 0; i < list.length; i++) {
    let best = Infinity
    for (let j = 0; j < list.length; j++) {
      if (i === j) continue
      const d = metres(list[i], list[j])
      if (d < best) best = d
    }
    if (Number.isFinite(best)) ds.push(best)
  }
  if (!ds.length) return 0
  ds.sort((a, b) => a - b)
  const m = ds.length >> 1
  return ds.length % 2 ? ds[m] : (ds[m - 1] + ds[m]) / 2
}

console.log('step-check — ' + PAGE_JS)
console.log('  block     ' + block.split('\n').length + ' lines between the markers')
console.log('  constants ' + NAMES.map((n, i) => n + '=' + values[i]).join(', '))
console.log('  points    ' + points.length + ' distinct coordinates out of '
          + addressesRead + ' addresses in the fixture')

/* --------------------------------------------------- 1. exact under the cap */
const small = points.slice(0, 1500)
const smallBrute = brute(small)
const smallGrid = medianStep(small)
console.log('  under the cap (' + small.length + ' points, no sampling):')
console.log('    full sweep ' + smallBrute)
console.log('    page.js    ' + smallGrid)
say(smallGrid === smallBrute,
  'equal — the grid is exact, not an approximation')

/* --------------------------------------------- 2. sampled questions, whole list */
const fullBrute = brute(points)
console.log('  over the cap (' + points.length + ' points, ' + STEP_SAMPLE_MAX + ' questions):')
console.log('    full sweep ' + fullBrute)
const runs = [medianStep(points), medianStep(points), medianStep(points)]
runs.forEach((v, i) => {
  const off = Math.abs(v - fullBrute) / fullBrute
  console.log('    run ' + (i + 1) + '      ' + v + '  (' + (off * 100).toFixed(3) + '% off)')
  say(off <= TOLERANCE, 'run ' + (i + 1) + ' within ' + (TOLERANCE * 100) + '% of the full sweep')
})

/* ------------------------------------------------------- 3. the lone point */
/* 2 km from anything, which is four times STEP_MAX_RING cells: the walk gives
   up, the point has no step, and it is left out rather than counted at 2 km. */
const far = { lon: small[0].lon, lat: small[0].lat + 2000 / M_PER_DEG }
const withFar = medianStep(small.concat([far]))
console.log('  with one point 2 km out:')
console.log('    page.js    ' + withFar)
say(withFar === smallGrid,
  'unchanged — a point with no neighbour inside the ring limit is dropped')

console.log(failed ? '  FAILED' : '  ok — the step is measured against the whole list, exactly')
process.exit(failed ? 1 : 0)
