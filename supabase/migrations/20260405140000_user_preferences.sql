-- User preferences for analysis language, auto-analyze, spoiler protection, etc.

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  analysis_language text not null default 'en',
  auto_analyze boolean not null default true,
  spoiler_protection boolean not null default true,
  default_summary_view text not null default 'detailed',
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

create policy "user_preferences_select_own"
  on public.user_preferences
  for select
  using (auth.uid() = user_id);

create policy "user_preferences_upsert_own"
  on public.user_preferences
  for insert
  with check (auth.uid() = user_id);

create policy "user_preferences_update_own"
  on public.user_preferences
  for update
  using (auth.uid() = user_id);

grant select, insert, update on table public.user_preferences to authenticated;

-- Seed default row on signup (same pattern as user_credits)
create or replace function public.handle_new_user_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_preferences on auth.users;
create trigger on_auth_user_created_preferences
  after insert on auth.users
  for each row
  execute function public.handle_new_user_preferences();

-- Backfill existing users
insert into public.user_preferences (user_id)
select id from auth.users
where not exists (
  select 1 from public.user_preferences up where up.user_id = auth.users.id
)
on conflict (user_id) do nothing;
