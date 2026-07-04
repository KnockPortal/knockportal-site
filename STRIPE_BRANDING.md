# KnockPortal — Stripe branding cheatsheet

> Drop into the website project knowledge. Final values + which asset file goes where, so any
> re-setup or handoff to a developer needs no guessing. Account legal entity is **Abalon
> Construction Management LLC** (merchant of record); the customer-facing brand is **KnockPortal**.

---

## 1. Colors — Settings → Branding → Checkout & Payment Links
Stripe has two color fields with specific roles — **do not swap them** (swapping makes the header an
orange flood with a stock-blue button, which violates the canon).

| Stripe field | What it controls | Value |
|---|---|---|
| **Brand color** | Header / panel background | `#1B2733` (Storm slate) |
| **Accent color** | Pay/Subscribe button + links | `#FF6B1A` (Hi-vis orange) |

Result: dark slate header + orange CTA = our "dark surface + one orange accent" language.
Stripe auto-picks dark text on the orange button (correct — orange-on-white is only ~2.3:1, so it
must never carry text itself; the button uses dark text).

## 2. Icon & Logo — same Branding screen
| Field | Asset to upload | Why |
|---|---|---|
| **Icon** | `app-icon-512.png` (slate plate, white door + orange knocks, built-in safe zone) | Square brand icon; the safe zone keeps it centered with air instead of flush to the corner. On the dark header the plate blends, reading as a clean centered mark. |
| **Logo** | `lockup-color-on-dark` (horizontal, white text + orange K·P), 1024px PNG | Shows the **name** on surfaces with room (invoice, portal, receipts). |
| **Prefer logo over icon** | **ON** | Where there's space, show the lockup with the name; the icon stays for tight/favicon spots. |

## 3. Product image — Product catalog → KnockPortal Subscription
Use **`knockportal-logo-vertical-slate-plate-1024.png`** (vertical lockup on a slate plate).
**Not** the light/transparent vertical lockup — on the dark checkout panel its slate door and
`nock`/`ortal` letters vanish into the background, leaving only the orange knocks and floating
`K`/`P`. The plated version is robust on every Stripe surface (dark checkout panel **and** the light
product catalog).

## 4. Public name & statement descriptor — Settings → Business details
- **Public business name:** `KnockPortal` (so the invoice header and checkout read KnockPortal, not
  the bare LLC). The legal entity **Abalon Construction Management LLC** still appears in the invoice
  details / authorization line — that's correct and required as merchant of record.
- **Statement descriptor:** `KNOCKPORTAL` (or `KP* PERMITS`, ≤22 chars). This is what shows on the
  customer's card statement. If it reads "ABALON CONSTRUCTION", roofers won't recognize the charge →
  chargebacks. **Verify with one real test charge.**

## 5. The light/dark rule (applies to every Stripe surface)
**Match the asset to the surface background. No exceptions.**
- **Dark** surface (checkout panel, dark invoice/email header) → on-dark asset (white door + white
  text + orange K·P) or a plated asset. Never the light/slate version.
- **Light** surface (website, light PDF, product catalog thumbnail) → on-light asset (slate + orange).
A light asset on a dark panel loses everything slate-colored; a dark asset on light loses everything
white. This is the single most common branding bug — check the background first.

## 6. Per-tab checklist — Settings → Branding (top tabs)
All inherit the brand/accent colors, but preview each:
- [ ] **Checkout & Payment Links** — dark header, orange button, on-dark product image. ✅ done
- [ ] **Email receipts** — header dark, button orange, logo reads (on-dark).
- [ ] **Customer portal** — where customers manage/cancel subscriptions; logo is larger here, confirm legibility.
- [ ] **Invoice** — header shows the public name (KnockPortal) with Abalon in the details, not as the headline.
- [ ] **Identity** — public business name = KnockPortal; legal name = Abalon Construction Management LLC.

## 7. Open items
- **Custom domain** — Stripe's "Use your domain" / "Add your domain": connect `pay.knockportal.com`
  (or checkout.knockportal.com) so the checkout URL drops `buy.stripe.com`. Trust boost for the ICP.
- **Domain email** — move from `knockportal@gmail.com` to `@knockportal.com` when ready.
- **Test charge** — run one to confirm the statement descriptor and the whole flow look on-brand end to end.

---

### Asset filenames referenced (from logo package v1.5 / Brand Pack v1)
- `app-icon-512.png` — Icon
- `lockup-color-on-dark` (png-exports/…-1024.png) — Logo
- `knockportal-logo-vertical-slate-plate-1024.png` — Product image
- on-light equivalents (`mark-color-on-light`, `lockup-color-on-light`) — only for light surfaces

---

## 8. Buy Button embed (Next.js, App Router)

The `<stripe-buy-button>` is a Web Component. Pasting Stripe's raw snippet into a Next.js page
breaks SSR ("unknown element"). Wrap it in a **client component** and load the script via
`next/script`.

### `components/StripeBuyButton.tsx`
```tsx
'use client'
import Script from 'next/script'

export default function StripeBuyButton() {
  return (
    <>
      <Script src="https://js.stripe.com/v3/buy-button.js" strategy="afterInteractive" />
      {/* @ts-expect-error — Stripe web component, not a known JSX element */}
      <stripe-buy-button
        buy-button-id="buy_btn_XXXXXXXXXXXX"
        publishable-key="pk_live_XXXXXXXXXXXX"
      />
    </>
  )
}
```
Use it in any page/section: `<StripeBuyButton />`. Replace `buy-button-id` and `publishable-key`
with the values from Stripe → Payment Links → Buy button.

### Optional: kill the TS error properly (instead of `@ts-expect-error`)
`types/stripe-buy-button.d.ts`:
```ts
declare namespace JSX {
  interface IntrinsicElements {
    'stripe-buy-button': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & { 'buy-button-id': string; 'publishable-key': string },
      HTMLElement
    >
  }
}
```

### Keys — security
- **`pk_live_…` (publishable key)** is designed for the frontend and is safe to ship in page source.
  No need to hide or rotate it.
- **`sk_live_…` (secret key)** must NEVER appear in frontend code, a repo, a screenshot, or this file.
  Server-side only, in an env var. If a secret key is ever exposed → rotate it immediately in Stripe.

### Before going live
- The snippet uses a **live** key → it takes real money the moment it's on a public page.
- Test the full flow first with a `pk_test_…` key / test buy button, then swap to live.
- The "Show supported payment methods" toggle is ON — keep it; visible Visa/MC/Amex reduces friction
  for a distrustful contractor ICP.
