-- ARMP R3 · 0007 invitations (admin metadata; raw tokens are NEVER stored —
-- Supabase Auth invite/OTP mechanics carry the token; we keep audit metadata only)
create table invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  intended_role text not null
    check (intended_role in ('organization_admin','cash_application_manager',
                             'cash_application_analyst','reviewer','read_only')),
  status text not null default 'pending'
    check (status in ('pending','accepted','expired','revoked')),
  expires_at timestamptz not null,
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitation_expiry_future check (expires_at > created_at)
);
-- duplicate-invitation prevention: one live pending invite per org+email
create unique index invitations_pending_unique on invitations(organization_id, lower(email))
  where status = 'pending';
create trigger invitations_touch before update on invitations
  for each row execute function armp.touch_updated_at();
create index invitations_org_idx on invitations(organization_id);
create index invitations_email_idx on invitations(lower(email));
