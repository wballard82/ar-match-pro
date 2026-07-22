-- ARMP R3 · 0006 pilot_entitlements (one active entitlement per organization)
create table pilot_entitlements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','approved','active','suspended','completed','revoked')),
  pilot_start_at timestamptz,
  pilot_end_at timestamptz,
  seat_limit int not null default 5 check (seat_limit between 1 and 100),
  approved_features jsonb not null default '{}'::jsonb,
  approved_volume_range text,
  activated_by uuid references auth.users(id) on delete set null,
  activated_at timestamptz,
  suspended_by uuid references auth.users(id) on delete set null,
  suspended_at timestamptz,
  completed_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revocation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pilot_dates_valid check (
    pilot_start_at is null or pilot_end_at is null or pilot_end_at > pilot_start_at
  )
);
create unique index pilot_one_live_per_org on pilot_entitlements(organization_id)
  where status in ('pending','approved','active','suspended');
create trigger pilot_entitlements_touch before update on pilot_entitlements
  for each row execute function armp.touch_updated_at();
create index pilot_org_idx on pilot_entitlements(organization_id);
