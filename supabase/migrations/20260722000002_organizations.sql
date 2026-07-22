-- ARMP R3 · 0002 organizations
create table organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text not null,
  approved_domains text[] not null default '{}',
  status text not null default 'lead'
    check (status in ('lead','pilot_pending','pilot_approved','pilot_active','pilot_suspended',
                      'pilot_completed','contract_pending','active','past_due','terminated')),
  approved_erp text check (approved_erp in ('sap','netsuite','sap_and_netsuite') or approved_erp is null),
  approved_monthly_payment_line_range text,
  primary_contact_name text,
  primary_contact_email text,
  customer_champion_name text,
  customer_champion_email text,
  armp_owner_user_id uuid references auth.users(id) on delete set null,
  maximum_pilot_seats int not null default 5 check (maximum_pilot_seats between 1 and 100),
  pilot_agreement_status text not null default 'not_sent'
    check (pilot_agreement_status in ('not_sent','sent','signed','expired')),
  security_review_status text not null default 'not_started'
    check (security_review_status in ('not_started','in_progress','complete','waived')),
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);
create trigger organizations_touch before update on organizations
  for each row execute function armp.touch_updated_at();
create index organizations_status_idx on organizations(status);
