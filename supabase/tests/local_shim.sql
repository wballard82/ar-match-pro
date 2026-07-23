-- ARMP local RLS test shim — replicates the Supabase runtime surface the
-- migrations depend on, so they apply and RLS tests run against REAL Postgres.
-- (Staging uses Supabase's own auth schema; this shim exists ONLY in the local
-- test database and is never deployed.)

-- Supabase client roles FIRST: a bare postgres:16 container has none of these,
-- and every grant below references them. (Supabase's own instances ship with
-- them pre-created, which is why this ordering only bites in clean CI.)
do $$ begin
  if not exists (select from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique
);
-- auth.uid()/auth.jwt() read per-session GUCs exactly as Supabase's do (JWT claims).
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant all on auth.users to service_role;
create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
