# KnockPortal — handoff для Claude Code (продакшн-сборка сайта)

ENTRY POINT: **KnockPortal-ClaudeCode-build-brief-v1.md** — вставь как стартовое задание.

В этой папке (source of truth):
- KnockPortal-ClaudeCode-build-brief-v1.md  — задание на сборку Next.js с нуля
- DESIGN.md                                  — ОБНОВЛЁН под dark-first (dispatch hero, телеметрия, консоль, light/dark правило)
- KnockPortal-pages-content-v1.1.md          — блоки + утверждённый копи + формы
- KnockPortal-site-spec-v1.md                — продуктовое ТЗ (роуты, БД, потоки, email B2)
- stripe-links.md                            — 4 реальных URL цен для /pricing + правило toggle/гейтинга
- STRIPE_BRANDING.md                         — Stripe-поверхности (+ Buy Button, если понадобится)
- KnockPortal-Website-Project-Brief.md       — общий онбординг проекта
- logo/                                       — лого (на тёмном сайте — on-dark варианты)

ТЫ ДОБАВЛЯЕШЬ СВЕРХУ (нет в этой папке):
1. `KnockPortal - standalone.html` — ТЁМНАЯ сборка от Claude Design = пиксельный эталон. Без него Code не увидит цель.
2. (опц.) скриншот dispatch-hero как референс.

Не клади старый ClaudeDesign-бриф и старый светлый DESIGN.md — они заменены.
