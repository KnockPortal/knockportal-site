#!/usr/bin/env node
/* Writes tools/fixtures/addr/ — a synthetic address layer shaped exactly like
   the contract the surface reads: latest.json, <stamp>/index.json, and one file
   per district under the stamp.
   =========================================================================
   Why a fixture at all. The real layer is published by another pipeline and is
   not in the bucket yet, so the client is written against the contract and
   proved against this. Nothing here is a measurement of San Francisco: the
   districts are three rectangles inside the city's box and the streets are a
   lattice, chosen so the list is big enough to cross STEP_SAMPLE_MAX and dense
   enough that a median step is a real number rather than an artefact.

   Deterministic by construction. The jitter comes from a seeded generator and
   never from Math.random, every coordinate is rounded before it is written, and
   the bounding boxes are computed off the rounded values — so a second run
   produces the same bytes and `git status` after it is empty.

   Every fifth point is published twice under one pair of coordinates: that is
   what a duplex looks like after the city geocodes it, and folding those onto
   one building is a thing the surface does and this has to exercise.

     node tools/addr-fixture-gen.mjs
   ========================================================================= */

import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, 'fixtures', 'addr')

const STAMP = 'addr-20260905-0000'
const GENERATED = '2026-09-05 00:00 UTC'

/* the same scale the surface measures with */
const M_PER_DEG = 111320

/* metres between two doors along a street, and between two streets */
const ALONG_M = 8
const ACROSS_M = 60
/* how far a point may wander off the lattice, in metres, either way */
const JITTER_M = 1.5
/* six decimals is about 11 cm — finer than the geocoder ever is */
const PLACES = 6

const ZIPS = ['94114', '94117', '94121']

/* mulberry32: three lines, one 32-bit state, and the same stream every run. */
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const round = (n) => Number(n.toFixed(PLACES))

/* Three rectangles inside the city's own box, far enough apart that a district
   is a district and not a continuation of the one beside it. `across` is the
   axis the streets are spaced along; `along` is the axis a street runs on. */
const DISTRICTS = [
  {
    nhood: 'Inner Sunset',
    file: 'inner-sunset.json',
    lat0: 37.7560,
    lon0: -122.4720,
    axis: 'ns', // streets run north–south, spaced east–west
    streets: [
      '4TH AVE', '5TH AVE', '6TH AVE', '7TH AVE', '8TH AVE',
      '9TH AVE', '10TH AVE', '11TH AVE', '12TH AVE', '13TH AVE',
    ],
    first: 1200,
  },
  {
    nhood: 'Cole Valley',
    file: 'cole-valley.json',
    lat0: 37.7640,
    lon0: -122.4520,
    axis: 'ew', // streets run east–west, spaced north–south
    streets: [
      'CLAYTON ST', 'BELVEDERE ST', 'COLE ST', 'SHRADER ST', 'STANYAN ST',
      'CARL ST', 'PARNASSUS AVE', 'FREDERICK ST', 'WALLER ST', 'BEULAH ST',
    ],
    first: 400,
  },
  {
    nhood: 'Noe Valley',
    file: 'noe-valley.json',
    lat0: 37.7480,
    lon0: -122.4330,
    axis: 'ew',
    streets: [
      'CASTRO ST', 'DIAMOND ST', 'DOUGLASS ST', 'HOFFMAN AVE', 'SANCHEZ ST',
      'NOE ST', 'CHURCH ST', 'DOLORES ST', 'GUERRERO ST', 'VALENCIA ST',
    ],
    first: 3800,
  },
]

/* doors per street. 10 streets x 150 doors x 3 districts is 4500 base points,
   and the duplexes carry the address count past that again. */
const PER_STREET = 150

function build(district, rand) {
  const dLatAlong = ALONG_M / M_PER_DEG
  const k = Math.cos(district.lat0 * Math.PI / 180)
  const dLonAlong = ALONG_M / (M_PER_DEG * k)
  const dLatAcross = ACROSS_M / M_PER_DEG
  const dLonAcross = ACROSS_M / (M_PER_DEG * k)

  const addresses = []
  district.streets.forEach((street, s) => {
    for (let i = 0; i < PER_STREET; i++) {
      /* the lattice, then a metre or two of wobble so the median step is a
         measurement and not the constant above read back */
      const jLat = (rand() * 2 - 1) * JITTER_M / M_PER_DEG
      const jLon = (rand() * 2 - 1) * JITTER_M / (M_PER_DEG * k)
      let lat, lon
      if (district.axis === 'ns') {
        lat = district.lat0 + i * dLatAlong + jLat
        lon = district.lon0 + s * dLonAcross + jLon
      } else {
        lat = district.lat0 + s * dLatAcross + jLat
        lon = district.lon0 + i * dLonAlong + jLon
      }
      lat = round(lat)
      lon = round(lon)
      /* house numbers climb by two down one side of the street, as they do */
      const n = district.first + i * 2
      const zip = ZIPS[Math.floor(rand() * ZIPS.length)]
      addresses.push({ a: n + ' ' + street, zip, lat, lon })
      /* every fifth door has a second one behind it, on the one roof */
      if (i % 5 === 4) addresses.push({ a: n + ' A ' + street, zip, lat, lon })
    }
  })
  return addresses
}

function bboxOf(addresses) {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity
  addresses.forEach((x) => {
    if (x.lon < w) w = x.lon
    if (x.lon > e) e = x.lon
    if (x.lat < s) s = x.lat
    if (x.lat > n) n = x.lat
  })
  return [w, s, e, n]
}

const write = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n')

/* One seed for the whole run, drawn on in district order, so the stream a
   district sees depends on the ones before it and on nothing else. */
const rand = rng(20260905)

const stampDir = join(OUT, STAMP)
/* the tree is rebuilt whole: a district renamed in this file must not leave its
   old file lying under the stamp, where the contract check would still read it */
if (existsSync(OUT)) rmSync(OUT, { recursive: true })
mkdirSync(stampDir, { recursive: true })

const files = []
let total = 0
DISTRICTS.forEach((d) => {
  const addresses = build(d, rand)
  total += addresses.length
  files.push({
    nhood: d.nhood,
    file: d.file,
    count: addresses.length,
    bbox: bboxOf(addresses),
  })
  write(join(stampDir, d.file), {
    meta: { stamp: STAMP, nhood: d.nhood, count: addresses.length },
    addresses,
  })
  console.log('  ' + d.file + ' — ' + addresses.length + ' addresses, ' + d.nhood)
})

write(join(stampDir, 'index.json'), {
  meta: { stamp: STAMP, generated: GENERATED, addresses_total: total, files: files.length },
  files,
})
write(join(OUT, 'latest.json'), { stamp: STAMP, generated: GENERATED })

console.log('addr fixture written to tools/fixtures/addr')
console.log('  stamp     ' + STAMP)
console.log('  files     ' + files.length + ' districts, ' + readdirSync(stampDir).length + ' files under the stamp')
console.log('  addresses ' + total)
