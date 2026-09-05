#!/usr/bin/env node
/* Reads a tree of address-layer files and holds it against the contract the
   surface was written to. Nothing here knows about the fixture in particular —
   point it at a directory and it says whether page.js could read it.
   =========================================================================
   The client treats a file it cannot understand as a district that is not
   there, quietly and by design, so a layer that is subtly wrong would show up
   on the surface as a layer that is simply short. This is where wrong is loud.

     node tools/addr-contract-check.mjs tools/fixtures/addr
   ========================================================================= */

import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const STAMP_RE = /^addr-\d{8}-\d{4}$/
const GENERATED_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC$/
const FILE_RE = /^[a-z0-9-]+\.json$/
const ZIP_RE = /^\d{5}$/

const dir = process.argv[2]
if (!dir) {
  console.error('usage: node tools/addr-contract-check.mjs <dir>')
  process.exit(1)
}
const root = resolve(dir)

/* Declared up here because finish() reads all three and is reachable from the
   first line of the run: an early exit still prints what it managed to learn. */
let latest = null
let index = null
let addressesSeen = 0

const problems = []
const fail = (what) => problems.push(what)
const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
const isStr = (v) => typeof v === 'string'

function read(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    fail(path + ' — could not be read as JSON: ' + e.message)
    return null
  }
}

/* ------------------------------------------------------------- latest.json */
latest = read(join(root, 'latest.json'))
if (!latest) finish()
if (!isStr(latest.stamp) || !STAMP_RE.test(latest.stamp))
  fail('latest.json — stamp ' + JSON.stringify(latest.stamp) + ' does not match ' + STAMP_RE)
if (!isStr(latest.generated) || !GENERATED_RE.test(latest.generated))
  fail('latest.json — generated ' + JSON.stringify(latest.generated) + ' is not "YYYY-MM-DD HH:MM UTC"')
if (problems.length) finish()

const stamp = latest.stamp
const stampDir = join(root, stamp)

/* -------------------------------------------------------------- index.json */
index = read(join(stampDir, 'index.json'))
if (!index) finish()
const meta = index.meta || {}
if (meta.stamp !== stamp) fail('index.json — meta.stamp is ' + JSON.stringify(meta.stamp) + ', not ' + stamp)
if (!isStr(meta.generated) || !GENERATED_RE.test(meta.generated))
  fail('index.json — meta.generated is not "YYYY-MM-DD HH:MM UTC"')
if (!Array.isArray(index.files)) {
  fail('index.json — files is not an array')
  finish()
}
if (meta.files !== index.files.length)
  fail('index.json — meta.files says ' + meta.files + ', files holds ' + index.files.length)

/* ---------------------------------------------------------- district files */
index.files.forEach((entry, i) => {
  const at = 'index.json files[' + i + ']'
  if (!isStr(entry.nhood) || !entry.nhood) fail(at + ' — nhood is not a non-empty string')
  if (!isStr(entry.file) || !FILE_RE.test(entry.file)) {
    fail(at + ' — file ' + JSON.stringify(entry.file) + ' is not <slug>.json')
    return
  }
  if (!isNum(entry.count)) fail(at + ' — count is not a number')
  const bbox = entry.bbox
  if (!Array.isArray(bbox) || bbox.length !== 4 || !bbox.every(isNum)) {
    fail(at + ' — bbox is not four numbers')
    return
  }
  if (bbox[0] > bbox[2] || bbox[1] > bbox[3])
    fail(at + ' — bbox is not [west, south, east, north]')

  const body = read(join(stampDir, entry.file))
  if (!body) return
  const bm = body.meta || {}
  if (bm.stamp !== stamp) fail(entry.file + ' — meta.stamp is ' + JSON.stringify(bm.stamp) + ', not ' + stamp)
  if (bm.nhood !== entry.nhood)
    fail(entry.file + ' — meta.nhood is ' + JSON.stringify(bm.nhood) + ', the index says ' + JSON.stringify(entry.nhood))
  if (!Array.isArray(body.addresses)) {
    fail(entry.file + ' — addresses is not an array')
    return
  }
  const n = body.addresses.length
  addressesSeen += n
  if (bm.count !== n) fail(entry.file + ' — meta.count says ' + bm.count + ', addresses holds ' + n)
  if (entry.count !== n) fail(entry.file + ' — the index says ' + entry.count + ', addresses holds ' + n)

  /* One line per broken address would bury the run, so each kind of breakage
     is counted and the first of it is named. */
  const kinds = new Map()
  const note = (kind, at2) => {
    const held = kinds.get(kind)
    if (held) held.n++
    else kinds.set(kind, { n: 1, first: at2 })
  }
  body.addresses.forEach((x, j) => {
    const where = entry.file + ' addresses[' + j + ']'
    if (!isStr(x.a) || !x.a) note('a is not a non-empty string', where)
    if (!isStr(x.zip) || (x.zip !== '' && !ZIP_RE.test(x.zip))) note('zip is not five digits or empty', where)
    if (!isNum(x.lat) || !isNum(x.lon)) note('lat/lon are not numbers', where)
    else if (x.lon < bbox[0] || x.lon > bbox[2] || x.lat < bbox[1] || x.lat > bbox[3])
      note('point falls outside the file bbox', where)
  })
  kinds.forEach((v, kind) => fail(entry.file + ' — ' + v.n + ' addresses: ' + kind + ' (first at ' + v.first + ')'))
})

if (meta.addresses_total !== addressesSeen)
  fail('index.json — meta.addresses_total says ' + meta.addresses_total + ', the files hold ' + addressesSeen)

finish()

function finish() {
  console.log('addr contract check — ' + root)
  console.log('  stamp     ' + (latest && latest.stamp))
  console.log('  files     ' + ((index && index.files && index.files.length) || 0))
  console.log('  addresses ' + addressesSeen)
  if (problems.length) {
    console.log('  FAILED, ' + problems.length + ' problem(s):')
    problems.forEach((p) => console.log('    ' + p))
    process.exit(1)
  }
  console.log('  ok — every field, count and bbox holds')
  process.exit(0)
}
