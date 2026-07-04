# KnockPortal — Website Project Brief

> **Paste this whole file into the new project's knowledge.** It carries the locked brand canon,
> stack, ready-to-wire snippets and asset inventory so the website project can build knockportal.com
> in-brand without any prior chat history. The brand/design itself is locked in a separate project —
> this doc is the bridge. **Treat the canon below as source of truth; do not invent new colors, fonts
> or logo variants.**

---

## 0. Rule 0 — brand separation (critical)
KnockPortal is its **own** brand system. It is operated by **Abalon Construction Management LLC**, but
**never import anything from Abalon** — not navy/bronze colors, not Georgia/serif type, not the abalone
shell mark. Abalon appears on KnockPortal surfaces only as a muted "Operated by" legal line. One logo,
one palette, one accent on every surface.

---

## 1. Product
KnockPortal — B2B SaaS, **roofing & HVAC permit intelligence** for storm verticals (DFW hail corridor,
Central Florida hurricanes). Turns public building-permit data into leads: daily alerts, homeowner names,
canvassing routes, direct-mail lists.

- **Audience:** small roofing/HVAC owners, 1–10 crews, TX & FL. Read email on a phone in a truck. Distrust
  lead-gen scams and Silicon-Valley pitch decks. Design FOR them: a working tool, not a startup.
- **Tone:** authoritative, data-driven, blunt-but-confident. Road/jobsite/county-records register.
- **Taglines:** primary **"Know before you knock"** · secondary **"From storm to signed roof."**

---

## 2. Brand canon (source of truth)

### Colors
| Token | Role | HEX |
|---|---|---|
| `slate` | Primary dark / surfaces / text on light | `#1B2733` |
| `orange` | Accent / CTA / K·P capitals / knock (**≤10%** of any view) | `#FF6B1A` |
| `hail` | Light / reverse / page bg | `#F2F5F7` |
| `muted` | Secondary text, meta, legal | `#8A99A8` |
| `ink` | Deepest shade (footers, dark hover) | `#0F1822` |
| `hairline` | Dividers on dark | `#33424F` |

Contrast: slate↔hail ≈ 13.5:1 (AAA). **Orange-on-white ≈ 2.3:1 → accent only** (K·P capitals, knock,
CTA fills with slate/white text). Never orange body copy or a full orange word.

### Typography
- **Display / wordmark:** Barlow Condensed SemiBold (600). OFL.
- **Body / UI:** IBM Plex Sans (400/500/600). OFL.
- **Data / mono** (permit numbers, IDs, codes): IBM Plex Mono (500). OFL.

### Logo & wordmark
- Wordmark **`KnockPortal`** — camelCase, capitals **K** and **P** orange, rest slate (on light) /
  hail white 100% (on dark), one line, letter-spacing 0.5.
- Mark: door arch (no bottom line, **no roofline**) + two orange knocks flush-right at hand height
  (`y22/30` in a 64-grid). Clear space = door width. Favicon down to 16px uses the **single-knock** mark.
- Door path (viewBox 0 0 64 64): `M28 57V15q0-6 6-6h14q6 0 6 6v42` · stroke 6.

### UI behavior
- Transitions 150–200ms ease. Hover: orange CTA → `#E85D10`; slate surface → `#22303D`.
- Focus: 2px orange `focus-visible` ring. Respect `prefers-reduced-motion`.
- **Status = SVG glyphs, never emoji.** One accent only. Mono for permit numbers/data.

### AVOID
House/roof silhouettes · lightning/storm-cloud drama · gradients/3D/bevel/glow · orange floods · emoji in UI ·
a second accent color · anything from Abalon.

---

## 3. Stack
Next.js 14 (App Router) · Tailwind CSS v3 · Supabase · Stripe · Vercel. shadcn/ui only with brand
customization (never raw defaults). Use a `cn()` helper (clsx + tailwind-merge) for conditional classes.
Icons: lucide-react or custom SVG (no emoji). Fonts via `next/font/google`.

---

## 4. Ready-to-wire

### `tailwind.config.ts` (extend)
```ts
export default {
  theme: { extend: {
    colors: {
      slate: '#1B2733', orange: '#FF6B1A', hail: '#F2F5F7',
      muted: '#8A99A8', ink: '#0F1822', hairline: '#33424F',
    },
    fontFamily: {
      display: ['var(--font-display)', 'sans-serif'],
      sans:    ['var(--font-body)', 'system-ui', 'sans-serif'],
      mono:    ['var(--font-mono)', 'ui-monospace', 'monospace'],
    },
  } },
}
```

### `app/fonts.ts`
```ts
import { Barlow_Condensed, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
export const display = Barlow_Condensed({ subsets:['latin'], weight:['600'], variable:'--font-display' })
export const body    = IBM_Plex_Sans({ subsets:['latin'], weight:['400','500','600'], variable:'--font-body' })
export const mono    = IBM_Plex_Mono({ subsets:['latin'], weight:['500'], variable:'--font-mono' })
// apply on <body>: `${display.variable} ${body.variable} ${mono.variable} font-sans`
```

### Favicon / icons (in `<head>`) — files from the logo package v1.5
```html
<link rel="icon" type="image/svg+xml" href="/favicon-adaptive.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/favicon-180.png">
<meta name="theme-color" content="#1B2733">
<!-- manifest: app-icon-512.png ("any") + app-icon-maskable-512.png ("maskable") -->
```

### OG / social meta
```html
<meta property="og:title" content="KnockPortal — Know before you knock">
<meta property="og:description" content="Roofing & HVAC permit intelligence — DFW & Central Florida.">
<meta property="og:image" content="/og-image.png">  <!-- 1200×630, from the brand pack -->
<meta name="twitter:card" content="summary_large_image">
```

---

## 5. Contact / legal treatment
Product leads; the LLC is a muted legal line.
- **Operator:** Abalon Construction Management LLC · Raleigh, NC.
- **Registered address (legal/footer fine print):** 4030 Wake Forest Rd, Ste 349, Raleigh, NC 27609.
- **Contact:** knockportal.com · knockportal@gmail.com (interim — move to `@knockportal.com` domain email
  when ready) · +1 (919) 840-6425.
- **Person:** Aleksei Zhemchuzhnikov, Founder.
- Footer pattern: `Operated by Abalon Construction Management LLC · Raleigh, NC · Know before you knock.`
- Handles: `@knockportal` on all platforms.

---

## 6. Asset inventory (delivered, in the brand pack / logo package)
- **Logo package v1.5** — mark (color/dark/mono ×4), horizontal + vertical lockups (live-text + outlined),
  favicons (adaptive/color/dark/mono), app-icon + maskable + apple-touch, PNG ladder 512/192/64/32, fonts + OFL.
- **Brand Pack v1** — `DESIGN.md` (full canon), UI kit (buttons/status badges/forms/dark surface/tokens),
  print stationery, OG image / LinkedIn banner / square post, pitch-deck shell, 7-page Brand Guide PDF, SRC.
- Reuse these assets directly; do not redraw the logo.

---

## 7. How to work
- This (website) project decides **what** to build: pages, routes, features, data. Those are inputs to design,
  not up for redrawing the brand.
- Reconcile every component to the canon above (and the brand pack's `DESIGN.md`). If a product need conflicts
  with canon (e.g. a 2nd accent color, a 4th button style), **flag it explicitly** — don't silently introduce it.
- Hand implementation specs to Claude Code as atomic tasks with file paths.

---

## 8. Open items to confirm before launch
- Is **knockportal.com** live, and is the **domain email** (`@knockportal.com`) set up? gmail is fine as interim
  but domain email reads more established; don't print a dead URL.
- Pitch deck is currently a **shell** (needs real content).
- Presentation folder + lanyard badge still pending from the brand pack.
- External brand-safety check on the mark (reverse-image search; compare vs DFW roofing-company logos).
```
```
