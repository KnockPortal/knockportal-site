# KnockPortal — Stripe payment links (для Claude Design)
## Точные URL для кнопок оплаты на /pricing

> Source of truth: Stripe vault (`session-summary-stripe-okno.md`).
> Product `prod_UmjQUSLaVBFtpn`, account `acct_1TmNyyCLmZAjrLym`, descriptor `KNOCKPORTAL`.
> Только эти 4 цены используются на сайте Phase 0 (тарифы Registry / Registry+Presence).
> Кнопки = простые `<a href="...">` (Buy Button не нужен). `BillingToggle` переключает monthly↔yearly URL.

## Registry — $99/mo · $990/yr

| Период | Кнопка ведёт на |
|---|---|
| Monthly $99 | https://buy.stripe.com/7sYeVcaA1c6j2dc7Sq2wU0f |
| Yearly $990 | https://buy.stripe.com/6oU3cudMd2vJ6ts8Wu2wU07 |

## Registry + Presence — $149/mo · $1,490/yr

| Период | Кнопка ведёт на |
|---|---|
| Monthly $149 | https://buy.stripe.com/6oUbJ0aA14DR1985Ki2wU0e |
| Yearly $1,490 | https://buy.stripe.com/00weVcfUl6LZ4lkfkS2wU06 |

## Правила использования (для Claude Design)
- Кнопки `Subscribe` на `/pricing` и в `PlanCard` ведут **строго на эти URL** (не плейсхолдеры).
- `BillingToggle` (Monthly | Yearly): переключает оба значения и оба URL соответствующего тарифа.
- На checkout уходят **только live-категории** (roofing / solar). Если в `CategorySelect` выбрана
  `coming_soon`-категория — НЕ вести на Stripe, а в waitlist-ветку (email-сбор), как в content-doc.
- Эти ссылки публичны по своей природе (Stripe payment links) — их можно вставлять в клиентский
  HTML. Секретный `sk_live` НИКОГДА не используется на фронте (только сервер/webhook — это dev, не дизайн).
- Statement descriptor для подписок = `KNOCKPORTAL` (уже настроен в Stripe, на сайте действий не требует).

*Эти 4 URL — единственное, что нужно Claude Design от Stripe. Остальное (webhook→Supabase активация,
sk_live, payout) — бэкенд, вне дизайн-задачи.*
