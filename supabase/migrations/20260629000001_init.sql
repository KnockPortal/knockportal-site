-- KnockPortal v1 schema
-- Apply via: supabase db push  OR paste into Supabase SQL editor

-- ============ METROS ============
create table public.metros (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  name             text not null,
  state            text not null,
  status           text not null default 'coming_soon'
                     check (status in ('live','coming_soon')),
  data_source      text,
  source_base_url  text,
  source_dataset   text,
  zone_field       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ============ METRO CAPABILITIES ============
create table public.metro_capabilities (
  metro_id          uuid primary key references public.metros(id) on delete cascade,
  has_registry      boolean not null default false,
  has_owner_name    boolean not null default false,
  has_owner_contact boolean not null default false,
  has_roof_age      boolean not null default false,
  has_storm_layer   boolean not null default false,
  updated_at        timestamptz not null default now()
);

-- ============ PLANS ============
-- Price lives here, never on the metro.
-- "Plans available in metro M" = plans whose requires_capabilities ⊆ M's enabled flags.
create table public.plans (
  id                     uuid primary key default gen_random_uuid(),
  key                    text not null unique,
  name                   text not null,
  price_monthly          integer not null,  -- cents
  price_yearly           integer,           -- cents
  stripe_price_monthly   text,              -- Stripe price id
  stripe_price_yearly    text,
  requires_capabilities  text[] not null default '{}',
  active                 boolean not null default true,
  sort_order             integer not null default 0
);

-- ============ PERMITS ============
create table public.permits (
  id                  uuid primary key default gen_random_uuid(),
  metro_id            uuid not null references public.metros(id) on delete cascade,
  source_permit_id    text not null,
  category            text not null,
  description         text,
  status              text,
  issued_date         date,
  estimated_cost      numeric,
  zone                text,
  zip                 text,
  street_masked       text,
  street_full         text,
  supervisor_district text,
  owner_name          text,
  owner_mailing       text,
  system_size         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (metro_id, source_permit_id)
);
create index permits_metro_cat_date_idx
  on public.permits (metro_id, category, issued_date desc);

-- ============ PERMIT RAW (append-only) ============
create table public.permit_raw (
  id               bigint generated always as identity primary key,
  metro_id         uuid not null references public.metros(id) on delete cascade,
  source_permit_id text not null,
  fetched_at       timestamptz not null default now(),
  raw              jsonb not null
);

-- ============ LEADS ============
create table public.leads (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  audience            text not null check (audience in ('contractor','homeowner')),
  category            text not null,
  category_status     text not null check (category_status in ('live','coming_soon')),
  metro_id            uuid references public.metros(id),
  zones               text[] not null default '{}',
  email               text not null,
  name                text,
  company             text,
  message             text,
  consent             boolean not null default false,
  consent_at          timestamptz,
  consent_version     text,
  opt_in_status       text not null default 'pending'
                        check (opt_in_status in ('pending','confirmed')),
  opt_in_token        text,
  opt_in_confirmed_at timestamptz,
  source              text,
  user_agent          text,
  referer             text,
  raw                 jsonb
);
create index leads_cat_status_idx on public.leads (category, category_status, created_at);

-- ============ CUSTOMERS (Stripe mirror) ============
create table public.customers (
  id                 uuid primary key default gen_random_uuid(),
  stripe_customer_id text not null unique,
  email              text,
  name               text,
  created_at         timestamptz not null default now()
);

-- ============ SUBSCRIPTIONS (Stripe mirror, status-driven) ============
create table public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  customer_id            uuid references public.customers(id) on delete set null,
  stripe_subscription_id text not null unique,
  stripe_price_id        text,
  plan_key               text,
  status                 text not null,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ============ SUBSCRIPTION ↔ METROS (m2m) ============
create table public.subscription_metros (
  subscription_id uuid references public.subscriptions(id) on delete cascade,
  metro_id        uuid references public.metros(id) on delete cascade,
  primary key (subscription_id, metro_id)
);

-- ============ WEBHOOK EVENTS (idempotency ledger) ============
create table public.webhook_events (
  stripe_event_id text primary key,
  type            text not null,
  received_at     timestamptz not null default now(),
  processed_at    timestamptz,
  status          text not null default 'received'
                    check (status in ('received','processed','error'))
);

-- ============ RLS — lock everything ============
-- All reads/writes go through the server (service role bypasses RLS).
-- Per-user policies arrive with Supabase Auth in build-order layer 4.
alter table public.metros               enable row level security;
alter table public.metro_capabilities   enable row level security;
alter table public.plans                enable row level security;
alter table public.permits              enable row level security;
alter table public.permit_raw           enable row level security;
alter table public.leads                enable row level security;
alter table public.customers            enable row level security;
alter table public.subscriptions        enable row level security;
alter table public.subscription_metros  enable row level security;
alter table public.webhook_events       enable row level security;

-- ============ SEED ============
insert into public.metros (slug, name, state, status, data_source, source_base_url, source_dataset, zone_field)
values (
  'san-francisco',
  'San Francisco',
  'CA',
  'live',
  'socrata',
  'https://data.sfgov.org',
  'i98e-djp9',
  'neighborhoods_analysis_boundaries'
);

insert into public.metro_capabilities (metro_id, has_registry)
select id, true from public.metros where slug = 'san-francisco';

-- Fill stripe_price_* with real price IDs from the Stripe dashboard before applying.
insert into public.plans (key, name, price_monthly, price_yearly, stripe_price_monthly, stripe_price_yearly, requires_capabilities, active, sort_order)
values (
  'registry',
  'Registry',
  14900,
  149000,
  '<price_monthly_149>',
  '<price_yearly_1490>',
  '{has_registry}',
  true,
  1
);
