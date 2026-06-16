create table if not exists public.gm_user_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by_device text not null
);

alter table public.gm_user_states enable row level security;

revoke all on table public.gm_user_states from anon;
grant select, insert, update on table public.gm_user_states to authenticated;

drop policy if exists "GM users can read their own state" on public.gm_user_states;
create policy "GM users can read their own state"
on public.gm_user_states for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "GM users can insert their own state" on public.gm_user_states;
create policy "GM users can insert their own state"
on public.gm_user_states for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "GM users can update their own state" on public.gm_user_states;
create policy "GM users can update their own state"
on public.gm_user_states for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
