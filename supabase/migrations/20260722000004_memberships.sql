-- ARMP R3 · 0004 organization_memberships
create table organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_role text not null
    check (customer_role in ('organization_admin','cash_application_manager',
                             'cash_application_analyst','reviewer','read_only')),
  status text not null default 'active' check (status in ('active','disabled','revoked')),
  invited_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)              -- duplicate-membership prevention
);
create trigger memberships_touch before update on organization_memberships
  for each row execute function armp.touch_updated_at();
create index memberships_user_idx on organization_memberships(user_id) where status='active';
create index memberships_org_idx on organization_memberships(organization_id);
