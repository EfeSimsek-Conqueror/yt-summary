-- Per-user credit balance for video analysis. 1 credit = 3 minutes (180s) of video.

create table if not exists public.user_credits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  credits_remaining numeric(12, 4) not null default 5,
  updated_at timestamptz not null default now()
);

create index if not exists user_credits_updated_at_idx on public.user_credits (updated_at desc);

alter table public.user_credits enable row level security;

create policy "user_credits_select_own"
  on public.user_credits
  for select
  using (auth.uid() = user_id);

grant select on table public.user_credits to authenticated;

-- New signups: Scout starter credits
create or replace function public.handle_new_user_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_credits (user_id, credits_remaining)
  values (new.id, 5)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_credits on auth.users;
create trigger on_auth_user_created_credits
  after insert on auth.users
  for each row
  execute function public.handle_new_user_credits();

-- Backfill existing users (one-time)
insert into public.user_credits (user_id, credits_remaining)
select id, 5
from auth.users
where not exists (
  select 1 from public.user_credits uc where uc.user_id = auth.users.id
)
on conflict (user_id) do nothing;

-- Charge after analysis: proportional to duration (seconds / 180 = credits). Unknown/zero duration → 1 credit.
create or replace function public.deduct_analysis_credits(p_duration_seconds numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cost numeric(12, 4);
  v_remaining numeric(12, 4);
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_duration_seconds is null or p_duration_seconds <= 0 then
    v_cost := 1;
  else
    v_cost := round((p_duration_seconds::numeric / 180.0), 4);
    if v_cost < 0.0001 then
      v_cost := 0.0001;
    end if;
  end if;

  insert into public.user_credits (user_id, credits_remaining)
  values (v_uid, 5)
  on conflict (user_id) do nothing;

  select credits_remaining into v_remaining
  from public.user_credits
  where user_id = v_uid
  for update;

  if v_remaining is null then
    return jsonb_build_object('ok', false, 'error', 'no_balance_row');
  end if;

  if v_remaining < v_cost then
    return jsonb_build_object(
      'ok', false,
      'error', 'insufficient_credits',
      'required', v_cost,
      'remaining', v_remaining
    );
  end if;

  update public.user_credits
  set credits_remaining = credits_remaining - v_cost,
      updated_at = now()
  where user_id = v_uid;

  return jsonb_build_object(
    'ok', true,
    'deducted', v_cost,
    'remaining', v_remaining - v_cost
  );
end;
$$;

grant execute on function public.deduct_analysis_credits(numeric) to authenticated;
