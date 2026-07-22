-- ARMP R3 · 0008a role helpers (depend on internal_role_assignments + memberships)
create or replace function armp.internal_role() returns text
language sql stable security definer set search_path = public as $$
  select ira.internal_role from internal_role_assignments ira
  where ira.user_id = auth.uid() and ira.status = 'active' limit 1
$$;
create or replace function armp.is_internal() returns boolean
language sql stable security definer set search_path = public as $$
  select armp.internal_role() is not null
$$;
create or replace function armp.is_ops_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select armp.internal_role() in ('armp_owner','armp_operations_admin')
$$;
create or replace function armp.member_org_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select m.organization_id from organization_memberships m
  where m.user_id = auth.uid() and m.status = 'active'
$$;
