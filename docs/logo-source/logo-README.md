# KnockPortal logo package — v1.5

Synced to **Brand Guidelines v1.0** (single source of truth). Every asset here matches the
geometry, color and typography defined in the guidelines document — no drift.

Concept: **portal (door) + two orange knocks at hand height** — the signal arrives, you're first
at the door. From storm to signed roof · Know before you knock.

## Colors (fixed)
| Role | Name | HEX |
|---|---|---|
| Primary dark | Storm slate | `#1B2733` |
| Accent | Hi-vis orange | `#FF6B1A` |
| Light / reverse | Hail white | `#F2F5F7` |
| Muted secondary | Slate muted | `#8A99A8` |

Orange is accent only (~10% of any composition): the two knocks, the capital K, the capital P,
and key CTAs. Orange on white is ~2.3:1 — fine for the two accent capitals, never a full word or
body text. Favicon/app-icon use the **mark only** (no letters), so small-size legibility never
depends on orange caps.

## Wordmark
**KnockPortal** — camelCase, capitals `K`/`P` orange, `nock`/`ortal` storm slate on light and
hail white (100% opacity) on dark. Font: **Barlow Condensed SemiBold (600)**, SIL OFL 1.1.
Lockup is set at font-size 52 with the letters on the same ground line as the door (baseline 57
in the 64-unit grid). Font + license in `/font`.

## Geometry (viewBox 0 0 64 64)
- Door: `M28 57V15q0-6 6-6h14q6 0 6 6v42` · stroke 6
- Knocks (mark): `M9 22h15` + `M14 30h10` — **hand height, upper third** (guidelines Rule 4), stroke 6, round caps
- Favicon: same door + **single knock** `M9 26h15`, stroke 6 — simplified for ≤32px

## Files

### Mark (symbol, no text)
`mark-color-on-light.svg` · `mark-color-on-dark.svg` · `mark-mono-black.svg` · `mark-mono-white.svg`

### Lockup — camelCase (primary)
- `lockup-color-on-light.svg` · `lockup-color-on-dark.svg` — live text, requires Barlow Condensed (web)
- `lockup-color-on-light-outlined.svg` · `lockup-color-on-dark-outlined.svg` — text as paths (print/export)
- `lockup-mono-black-outlined.svg` · `lockup-mono-white-outlined.svg` — single-color, paths

### Lockup — all-caps (alternate, tight spaces only)
`lockup-caps-on-light-outlined.svg` · `lockup-caps-on-dark-outlined.svg`

### Favicon / app icon (no letters, single knock)
- `favicon-adaptive.svg` — theme-aware, `<link rel="icon" type="image/svg+xml">`
- `favicon-color.svg` · `favicon-on-dark.svg` · `favicon-mono-black.svg` · `favicon-mono-white.svg`
- `app-icon-512.png` — rounded plate on storm slate
- `app-icon-maskable-512.png` — full-bleed slate, content inside the 80% safe circle (Android/iOS)
- `favicon-16.png` · `favicon-32.png` · `favicon-180.png` (apple-touch)

### png-exports/ (transparent)
marks & favicons 512px; lockups 1024px (from outlines).

## What changed v1.3 → v1.5 (sync to guidelines)
- Knocks raised to hand height (y22/30) — was optical-center (y31/39).
- Lockup set at FS52 on the door ground line — was FS46 optical-center.
- Favicon simplified to a single knock — was two knocks.
- App-icon/maskable rebuilt with the hand-height mark; maskable content within the 80% safe circle.
- SVGO optimized; Barlow Condensed SemiBold + OFL.txt bundled in /font.

## HTML wiring
```html
<link rel="icon" type="image/svg+xml" href="/favicon-adaptive.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/favicon-180.png">
<!-- manifest: app-icon-512.png ("any") + app-icon-maskable-512.png ("maskable") -->
```
