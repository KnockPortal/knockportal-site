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

`tools/refresh_data.sh` пересобирает `public/data/*.json`; `tools/build_pages.py` генерирует
статические страницы `public/sf/` из `tools/_template.html`.

## Структура

- `app/` — маршруты App Router: `page.tsx`, `about/`, `contact/`, `privacy/`, `terms/`,
  `app/` (кабинет), `api/webhooks/stripe/`.
- `components/layout/` — `StickyHeader.tsx`, `Footer.tsx`, `Section.tsx`.
  `components/sections/DottedBg.tsx` — фоновая сетка.
- `lib/` — `categories.ts`, `permit-data.ts`, `supabase-browser.ts`, `supabase-server.ts`,
  `utils.ts` (`cn`). Импорт по алиасу `@/`.
- `public/sf.html` и `public/sf/<slug>.html` — статические страницы вне Next layout, доступны
  по `/sf` и `/sf/<slug>` через `rewrites()` в `next.config.mjs`. На React не переписывать.
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
