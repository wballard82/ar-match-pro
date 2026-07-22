-- ARMP R3 · 0005 internal_role_assignments
-- Internal ARMP roles live in a protected table — NEVER in user-editable metadata.
create table internal_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  internal_role text not null
    check (internal_role in ('armp_owner','armp_operations_admin','armp_support','armp_sales_read_only')),
  status text not null default 'active' check (status in ('active','revoked')),
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger internal_roles_touch before update on internal_role_assignments
  for each row execute function armp.touch_updated_at();
