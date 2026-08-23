# CLAUDE.md — KnockPortal site repository

Обсуждение ведётся на русском. Код, комментарии и строки интерфейса — на английском.

## Актуальная модель продукта (август 2026)

KnockPortal — маркетинговое рабочее место для жилого подрядчика в San Francisco. Сервис
показывает актуальную городскую картину выданных разрешений, обрабатывает её в динамические
кластеры и даёт подрядчику инструменты самому выбрать районы и запустить postcard campaign
либо подготовить список обхода. KnockPortal не назначает территорию, не скорит дома как
«лиды» и не обещает заказов.

## Снятые модели — не восстанавливать

- daily/weekly permit registry как продукт;
- тарифы `Registry $99/mo` и `Registry + Presence $149/mo`;
- Presence и homeowner dispatch как действующая функция;
- DFW и любые метро кроме San Francisco;
- storm-first позиционирование;
- отдельный постоянный URL кабинета на каждого клиента;
- формулировка «postcards printed at cost — we don't mark them up».

Если файл репозитория противоречит этому списку — прав этот файл, а не он.

## Устаревшие документы

`docs/_legacy/` — исторические брифы, спеки и пиксельный эталон снятой модели. Сохранены как
история, источником требований не являются.

`DESIGN.md` действует только как дизайн-система: палитра, типографика, тёмная тема. Его
описание продукта в первых строках устарело.

Актуальный канон живёт вне репозитория, в Project Knowledge владельца (`KP_CONCEPT.md`,
`KP_DECISIONS.md`, `KP_FACTS.md`, `KP_RUNBOOK.md`, `KP_STATE.md`). При конфликте задания с
кодом — спросить, а не домыслить.

## Архитектура

- Next.js 14 App Router, TypeScript, Tailwind. Тёмная тема, палитра в `tailwind.config.ts`.
- `/sf` и `/sf/<slug>` — статические HTML в `public/`, вне Next layout, через rewrites в
  `next.config.mjs`. Генерируются `tools/build_pages.py` из `tools/_template.html`. На React
  не переписывать.
- `public/data/*.json` создаёт `tools/refresh_data.sh`. Вручную не редактировать.
- `/app` — единый кабинет. Авторизация — шестизначный email OTP через Supabase Auth. Без
  паролей и без magic links: корпоративные сканеры гасят одноразовые ссылки.
- `lib/supabase-server.ts` — service-role клиент, обходит RLS, только сервер.
- `lib/supabase-browser.ts` — publishable key, браузер.
- Stripe — истина о деньгах. Supabase — истина о продуктовых данных.

## Жёсткие правила

- Не подключаться к production-базе, не искать и не выводить credentials.
- Не применять миграции. SQL готовит и применяет владелец через Supabase SQL Editor.
- `supabase/migrations/` расходится с живой схемой. Источник истины — живая схема.
- Не менять Stripe products/prices, cron, ключи; не запускать рассылки и печать.
- Секреты в репозиторий не попадают: `.env.local` в `.gitignore`.
- `git add`, `git commit`, `git push`, `ssh`, `scp`, `npm install` — только с явного
  разрешения владельца.
- Файлы не удалять: устаревшее перемещать в `docs/_legacy/`.
