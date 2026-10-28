-- Run once in the Supabase SQL Editor after confirming that
-- public.marketplace_settings does not already exist and that
-- private.is_admin() securely checks the current auth.uid().

begin;

create table public.marketplace_settings (
  id smallint primary key default 1 check (id = 1),
  currency_code text not null default 'EUR'
    check (currency_code ~ '^[A-Z]{3}$')
);

insert into public.marketplace_settings (id, currency_code)
values (1, 'EUR');

alter table public.marketplace_settings enable row level security;

revoke all privileges on table public.marketplace_settings
  from public, anon, authenticated;

grant select on table public.marketplace_settings to anon, authenticated;
grant update (currency_code) on table public.marketplace_settings to authenticated;

grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

create policy marketplace_settings_public_read
  on public.marketplace_settings
  for select
  to anon, authenticated
  using (true);

create policy marketplace_settings_admin_update
  on public.marketplace_settings
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

commit;

-- The admin page also calls the existing public.is_admin() RPC before showing
-- its dashboard. Verify that it exists and securely delegates to
-- private.is_admin(); this migration intentionally does not replace it.
