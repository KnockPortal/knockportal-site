Product decisions live outside this repository, in the project's canon documents. Nothing in this repo is a source of product truth.

# CLAUDE.md — KnockPortal site repository

Обсуждение ведётся на русском. Код, комментарии и строки интерфейса — на английском.

## Стек

Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase JS, Stripe. Тёмная тема, палитра и
шрифты — в `tailwind.config.ts` и `app/fonts.ts`. Дизайн-система описана в `DESIGN.md`.

## Команды

```
npm run dev     # next dev
npm run build   # next build
npm run start   # next start
npm run lint    # next lint
npx tsc --noEmit
```

`tools/refresh_data.sh` пересобирает `public/data/*.json`.

## Структура

- `app/` — App Router с двумя root layout. `app/(site)/` — маршруты сайта: `page.tsx`,
  `about/`, `contact/`, `privacy/`, `terms/`, `app/` (кабинет). `app/(surface)/` — рабочая
  поверхность. `app/api/webhooks/stripe/`, `app/globals.css`, `app/fonts.ts`,
  `app/favicon.ico` — вне групп.
- `components/layout/` — `StickyHeader.tsx`, `Footer.tsx`, `Section.tsx`.
  `components/sections/DottedBg.tsx` — фоновая сетка.
- `lib/` — `categories.ts`, `permit-data.ts`, `supabase-browser.ts`, `supabase-server.ts`,
  `surface.ts`, `demo-companies.json`, `utils.ts` (`cn`). Импорт по алиасу `@/`.
- `app/(surface)/` — рабочая поверхность продукта по адресу `/<city>/<trade>`; собственный
  root layout без обвязки сайта. Клиентский код поверхности — `public/assets/surface/page.js`
  и `page.css`, отдаются как статика с неизменёнными байтами. **На React не переписывать.**
  Персонализация — параметр `?from=<slug>`. `app/(site)/` — маршруты сайта с общим
  header/footer.
- `public/data/*.json` создаёт `tools/refresh_data.sh`. Вручную не редактировать.
- `supabase/migrations/` расходится с живой схемой. Источник истины — живая схема.
- `docs/logo-source/` — исходники логотипа.

## Конвенции

- `lib/supabase-server.ts` — service-role клиент, обходит RLS, только сервер.
- `lib/supabase-browser.ts` — publishable key, браузер.
- Классы Tailwind собирать через `cn()` из `lib/utils.ts`.
- Иконки — `lucide-react`, не эмодзи.

## Жёсткие правила

- Не подключаться к production-базе, не искать и не выводить credentials.
- Не применять миграции. SQL готовит и применяет владелец через Supabase SQL Editor.
- Не менять Stripe products/prices, cron, ключи; не запускать рассылки и печать.
- Секреты в репозиторий не попадают: `.env.local` в `.gitignore`.
- `git add`, `git commit`, `git push`, `ssh`, `scp`, `npm install` — только с явного
  разрешения владельца.
- Файлы не удалять без задания: устаревшее перемещать, а не затирать.
- При конфликте задания с кодом — спросить, а не домыслить.
