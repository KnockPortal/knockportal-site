-- KnockPortal v2 schema — plans, Presence capability, lead telemetry
-- Apply AFTER 20260629000001_init.sql, via: supabase db push  OR the Supabase SQL editor.
--
-- REVIEW BEFORE APPLYING. Two things need your hand:
--   1. Replace every <PRICE_ID_FROM_VAULT> with the real Stripe price id (each line notes
--      its Stripe lookup_key so you paste the right one).
--   2. Decide whether San Francisco gets has_homeowner_flow enabled (see section b).
-- This file is written to be idempotent — safe to run more than once.

begin;

-- ============ (a) PLANS ============
-- Price lives on the plan, never on the metro.
-- "Plans available in metro M" = plans whose requires_capabilities ⊆ M's enabled flags.
--
-- Upsert by `key` so this also RECONCILES the placeholder 'registry' row seeded in the
-- init migration (which carried $149 pricing) down to the correct $99 Registry pricing,
-- and adds the $149 Registry + Presence tier.
insert into public.plans
  (key, name, price_monthly, price_yearly, stripe_price_monthly, stripe_price_yearly, requires_capabilities, active, sort_order)
values
  -- Registry — $99/mo, $990/yr. Requires only the registry capability.
  ('registry', 'Registry', 9900, 99000,
   'price_1TnA4ECLmZAjrLymkCIP7Dbw',   -- Stripe price id — lookup_key: monthly_99
   'price_1TnAD4CLmZAjrLymVaqEBbNS',   -- Stripe price id — lookup_key: yearly_990
   '{has_registry}', true, 1),

  -- Registry + Presence — $149/mo, $1490/yr. Requires the homeowner flow on top of registry.
  ('presence', 'Registry + Presence', 14900, 149000,
   'price_1TnA4bCLmZAjrLymDBz61gTK',   -- Stripe price id — lookup_key: monthly_149
   'price_1TnADjCLmZAjrLymI3vKd3Ye',   -- Stripe price id — lookup_key: yearly_1490
   '{has_registry,has_homeowner_flow}', true, 2)
on conflict (key) do update set
  name                  = excluded.name,
  price_monthly         = excluded.price_monthly,
  price_yearly          = excluded.price_yearly,
  stripe_price_monthly  = excluded.stripe_price_monthly,
  stripe_price_yearly   = excluded.stripe_price_yearly,
  requires_capabilities = excluded.requires_capabilities,
  active                = excluded.active,
  sort_order            = excluded.sort_order;

-- ============ (b) PRESENCE CAPABILITY — homeowner flow ============
-- New capability flag on the metro capability layer. Presence (above) requires it, so a
-- metro can only offer Presence once this is true for that metro.
alter table public.metro_capabilities
  add column if not exists has_homeowner_flow boolean not null default false;

-- San Francisco is intentionally left with has_homeowner_flow = false here: the
-- homeowner request → contractor match flow is not live yet (that lands in A4). Flipping
-- this on makes Presence purchasable/available in SF, so it's a deliberate go-live switch,
-- not a schema default. Uncomment when the flow is actually shipped:
--
-- update public.metro_capabilities
--    set has_homeowner_flow = true, updated_at = now()
--  where metro_id = (select id from public.metros where slug = 'san-francisco');

-- ============ (c) LEAD ACTIONS — contractor outreach telemetry ============
-- Foundation-level funnel telemetry: which subscriber acted on which permit, and how far
-- it got (contacted → quoted → won). Not a user-facing feature; the data model comes first.
--
-- subscriber_id references public.customers (the durable contractor identity) rather than
-- public.subscriptions, so telemetry survives subscription churn/renewal. If you'd rather
-- anchor to the subscription instance, swap the reference below before applying.
create table if not exists public.lead_actions (
  id            uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.customers(id) on delete cascade,
  permit_id     uuid not null references public.permits(id)   on delete cascade,
  status        text not null default 'contacted'
                  check (status in ('contacted','quoted','won')),
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- One action row per (subscriber, permit); status advances in place.
  unique (subscriber_id, permit_id)
);
create index if not exists lead_actions_subscriber_idx
  on public.lead_actions (subscriber_id, status, updated_at desc);
create index if not exists lead_actions_permit_idx
  on public.lead_actions (permit_id);

-- Lock it down like every other table — all access goes through the server (service role
-- bypasses RLS). Per-user policies arrive with Supabase Auth in build-order layer 4.
alter table public.lead_actions enable row level security;

commit;
