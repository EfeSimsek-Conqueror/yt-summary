-- Stripe customer + subscription mirror for VidSum paid tiers (Navigator / Captain).

create table if not exists public.stripe_customers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.billing_subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_subscription_id text unique,
  plan_id text not null default 'scout'
    check (plan_id in ('scout', 'navigator', 'captain')),
  status text not null default 'inactive',
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists billing_subscriptions_status_idx
  on public.billing_subscriptions (status);

alter table public.stripe_customers enable row level security;
alter table public.billing_subscriptions enable row level security;

create policy "stripe_customers_select_own"
  on public.stripe_customers for select
  using (auth.uid() = user_id);

create policy "billing_subscriptions_select_own"
  on public.billing_subscriptions for select
  using (auth.uid() = user_id);

grant select on table public.stripe_customers to authenticated;
grant select on table public.billing_subscriptions to authenticated;
