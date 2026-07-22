-- ARMP R3 · 0001 helpers (table-independent only; role helpers live in 0009a
-- after their tables exist)
create schema if not exists armp;
revoke all on schema armp from public;
grant usage on schema armp to authenticated;

create or replace function armp.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create or replace function armp.session_aal() returns text
language sql stable as $$
  select coalesce(auth.jwt()->>'aal', 'aal1')
$$;
