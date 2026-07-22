-- ARMP R3 · 0009 Row-Level Security
-- Every protected table: RLS enabled, default deny. No customer-accessible
-- using(true)/with check(true) policy exists anywhere. Writes to protected
-- tables happen ONLY via Edge Functions using the service role (which bypasses
-- RLS by design); customer/anon clients get narrowly-scoped SELECTs at most.

alter table organizations            enable row level security;
alter table profiles                 enable row level security;
alter table organization_memberships enable row level security;
alter table internal_role_assignments enable row level security;
alter table pilot_entitlements       enable row level security;
alter table invitations              enable row level security;
alter table security_events          enable row level security;
alter table activation_events        enable row level security;
alter table admin_action_requests    enable row level security;

-- ── Column privileges: internal_notes is NEVER readable by client roles.
-- (Internal console reads notes exclusively through the service-role Edge
-- Function `list-operations-dashboard`.)
revoke all on organizations from anon, authenticated;
grant select (id, legal_name, display_name, status, approved_erp,
              approved_monthly_payment_line_range, primary_contact_name,
              primary_contact_email, customer_champion_name, customer_champion_email,
              maximum_pilot_seats, pilot_agreement_status, security_review_status,
              created_at, updated_at)
  on organizations to authenticated;

revoke all on profiles from anon, authenticated;
grant select on profiles to authenticated;
grant update (full_name) on profiles to authenticated;   -- only their own row via policy

revoke all on organization_memberships from anon, authenticated;
grant select on organization_memberships to authenticated;

revoke all on internal_role_assignments from anon, authenticated;
grant select on internal_role_assignments to authenticated;  -- rows gated by policy below

revoke all on pilot_entitlements from anon, authenticated;
grant select (id, organization_id, status, pilot_start_at, pilot_end_at,
              seat_limit, approved_features, approved_volume_range, created_at, updated_at)
  on pilot_entitlements to authenticated;   -- actor/revocation metadata not exposed

revoke all on invitations from anon, authenticated;
grant select on invitations to authenticated;            -- internal-only via policy

revoke all on security_events from anon, authenticated;
grant select on security_events to authenticated;        -- internal-only via policy

revoke all on activation_events from anon, authenticated;
grant select on activation_events to authenticated;      -- internal-only via policy

revoke all on admin_action_requests from anon, authenticated;
grant select on admin_action_requests to authenticated;  -- internal-only via policy

-- ── organizations: internal read all; customers read ONLY their member orgs
create policy org_internal_read on organizations for select
  using (armp.is_internal());
create policy org_member_read on organizations for select
  using (id in (select armp.member_org_ids()));

-- ── profiles: own row; internal read all; own-row update (full_name only via grant)
create policy profile_own_read on profiles for select
  using (user_id = auth.uid());
create policy profile_internal_read on profiles for select
  using (armp.is_internal());
create policy profile_own_update on profiles for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── memberships: own rows; org_admin reads own-org rows; internal read all
create policy membership_own_read on organization_memberships for select
  using (user_id = auth.uid());
create policy membership_orgadmin_read on organization_memberships for select
  using (exists (select 1 from organization_memberships me
                 where me.user_id = auth.uid() and me.status='active'
                   and me.customer_role='organization_admin'
                   and me.organization_id = organization_memberships.organization_id));
create policy membership_internal_read on organization_memberships for select
  using (armp.is_internal());

-- ── internal_role_assignments: internal users read own row; ops admins read all.
--    Customers: NO access. No client-role writes exist at all.
create policy internal_role_own_read on internal_role_assignments for select
  using (user_id = auth.uid() and armp.is_internal());
create policy internal_role_admin_read on internal_role_assignments for select
  using (armp.is_ops_admin());

-- ── pilot_entitlements: members read their org's entitlement; internal read all
create policy pilot_member_read on pilot_entitlements for select
  using (organization_id in (select armp.member_org_ids()));
create policy pilot_internal_read on pilot_entitlements for select
  using (armp.is_internal());

-- ── invitations / events / admin requests: INTERNAL ONLY
create policy invitations_internal_read on invitations for select
  using (armp.is_internal());
create policy security_events_internal_read on security_events for select
  using (armp.is_internal());
create policy activation_events_internal_read on activation_events for select
  using (armp.is_internal());
create policy admin_requests_internal_read on admin_action_requests for select
  using (armp.is_ops_admin());

-- NOTE deliberately absent: any INSERT/UPDATE/DELETE policy for anon or
-- authenticated on organizations, memberships, internal roles, entitlements,
-- invitations, or events. All mutations flow through service-role Edge
-- Functions with their own role/MFA/transition checks.
