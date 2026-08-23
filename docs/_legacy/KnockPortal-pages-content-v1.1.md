# KnockPortal — Контент и структура страниц (несущие)
## v1.1 — 28 июня 2026 · вход для Claude Design

> Спутник к ТЗ `KnockPortal-site-spec-v1.md`. Здесь — **структура блоков + готовый английский
> копирайт + спека форм** для несущих страниц Phase 0. Задача Claude Design: применить бренд-канон
> и свёрстать по этим блокам и текстам.
>
> **Несущие страницы:** Home · For contractors · Pricing · Request form · Contractor onboarding.
> Контентные (How it works · About · Coverage · Contact) — следом.

### Changelog v1.0 → v1.1 (правки по реальным данным SF)
Разведка SF-данных закрыта. Категорийная модель и числа переписаны под факты:
- **Две live-категории подтверждены реальными данными:** roofing (821 permits/120д, медиана $21K,
  вилка $12K–$41K) + solar (98/120д, медиана $24.6K). Адрес/стоимость 100%. Лаг свежести 0 дней.
- **Верх категорийно-нейтральный** (структура мульти-категорийна), но реестр честно показывает
  только live-категории. Убран моно-roofing из заголовков.
- **Категории coming_soon** (HVAC/electrical/plumbing/windows — в SF не выделяются чисто из фида,
  Phase 1 с классификатором): в селекте видны, но оплата заблокирована, заглушки честные.
- **Реальные тизер-строки** вместо выдуманных (настоящие свежие permits).
- **Зональный фильтр** — поле neighborhood (36 районов SF), готов для «filter by your zones».
- Числа в «the math» — реальные (медиана $21K, вилка $12K–$41K), не выдуманные.

> **Бренд-канон (НЕ переопределять):** slate `#1B2733`, orange `#FF6B1A` (≤10%, акцент),
> hail `#F2F5F7`, muted `#8A99A8`, ink `#0F1822`, hairline `#33424F`. Шрифты: Barlow Condensed
> SemiBold (display), IBM Plex Sans (body), IBM Plex Mono (data/permits). Логотип: door-arch + 2
> оранжевых knock, без roofline. Тон: авторитетный, data-driven, прямой; подрядчик в грузовике,
> не пич-дек. AVOID: house/roof силуэты, storm-драма, градиенты/glow, оранжевые заливки (кроме
> одной primary-кнопки), эмодзи, второй акцент.
>
> **Два голоса:** подрядчику — прямой, по делу, деньги/скорость. Домовладельцу — человечный,
> спокойный. Не путать на стыке.
>
> **Sticky-шапка с 2 CTA — на КАЖДОЙ странице** (раздел 0).

---

# 0. GLOBAL — сквозные элементы

## 0.1. Sticky header
Закреплён сверху на всех страницах. Слева логотип (door-arch + 2 knock) + wordmark KnockPortal.
Навигация. Справа — **два CTA**.

| Элемент | Текст | Действие | Стиль |
|---|---|---|---|
| Nav | Home · How it works · About · Coverage · Contact | переход | text links, slate |
| CTA-1 | **Subscribe — from $99/mo** | → `/pricing` | оранжевая **primary** (единственный оранжевый) |
| CTA-2 | **Submit a request** | → `/request` | slate **strong** (контрастная, не оранжевая, не тихая) |

Микро-подпись у CTA-2 (усиливает сигнал подрядчику): `For homeowners — find a contractor`.
Mobile: шапка сворачивается, **обе кнопки видимы**, nav — в бургер.

## 0.2. Footer
- Лого + слоган: `Know before you knock.`
- Колонки: Product (How it works, Pricing, Coverage) · Company (About, Contact) · Legal (Terms, Privacy).
- `KnockPortal is operated by Abalon Construction Management LLC.`
- Физ-адрес (CAN-SPAM): `4030 Wake Forest Rd, Ste 349, Raleigh, NC 27609.`

## 0.3. Live-категории и coming-soon (важно для всех селектов и текстов)

**Live сейчас (реальные данные, оплата работает, рассылка идёт):**
- **Roofing** — San Francisco. 821 свежих permits/120д, медиана $21K.
- **Solar** — San Francisco. 98/120д, медиана $24.6K.

**Coming soon (в селектах видны, но оплата заблокирована, заглушки честные):**
- HVAC, Electrical, Plumbing, Windows/Siding — данные в разработке (Phase 1).

> Правило для Claude Design: где есть селект категорий — показывать ВСЕ, но `coming_soon`-пункты
> помечать (напр. серым «coming soon») и блокировать оплату/обещание по ним. Тексты заглушек — ниже
> по страницам. Никогда не брать у подрядчика деньги за категорию без реестра.

---

# 1. HOME — `/`

**Цель:** за 5 секунд объяснить ценность обеим аудиториям, увести в нужный CTA.

### Block 1 — Hero (категорийно-нейтральный — говорит обеим аудиториям)
- **H1 (display):** `Fresh local permits. Before your competitors knock.`
- **Sub (body):** `KnockPortal turns public building-permit data into a daily list of fresh jobs in your area — full address, job value, issued date. Be the first contractor at the door.`
- **Dual CTA:**
  - Primary orange: `See plans — from $99/mo` → `/pricing`
  - Strong slate: `I'm a homeowner — find a contractor` → `/request`
- Строка доверия (data-mono): `Live in San Francisco: roofing and solar · updated daily · more categories rolling out`

> Honesty: НЕ «thousands of leads». Реальный охват — SF, roofing + solar. Строка «updated daily»
> ставится на прод ТОЛЬКО когда cron реально работает (лаг подтверждён 0 дней, но пайплайн должен
> крутиться). До этого — убрать «updated daily».

### Block 2 — The problem (для подрядчика)
- **H2:** `Leads you buy are sold five times.`
- 3 строки (Tabler/SVG-иконки, без эмодзи):
  - `Shared lead services sell the same homeowner to 3–5 contractors.`
  - `Word-of-mouth is unpredictable. Ads you can't dial in.`
  - `A permit means the budget is approved and the job is real.`

### Block 3 — Masked registry teaser (data-mono, county-register вид)
Заголовок: `A live sample from this week's San Francisco permits:`

РЕАЛЬНЫЕ строки (из выкаченных данных, маскированы 78XX-схемой):

| Address (masked) | Neighborhood | Job value | Issued |
|---|---|---|---|
| 7XX Montgomery St | Chinatown | $40,000 | 2026-06-26 |
| 2XX Clipper St | Noe Valley | $37,000 | 2026-06-26 |
| 23XX 43Rd Av | Sunset/Parkside | $32,300 | 2026-06-26 |
| 5XX Rhode Island St | Potrero Hill | $18,000 | 2026-06-26 |
| 2XX 27Th St (solar) | Noe Valley | $52,465 | 2026-06-22 |

Под таблицей: `Subscribers get the full address and value on every permit, every morning.`
CTA inline: `Unlock the full registry →` → `/pricing`

> Для Claude Design: моноширинный, hairline-границы, slate — как официальный county-register.
> Маскировка — часть дизайна. Строки реальны (можно ротировать свежие из фида).

### Block 4 — Two ways to use KnockPortal
Две карточки:
- **Card A — Contractors:** `Get the daily registry. Knock first. Optionally, get your profile in front of homeowners who are looking.` CTA: `See plans →` `/pricing`
- **Card B — Homeowners:** `Looking for a contractor you can trust? Tell us what you need — we'll send you a short list of contractors in your area. Free.` CTA: `Submit a request →` `/request`

> Card B видна и подрядчику — сигнал «тут привлекают заказчиков» (by design).

### Block 5 — How it works (3 шага)
- `1 · We pull fresh permits daily from public records.`
- `2 · You get them by email every morning — address, value, date.`
- `3 · You knock before anyone else does.`
- Link: `See how it works in detail →` `/how-it-works`

### Block 6 — Trust / about-strip
- `KnockPortal is operated by Abalon Construction Management LLC, a licensed North Carolina company.`
- `Built around legal contact channels — public records and your own outreach. We don't sell shared leads.`
- Disclaimer: `New service, expanding coverage. Currently live in San Francisco for roofing and solar.`

### Block 7 — Final CTA band (slate, одна оранжевая кнопка)
- **H2:** `Stop chasing leads. Start knocking on real jobs.`
- Primary orange: `See plans — from $99/mo` → `/pricing`
- Secondary text-link: `Or submit a homeowner request →` `/request`

---

# 2. FOR CONTRACTORS — `/contractors`

**Цель:** продать подписку. **НЕ каталог.** Голос — прямой, деньги/скорость.

### Block 1 — Hero
- **H1:** `The permit lands. You knock first.`
- **Sub:** `Every morning, KnockPortal emails you the fresh permits in your trade and market — full address, job value, issued date. While your competitors buy recycled leads, you're already at the door.`
- Primary CTA: `See plans — from $99/mo` → `/pricing`

### Block 2 — Why permits beat leads (таблица)
- **H2:** `A permit is not a lead. It's better.`

| | Shared leads (Angi/Thumbtack) | KnockPortal permits |
|---|---|---|
| Exclusivity | Sold to 3–5 contractors | The permit is public; you act first |
| Intent | "Maybe interested" | Budget approved, job filed |
| Cost | $300–600/mo, per-lead | Flat from $99/mo, unlimited |
| Channel | Their platform | Your own knock / mail |

### Block 3 — What you get (по тарифам)
- **Registry — $99/mo:** `Daily email of fresh permits in your category and metro. Full address and job value on every line.`
- **Registry + Presence — $149/mo:** `Everything in Registry, plus your contractor profile in our private dispatch to homeowners searching in your category and metro.`
- CTA: `Compare plans →` `/pricing`

> Honesty про Presence: `We actively bring homeowners onto the platform; volume grows as we launch.
> Your profile is ready to be seen from day one.` НЕ обещать готовый поток.

### Block 4 — The math (реальные числа)
- **H2:** `One won job pays for years.`
- Body: `A typical San Francisco re-roof permit runs $12,000–$41,000 in work (median around $21,000); solar installs run higher. At $99/mo, a single won job covers more than a year of KnockPortal. The registry pays for itself on job one.`

> Числа реальны (выкачаны из SF-данных): roofing вилка $12K–$41K, медиана $21K; solar медиана $24.6K.

### Block 5 — Live coverage (честно про категории)
- **H2:** `Live now in San Francisco.`
- Body: `We're live for roofing and solar in San Francisco, with daily fresh permits. More categories and metros are rolling out — if your trade isn't live yet, `+ link `tell us` → `/contact`/waitlist +`, and we'll notify you the moment it is.`

### Block 6 — How activation works
- `1 · Subscribe and pay securely through Stripe.`
- `2 · We email you a link to set up your account — pick your category and metro.`
- `3 · Your daily registry starts the next morning.`
- (`$149`): `4 · Build your profile card — it goes into our homeowner dispatch.`

### Block 7 — FAQ (accordion)
- `Where does the data come from?` → `Public building-permit records, pulled and cleaned daily.`
- `Which trades and areas are covered?` → `Live now: roofing and solar in San Francisco. More trades and metros are rolling out — tell us where you work.`
- `Do you sell my info or shared leads?` → `No. KnockPortal is a flat subscription. We never resell you as a lead.`
- `Can I cancel anytime?` → `Yes. Monthly plans cancel anytime.`
- `What's the difference between $99 and $149?` → `$149 adds your profile to our private homeowner dispatch. $99 is the registry only.`

### Block 8 — Final CTA band
- **H2:** `Be the first knock, not the fifth call.`
- Primary orange: `See plans — from $99/mo` → `/pricing`

---

# 3. PRICING — `/pricing`

**Цель:** 2 тарифа, monthly/yearly toggle, увести в Stripe.

### Block 1 — Header
- **H1:** `Simple pricing. One won job covers it.`
- **Sub:** `Flat monthly subscription. No per-lead fees, no contracts. Cancel anytime.`
- **Toggle:** `Monthly | Yearly (2 months free)`.

### Block 2 — Two plan cards

**Card 1 — Registry** — `$99/mo` (yearly `$990/yr`)
- Tagline: `Get to the job first.`
- Includes: `Daily email of fresh permits — your category, your metro` · `Full street address on every permit` · `Job value and issued date on every permit` · `Filter by your neighborhoods and zones` · `Cancel anytime`
- CTA: `Subscribe — $99/mo` → Stripe `monthly_99` (yearly → `yearly_990`)

**Card 2 — Registry + Presence** (highlight, бейдж slate «most popular») — `$149/mo` (yearly `$1,490/yr`)
- Tagline: `Get to the job first — and let homeowners find you.`
- Includes: `Everything in Registry` · `Your contractor profile in our private catalog` · `Included in our homeowner dispatch for your category and metro` · `Priority as new homeowner requests come in`
- CTA: `Subscribe — $149/mo` → Stripe `monthly_149` (yearly → `yearly_1490`)

> Stripe-ссылки — точные URL из vault (`session-summary-stripe-okno.md`). Кнопки = `<a href>`.
> Toggle переключает monthly/yearly URL. Бейдж «most popular» — slate, НЕ оранжевая заливка.
> **Селект категории при оплате:** только live (roofing/solar) ведут в checkout. Если подрядчик
> выберет coming_soon-категорию — НЕ Stripe, а waitlist (см. Block 3).

### Block 3 — Category availability (честный гейтинг — НОВОЕ)
- **H3:** `Available trades`
- Body: `Live now: roofing and solar in San Francisco. Other trades (HVAC, electrical, plumbing, windows) are in development.`
- Если выбрана coming_soon: `Registry for [trade] is coming soon. Want us to notify you when it launches?` → email-waitlist (НЕ оплата).

### Block 4 — What's NOT here
- `No setup fees. No per-lead charges. No long-term contract.`
- `Coverage is currently San Francisco and expanding. If your metro or trade isn't live, `+ link `tell us` → waitlist.

### Block 5 — FAQ (оплата)
- `What happens after I pay?` → `Stripe confirms, then we email you a setup link within minutes.`
- `Is my card secure?` → `Payments are processed by Stripe. We never see your card details.`
- `Can I switch plans?` → `Yes, upgrade or downgrade anytime.`
- `What shows on my statement?` → `KNOCKPORTAL.`

### Block 6 — Final CTA band
- **H2:** `Pick a plan. Knock tomorrow morning.`

---

# 4. REQUEST FORM — `/request` (домовладелец)

**Цель:** собрать интерес (категория + email + consent), запустить double opt-in.
Голос — человечный, спокойный.

### Block 1 — Header
- **H1:** `Find a contractor you can trust.`
- **Sub:** `Tell us what you need. We'll email you a short list of contractors working in your area. It's free, and your email is never shared with anyone.`

### Block 2 — The form

| Поле | Тип | Обязательно | Подпись |
|---|---|---|---|
| Category | select (live + coming_soon) | да | `What kind of work do you need?` |
| Metro / area | select | да | `Where are you located?` (сейчас: San Francisco) |
| Email | email | да | `Where should we send your contractor list?` |
| Project details | textarea | нет | `Briefly describe the job (optional)` |
| **Consent** | checkbox (НЕ пред-отмечен) | да | см. ниже |

**Consent (смягчённый, под юр-ревью):**
> `☐ I agree to receive a list of contractors for the work I selected, by email.`

**Submit:** `Send me contractors` (slate strong, НЕ оранжевая).

**Если выбрана coming_soon-категория** (напр. plumbing): принять заявку, но показать честно:
> `We don't have [trade] contractors in your area just yet — we're adding them. Leave your email and we'll notify you the moment we do.` (lead всё равно сохраняем — это сигнал спроса.)

### Block 3 — Trust micro-copy
- `Your email stays with us. We don't sell it, and we don't pass it to contractors — you reach out to whoever you like, on your terms.`
- `New service, expanding. If no contractors are listed in your area yet, we'll let you know as soon as they are.`

### Block 4 — After-submit (double opt-in, состояние)
- **H2:** `Almost done — check your email.`
- Body: `We just sent a confirmation link to [email]. Click it to confirm, and we'll send your contractor list right away.`
- Micro: `Didn't get it? Check spam, or ` + link `resend confirmation`.

### Block 5 — Confirmation-clicked (состояние)
- **H2:** `You're confirmed.`
- Body (есть мемберы): `We're sending your list of contractors now — check your inbox shortly.`
- Body (fallback): `Thanks! We don't have contractors listed for your area just yet, but we're adding them. We'll email you the moment we do.`

---

# 5. CONTRACTOR ONBOARDING — заполнение визитки (после оплаты)

**Цель:** magic-link → настройка реестра; на $149 — визитка. За auth-стеной. Голос — прямой, быстрый.

### Step 0 — Entry
- **H1:** `Welcome — let's set up your registry.`
- Sub: `Two quick steps and your daily permits start tomorrow morning.`

### Step 1 — Registry setup (ОБА тарифа)
| Поле | Тип | Обязательно | Подпись |
|---|---|---|---|
| Category | select (live) | да | `Which permits do you want?` (roofing / solar) |
| Metro | select | да | `Which market?` (San Francisco) |
| Zones / neighborhoods | multi-select | нет | `Narrow to your neighborhoods (optional)` — из 36 районов SF |
| Delivery email | email (из Stripe) | да | `Where to send the daily registry` |

CTA: `Save and continue` → `$99`: finish · `$149`: → Step 2.

> Зональный фильтр (neighborhood) реален — данные несут 36 районов SF (Sunset/Parkside, Noe Valley,
> Outer Richmond и т.д.). Подставить реальный список в select.

### Step 2 — Profile card (ТОЛЬКО $149)
**Required:** Company/name · Categories (≥1) · Metros/zones (≥1) · Contact for homeowner (email/phone, ≥1 — это публичный контакт подрядчика в визитке).
**Optional:** About · License # · Years · Website · Socials · Logo/photos (upload).
CTA: `Submit profile` → статус `pending` (модерация) → в dispatch после одобрения.

### Step 3 — Done
- **H2:** `You're all set.`
- Body ($99): `Your first registry email arrives tomorrow morning.`
- Body ($149): `Your registry starts tomorrow. Your profile is under quick review and will be included in homeowner dispatches once approved.`

---

# 6. Заметки для Claude Design

- **Один оранжевый акцент на экран** — primary Subscribe. Остальное slate/hairline. Submit a request
  — контрастная slate strong, заметная, НЕ оранжевая.
- **Permits/данные — IBM Plex Mono**, county-register вид. Masked-тизер — сигнатурный элемент.
- **Display — Barlow Condensed SemiBold**, sentence case. **Body — IBM Plex Sans.**
- **Без** house/roof силуэтов, storm-драмы, градиентов, glow, эмодзи. Иконки — Tabler outline / SVG.
- **Два голоса:** подрядчик-страницы — прямые, деньги/скорость. Homeowner — мягкие, человечные.
- **Honesty baked in:** нигде не обещать объём, которого нет. Live = roofing + solar в SF, реальные
  числа ($12K–$41K roofing, $24.6K solar median). Coming_soon — честные заглушки, без оплаты.
- **Category selects:** показывать все, coming_soon помечать и блокировать оплату/обещание.
- **Mobile:** sticky-шапка с обеими кнопками; формы одноколоночные; masked-таблица скроллится.
- **Формы:** consent НИКОГДА не пред-отмечен. Кнопки форм — slate. После submit `/request` —
  состояние «check inbox» (double opt-in), не redirect.

---

*Следующее: контентные страницы (How it works · About · Coverage · Contact). Юр-страницы — от юриста.
Данные реальны (SF roofing 821 / solar 98, выкачаны 28.06). Числа и тизер-строки — фактические.*
