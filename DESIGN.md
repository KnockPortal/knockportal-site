# KnockPortal — DESIGN.md (Source of Truth)

> Single source of truth for the KnockPortal brand. Logo package, guidelines and the site build
> synchronise to THIS file. Canon is KnockPortal only — never import Abalon palette, fonts or logo.
>
> **Synced 2026-06-29 → DARK-FIRST "dispatch console" direction.** The site is dark-first: an ink
> canvas with a live permit-telemetry feel (mission-control / equipment-dashboard, NOT sci-fi).
> Tokens (hex) are unchanged; their ROLES flipped from the earlier light-first draft. See THEME.

## PATTERN
B2B SaaS — a marketing workspace for residential contractors. It reads the city's issued
building permits, groups them into live clusters, and lets a contractor pick neighbourhoods
themselves — then launch a postcard campaign or prepare a walk list. Live market: roofing &
solar (San Francisco); structure is category- and metro-agnostic and expands. Authoritative,
data-driven, made-by-people-who-get-the-trade. The site is a **conversion funnel only** — after
subscribing, value lives in email + a member app, not the marketing site (closed-system / "thing
in itself"). Not a tech-startup gradient blob, not an insurance shield, not a weather app. Storm
framing (DFW/Florida hail) is retired for Phase 0 — positioning is neutral permit-intelligence.

## THEME — dark-first (the big rule)
- **Canvas:** `ink #0F1822` is the primary background everywhere. `slate #1B2733` for elevated
  blocks/cards/consoles. Light `hail #F2F5F7` surfaces are the rare exception, not the rhythm —
  never alternate white/slate sections.
- **Text:** `hail #F2F5F7` = headings + body on dark; `muted #8A99A8` = secondary/meta/telemetry;
  `hairline #33424F` = dividers/borders on dark.
- **Orange `#FF6B1A` = accent only** (~10% max, one focal use per screen): primary CTA fills,
  key data values, `● LIVE` dot, K·P capitals in the wordmark. Never a flood, never body text.
- **Logo light/dark rule (mandatory):** on dark surfaces use the **on-dark** lockup/mark
  (hail door + orange knocks); on light surfaces use **on-light** (slate door). Matching the
  asset to the surface is non-negotiable — slate art vanishes on dark, hail art vanishes on light.

## COLORS
| Token | Role (dark-first) | HEX |
|---|---|---|
| `ink` | **Primary canvas / page bg** | `#0F1822` |
| `slate` | Elevated surfaces, cards, consoles | `#1B2733` |
| `hail` | **Primary text on dark** / reverse / rare light bg | `#F2F5F7` |
| `muted` | Secondary text, meta, telemetry, legal | `#8A99A8` |
| `hairline` | Dividers / borders on dark | `#33424F` |
| `orange` | Accent / CTA / key values / ●LIVE / K·P (~10% max) | `#FF6B1A` |
| `paper` | Document white (print/PDF only) | `#FFFFFF` |

Contrast: hail-on-ink ≈ 15:1, hail-on-slate 13.5:1 (AAA). `muted #8A99A8` on ink ≈ 5.9:1 — OK for
meta/telemetry but **do not** drop muted below ~13px on ink for primary reading. Orange-on-dark is
accent-only (values, dot, CTA fill with ink text), never a full word of body.

## DISPATCH HERO (signature pattern — load-bearing pages)
The hero on Home and For-contractors reads as a **local dispatch / equipment screen monitoring the
city**, not a generic landing:
- **Telemetry top bar** (mono, muted): `37.7749°N · 122.4194°W | SAN FRANCISCO | {date} | ● LIVE`
  (the `●` is orange). Hairline under it.
- **Left column:** mono eyebrow (`● PERMIT INTELLIGENCE — SAN FRANCISCO`), H1 in Barlow Condensed
  (hail, tight leading), 2–3 sentence hook, two CTAs — orange-solid primary + outline-on-dark
  secondary.
- **Right column = live console:** slate card, hairline border, header `● INCOMING · LAST 7 DAYS`
  + `SF · ROOFING+SOLAR`, a mono table of masked permit rows (`7XX Montgomery St / Chinatown /
  $40,000`), **values in orange**, footer `Full address & value, every morning. · Unlock →`.
- **Bottom counter strip** (mono, muted, key values hail/orange): `TRACKED · 90D {n} · PEAK {date}
  · TODAY +{n} · MEDIAN VALUE ${n}`. All numbers are DB-driven variables.
- **Background:** ink with a faint dotted "star" grid (very low contrast). No glow.

## TYPOGRAPHY
- **Display / wordmark:** Barlow Condensed SemiBold (600). OFL. Sentence case (never CAPS/Title).
- **Body / UI:** IBM Plex Sans (400/500/600). OFL.
- **Data / mono / telemetry** (permit rows, IDs, coords, counters): IBM Plex Mono (500). OFL.
- Wordmark: `KnockPortal` camelCase, K and P orange, one line, letter-spacing 0.5.

## LOCKUP
Door-arch mark (no bottom line, no roofline) + two orange knocks flush-right at hand height
(y22/30). Horizontal lockup: mark + wordmark on the door ground line (font 52, baseline 57).
Clear space = door width. Min lockup width 120px; favicon down to 16px uses the single-knock mark.
On the dark site, default to the **on-dark** lockup everywhere.

## EFFECTS (UI)
Transitions 150–200ms ease. Hover: orange CTA darkens to `#E85D10`; slate surfaces lift to
`#22303D`. Focus: 2px orange ring (`focus-visible`). Faint dotted bg grid is allowed (ambient,
low-contrast). Respect `prefers-reduced-motion`. Status = SVG glyphs, never emoji.

## AVOID
House/roof silhouettes · lightning/storm-cloud drama · gradients/3D/bevel/**glow/neon** ·
orange floods · second accent color · emoji in UI · light-on-light or dark-on-dark logo ·
alternating white/slate section rhythm · Abalon navy/bronze/Georgia/shell mark.

## CHECKLIST
SVG icons not emoji · contrast text ≥4.5:1 (hail/muted on ink) · `cursor-pointer` + `focus-visible`
on interactives · hover 150–200ms · responsive 375/768/1024/1440 · on-dark logo on dark surfaces ·
consent never pre-checked · one orange focal accent per screen.

## tailwind.config.ts (extend)
```ts
export default {
  theme: { extend: {
    colors: {
      ink: '#0F1822', slate: '#1B2733', hail: '#F2F5F7',
      muted: '#8A99A8', hairline: '#33424F', orange: '#FF6B1A',
    },
    fontFamily: {
      display: ['var(--font-display)', 'sans-serif'],
      sans:    ['var(--font-body)', 'system-ui', 'sans-serif'],
      mono:    ['var(--font-mono)', 'ui-monospace', 'monospace'],
    },
  } },
}
```
Default page: `bg-ink text-hail`. Cards/consoles: `bg-slate border border-hairline`.

## app/fonts.ts
```ts
import { Barlow_Condensed, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
export const display = Barlow_Condensed({ subsets:['latin'], weight:['600'], variable:'--font-display' })
export const body    = IBM_Plex_Sans({ subsets:['latin'], weight:['400','500','600'], variable:'--font-body' })
export const mono    = IBM_Plex_Mono({ subsets:['latin'], weight:['500'], variable:'--font-mono' })
```

## Contacts (operated-by)
KnockPortal is operated by **Abalon Construction Management LLC** (Raleigh, NC). Product surfaces
lead with KnockPortal; the LLC appears as a muted legal line. Customer contact on @knockportal.com
(or knockportal@gmail.com interim) and knockportal.com. Registered address: 4030 Wake Forest Rd,
Ste 349, Raleigh, NC 27609. Tagline: "Know before you knock".
