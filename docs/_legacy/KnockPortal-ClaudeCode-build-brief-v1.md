# KnockPortal — Build brief for Claude Code (Phase 0 site, from scratch)
## v1.0 · production Next.js build

> Build the KnockPortal Phase-0 marketing site as a **real Next.js 14 (App Router) + Tailwind v3 +
> TypeScript** project, from scratch. The Claude Design `standalone.html` (dark) in this folder is
> the **pixel reference** — port its markup/styles to clean Tailwind/React components; do not embed
> or iframe it, and do not reinvent the look. `DESIGN.md` is the token canon. Don't change approved
> copy or numbers. Ask if something's missing — never invent permit data, prices, or legal text.

---

## 0. Source of truth (read in this order)
1. `DESIGN.md` — **dark-first** tokens, dispatch-hero spec, light/dark logo rule, tailwind+fonts config. Authoritative for all styling.
2. `KnockPortal - standalone.html` (dark, from Claude Design) — **the visual target.** Port it section-by-section. It's a reactive prototype (`<sc-if>`, `{{ }}`) — extract the real markup/CSS, rebuild as components.
3. `KnockPortal-pages-content-v1.1.md` — block structure + approved English copy + form specs. Copy verbatim.
4. `KnockPortal-site-spec-v1.md` — product spec: routes, data model, the two funnels, email model B2, double opt-in. Frontend obeys it as constraints.
5. `stripe-links.md` — the 4 real Stripe price URLs for `/pricing` buttons + the toggle/gating rule.
6. `STRIPE_BRANDING.md` — Stripe surfaces + (if needed) Buy Button embed. Note: `stripe-links.md` says plain `<a href>` links are enough; Buy Button not required.
7. `logo-*` assets — use **on-dark** lockup/mark on the dark site (`logo-lockup-color-on-dark*`, `logo-mark-color-on-dark*`, `logo-favicon-on-dark*`).

## 1. Stack & project setup
- Next.js 14 App Router, TypeScript, Tailwind v3, `next/font` (config already in `DESIGN.md`).
- `cn()` util (clsx + tailwind-merge) for conditional classes. Lucide React for icons (SVG, never emoji).
- Default `app/layout.tsx`: `bg-ink text-hail`, fonts wired via the `DESIGN.md` `fonts.ts`.
- No backend in this pass (no Supabase/Resend/webhooks). Forms POST to stub handlers / TODO API routes; payment buttons are real Stripe links. Backend wiring is a separate task.

## 2. Component system first (build before pages)
Port from `standalone.html`, tokens from `DESIGN.md`:
`Button` (orange primary / outline-secondary-on-dark / ghost) · `StickyHeader` (on-dark logo, nav,
2 grouped CTAs + homeowner microline) · `TelemetryBar` (top coords/date/●LIVE) · `CounterStrip`
(bottom TRACKED/PEAK/TODAY/MEDIAN) · `RegistryConsole` (slate card, masked mono rows, orange values,
Unlock footer) · `DottedBg` · `PlanCard` + `BillingToggle` + `CategorySelect` (live→Stripe,
coming_soon→waitlist) · `FormField`/`Consent` (consent never pre-checked) · `Footer` (on-dark,
operated-by-Abalon) · `Section` wrapper (consistent dark rhythm).

## 3. Pages (build order) — copy from content-v1.1, look from standalone
1. `/` Home — dispatch hero (telemetry + left copy + RegistryConsole right + counter strip + dotted bg), problem block, registry teaser (must show rows — was a bug), two-audience cards, how-it-works strip, trust line, final CTA, footer.
2. `/contractors` — dispatch hero variant + sales blocks + comparison + math (real numbers) + FAQ. Not a catalog.
3. `/pricing` — 2 `PlanCard`s + `BillingToggle` + `CategorySelect`; **buttons → the 4 real URLs in `stripe-links.md`**; coming_soon → waitlist, not Stripe; "most popular" badge orange.
4. `/request` — homeowner form; states as UI (check-inbox → confirmed → fallback), consent empty by default.
5. Contractor onboarding (behind auth stub) — Steps per content-v1.1 ($99 ends Step 1, $149 → Step 2 profile).
Content pages (How it works / About / Coverage / Contact) + legal (Terms / Privacy) = thin/next pass; keep nav links, honest stubs OK.

## 4. Acceptance
- Pixel-matches `standalone.html` (dark dispatch), tokens from `DESIGN.md`, no hardcoded hex off-canon.
- RegistryConsole + registry teaser **render rows** (real masked SF data), values orange.
- On-dark logo on every dark surface; no light-on-light / dark-on-dark.
- `/pricing` buttons hit the exact `stripe-links.md` URLs; toggle swaps monthly↔yearly URL; coming_soon → waitlist.
- Consent unchecked by default; `focus-visible` orange ring; `prefers-reduced-motion` respected; responsive 375/768/1024/1440.
- Deliver: running `npm run dev`, screenshots of each page at 1440 + 375, and a component inventory.

## 5. Out of scope (do NOT build here)
Backend (Supabase RLS, Stripe webhook→activation, Resend streams, cron) · legal copy (lawyer) ·
member app (separate product) · the intro animation/video (separate track) · changing approved
copy, prices, or brand tokens.
