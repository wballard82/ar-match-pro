-- ARMP R3 · 0003 profiles (1:1 with auth.users)
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  business_email text not null unique,
  account_status text not null default 'invited'
    check (account_status in ('invited','active','disabled','revoked')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on profiles
  for each row execute function armp.touch_updated_at();
create index profiles_status_idx on profiles(account_status);
