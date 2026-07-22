-- ARMP R3 · RLS test suite (real Postgres, real policies)
-- Simulates Supabase client roles + JWT claims via SET ROLE + set_config,
-- exactly as PostgREST does. Every assertion prints PASS/FAIL.
\set ON_ERROR_STOP off
\pset pager off
create or replace function _assert(descr text, cond boolean) returns void language plpgsql as $$
begin raise notice '%  %', case when cond then 'PASS' else 'FAIL <<<' end, descr; end $$;

-- helper: become a given user (authenticated) or anon
create or replace function _as_user(u uuid, aal text default 'aal2') returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(u::text,''), false);
  perform set_config('request.jwt.claims', json_build_object('sub',u,'aal',aal)::text, false);
end $$;
create or replace function _try_count(q text) returns int language plpgsql as $$
declare n int; begin execute q into n; return n; exception when others then return -1; end $$;

-- ── Seed via service_role (bypasses RLS, like Edge Functions do) ──
set role service_role;
-- two orgs, two customer users, one internal ops admin
insert into auth.users(id,email) values
  ('11111111-1111-1111-1111-111111111111','ownerA@corpa.com'),
  ('22222222-2222-2222-2222-222222222222','userB@corpb.com'),
  ('99999999-9999-9999-9999-999999999999','ops@armatchpro.com');
insert into organizations(id,legal_name,display_name,status,internal_notes,created_by) values
  ('aaaaaaaa-0000-0000-0000-000000000000','Corp A LLC','Corp A','pilot_active','SECRET A NOTE',null),
  ('bbbbbbbb-0000-0000-0000-000000000000','Corp B LLC','Corp B','pilot_active','SECRET B NOTE',null);
insert into profiles(user_id,full_name,business_email,account_status) values
  ('11111111-1111-1111-1111-111111111111','Owner A','ownerA@corpa.com','active'),
  ('22222222-2222-2222-2222-222222222222','User B','userB@corpb.com','active'),
  ('99999999-9999-9999-9999-999999999999','Ops','ops@armatchpro.com','active');
insert into organization_memberships(organization_id,user_id,customer_role,status) values
  ('aaaaaaaa-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111111','organization_admin','active'),
  ('bbbbbbbb-0000-0000-0000-000000000000','22222222-2222-2222-2222-222222222222','cash_application_manager','active');
insert into internal_role_assignments(user_id,internal_role,status) values
  ('99999999-9999-9999-9999-999999999999','armp_operations_admin','active');
insert into pilot_entitlements(organization_id,status,pilot_start_at,pilot_end_at,seat_limit) values
  ('aaaaaaaa-0000-0000-0000-000000000000','active',now()-interval '1 day',now()+interval '20 days',5),
  ('bbbbbbbb-0000-0000-0000-000000000000','active',now()-interval '1 day',now()+interval '20 days',5);
insert into invitations(organization_id,email,intended_role,status,expires_at) values
  ('aaaaaaaa-0000-0000-0000-000000000000','new@corpa.com','reviewer','pending',now()+interval '3 days');
reset role;

-- ══ ANONYMOUS: cannot read any protected table ══
set role anon;
select _as_user(null);
select _assert('anon cannot read organizations', _try_count('select count(*) from organizations') <= 0);
select _assert('anon cannot read profiles', _try_count('select count(*) from profiles') <= 0);
select _assert('anon cannot read memberships', _try_count('select count(*) from organization_memberships') <= 0);
select _assert('anon cannot read pilot_entitlements', _try_count('select count(*) from pilot_entitlements') <= 0);
select _assert('anon cannot read invitations', _try_count('select count(*) from invitations') <= 0);
select _assert('anon cannot read internal_role_assignments', _try_count('select count(*) from internal_role_assignments') <= 0);
select _assert('anon cannot read security_events', _try_count('select count(*) from security_events') <= 0);
reset role;

-- ══ CUSTOMER A: org isolation ══
set role authenticated;
select _as_user('11111111-1111-1111-1111-111111111111');
select _assert('customer A sees exactly 1 org (own)', _try_count('select count(*) from organizations') = 1);
select _assert('customer A sees own org only', _try_count($$select count(*) from organizations where display_name='Corp A'$$) = 1);
select _assert('customer A CANNOT see Corp B', _try_count($$select count(*) from organizations where display_name='Corp B'$$) = 0);
select _assert('customer A cannot read internal_role_assignments', _try_count('select count(*) from internal_role_assignments') = 0);
select _assert('customer A cannot read invitations', _try_count('select count(*) from invitations') = 0);
select _assert('customer A cannot read security_events', _try_count('select count(*) from security_events') = 0);
select _assert('customer A sees own org entitlement', _try_count($$select count(*) from pilot_entitlements$$) = 1);
-- write attempts must fail (no policy grants them)
select _assert('customer A CANNOT update pilot dates',
  _try_count($$with u as (update pilot_entitlements set pilot_end_at=now()+interval '999 days' where true returning 1) select count(*) from u$$) <= 0);
select _assert('customer A CANNOT activate a pilot (update status)',
  _try_count($$with u as (update pilot_entitlements set status='active' where true returning 1) select count(*) from u$$) <= 0);
select _assert('customer A CANNOT insert internal role',
  _try_count($$with i as (insert into internal_role_assignments(user_id,internal_role) values ('11111111-1111-1111-1111-111111111111','armp_owner') returning 1) select count(*) from i$$) <= 0);
select _assert('customer A CANNOT change own membership role',
  _try_count($$with u as (update organization_memberships set customer_role='organization_admin' where user_id='11111111-1111-1111-1111-111111111111' returning 1) select count(*) from u$$) <= 0);
reset role;

-- ══ CUSTOMER B: cannot reach A ══
set role authenticated;
select _as_user('22222222-2222-2222-2222-222222222222');
select _assert('customer B CANNOT read Corp A', _try_count($$select count(*) from organizations where display_name='Corp A'$$) = 0);
select _assert('customer B CANNOT update Corp A',
  _try_count($$with u as (update organizations set display_name='hacked' where display_name='Corp A' returning 1) select count(*) from u$$) <= 0);
reset role;

-- ══ MFA gate: authorize_pilot_session ══
set role authenticated;
select _as_user('11111111-1111-1111-1111-111111111111','aal1');
select _assert('AAL1 (no MFA) is NOT authorized for real data',
  (select (authorize_pilot_session()->>'authorized')::boolean) = false);
select _as_user('11111111-1111-1111-1111-111111111111','aal2');
select _assert('AAL2 active pilot IS authorized',
  (select (authorize_pilot_session()->>'authorized')::boolean) = true);
reset role;

-- ══ INTERNAL ops admin: can read internal tables ══
set role authenticated;
select _as_user('99999999-9999-9999-9999-999999999999');
select _assert('ops admin reads BOTH orgs', _try_count('select count(*) from organizations') = 2);
select _assert('ops admin reads invitations', _try_count('select count(*) from invitations') = 1);
select _assert('ops admin reads internal roles', _try_count('select count(*) from internal_role_assignments') >= 1);
reset role;

-- ══ internal_notes never column-readable by customer ══
set role authenticated;
select _as_user('11111111-1111-1111-1111-111111111111');
select _assert('customer A CANNOT select internal_notes column',
  _try_count('select count(internal_notes) from organizations') = -1);
reset role;
