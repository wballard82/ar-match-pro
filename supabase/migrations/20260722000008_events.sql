-- ARMP R3 · 0008 security_events, activation_events, admin_action_requests
-- NONFINANCIAL events only — never file contents, amounts, invoice details, or match data.
create table security_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references organizations(id) on delete set null,
  occurred_at timestamptz not null default now(),
  result text not null default 'success' check (result in ('success','failure','denied')),
  source text not null default 'edge_function',
  request_id uuid not null default gen_random_uuid(),
  nonfinancial_metadata jsonb not null default '{}'::jsonb
);
create index security_events_org_idx on security_events(organization_id, occurred_at desc);
create index security_events_actor_idx on security_events(actor_user_id, occurred_at desc);

create table activation_events (
  id bigint generated always as identity primary key,
  organization_id uuid references organizations(id) on delete set null,
  event text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  request_id uuid not null default gen_random_uuid(),
  detail jsonb not null default '{}'::jsonb
);
create index activation_events_org_idx on activation_events(organization_id, occurred_at desc);

-- Dual-control requests (e.g., MFA resets): requested by one internal user,
-- completed by another.
create table admin_action_requests (
  id uuid primary key default gen_random_uuid(),
  action_type text not null check (action_type in ('mfa_reset')),
  target_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'requested'
    check (status in ('requested','completed','canceled','expired')),
  requested_by uuid not null references auth.users(id) on delete cascade,
  completed_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz not null default now() + interval '24 hours',
  constraint distinct_completer check (completed_by is null or completed_by <> requested_by)
);
create index admin_requests_status_idx on admin_action_requests(status, requested_at desc);
