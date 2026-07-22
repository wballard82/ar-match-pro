-- ARMP R3 · 0010 allowed-state-transition validation + seat-limit enforcement
-- Enforced at the database layer so even service-role code cannot make an
-- illegal transition by accident.

create or replace function armp.validate_org_transition() returns trigger
language plpgsql as $$
declare ok boolean;
begin
  if old.status = new.status then return new; end if;
  ok := case old.status
    when 'lead'            then new.status in ('pilot_pending','terminated')
    when 'pilot_pending'   then new.status in ('pilot_approved','terminated')
    when 'pilot_approved'  then new.status in ('pilot_active','terminated')
    when 'pilot_active'    then new.status in ('pilot_suspended','pilot_completed','terminated')
    when 'pilot_suspended' then new.status in ('pilot_active','pilot_completed','terminated')
    when 'pilot_completed' then new.status in ('contract_pending','terminated')
    when 'contract_pending'then new.status in ('active','terminated')
    when 'active'          then new.status in ('past_due','terminated')
    when 'past_due'        then new.status in ('active','terminated')
    else false  -- terminated is terminal
  end;
  if not ok then
    raise exception 'ARMP_INVALID_TRANSITION: organization % -> %', old.status, new.status
      using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger org_transition_guard before update of status on organizations
  for each row execute function armp.validate_org_transition();

create or replace function armp.validate_pilot_transition() returns trigger
language plpgsql as $$
declare ok boolean;
begin
  if old.status = new.status then return new; end if;
  ok := case old.status
    when 'pending'   then new.status in ('approved','revoked')
    when 'approved'  then new.status in ('active','revoked')
    when 'active'    then new.status in ('suspended','completed','revoked')
    when 'suspended' then new.status in ('active','completed','revoked')
    else false  -- completed / revoked are terminal
  end;
  if not ok then
    raise exception 'ARMP_INVALID_TRANSITION: pilot % -> %', old.status, new.status
      using errcode = 'P0001';
  end if;
  -- Activation requires valid dates
  if new.status = 'active' and (new.pilot_start_at is null or new.pilot_end_at is null) then
    raise exception 'ARMP_PILOT_DATES_REQUIRED' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger pilot_transition_guard before update of status on pilot_entitlements
  for each row execute function armp.validate_pilot_transition();

-- Seat-limit enforcement: an ACTIVE membership cannot be created/re-enabled
-- beyond the org's live entitlement seat limit.
create or replace function armp.enforce_seat_limit() returns trigger
language plpgsql as $$
declare lim int; used int;
begin
  if new.status <> 'active' then return new; end if;
  select pe.seat_limit into lim from pilot_entitlements pe
    where pe.organization_id = new.organization_id
      and pe.status in ('pending','approved','active','suspended')
    limit 1;
  if lim is null then return new; end if;  -- no live entitlement: memberships allowed pre-pilot
  select count(*) into used from organization_memberships m
    where m.organization_id = new.organization_id and m.status = 'active'
      and (tg_op = 'INSERT' or m.id <> new.id);
  if used >= lim then
    raise exception 'ARMP_SEAT_LIMIT_REACHED: % of % seats in use', used, lim
      using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger membership_seat_guard before insert or update of status on organization_memberships
  for each row execute function armp.enforce_seat_limit();
