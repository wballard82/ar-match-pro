-- ARMP R3 · 0011 authorize_pilot_session()
-- THE server-authoritative real-data authorization decision for the CALLING
-- user. SECURITY DEFINER: evaluates against real rows regardless of RLS, but
-- only ever answers about auth.uid()'s own access. Uses the SERVER clock.
-- The app must call this before real-data workflows and on a revalidation
-- interval; the Edge Function `authorize-pilot-session` wraps this and adds
-- session/AAL context. Returns no internal notes or sensitive details.
create or replace function public.authorize_pilot_session() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  aal text := coalesce(auth.jwt()->>'aal','aal1');
  prof record; mem record; org record; ent record;
begin
  if uid is null then
    return jsonb_build_object('authorized', false, 'reason', 'not_authenticated');
  end if;
  if aal <> 'aal2' then
    return jsonb_build_object('authorized', false, 'reason', 'mfa_required');
  end if;
  select * into prof from profiles where user_id = uid;
  if prof is null or prof.account_status <> 'active' then
    return jsonb_build_object('authorized', false, 'reason',
      case coalesce(prof.account_status,'missing')
        when 'disabled' then 'user_disabled'
        when 'revoked'  then 'user_revoked'
        else 'profile_inactive' end);
  end if;
  select * into mem from organization_memberships
    where user_id = uid and status = 'active' limit 1;
  if mem is null then
    return jsonb_build_object('authorized', false, 'reason', 'no_active_membership');
  end if;
  select * into org from organizations where id = mem.organization_id;
  if org is null or org.status <> 'pilot_active' then
    return jsonb_build_object('authorized', false, 'reason',
      'org_' || coalesce(org.status,'missing'));
  end if;
  select * into ent from pilot_entitlements
    where organization_id = org.id
      and status in ('pending','approved','active','suspended') limit 1;
  if ent is null or ent.status <> 'active' then
    return jsonb_build_object('authorized', false, 'reason',
      'pilot_' || coalesce(ent.status,'missing'));
  end if;
  if ent.pilot_start_at is null or now() < ent.pilot_start_at then
    return jsonb_build_object('authorized', false, 'reason', 'pilot_not_started',
      'pilot_start_at', ent.pilot_start_at);
  end if;
  if ent.pilot_end_at is null or now() >= ent.pilot_end_at then
    return jsonb_build_object('authorized', false, 'reason', 'pilot_ended');
  end if;
  return jsonb_build_object(
    'authorized', true,
    'organization_id', org.id,
    'organization_name', org.display_name,
    'customer_role', mem.customer_role,
    'pilot_end_at', ent.pilot_end_at,
    'server_time', now(),
    'revalidate_after_seconds', 300
  );
end $$;
revoke all on function public.authorize_pilot_session() from public, anon;
grant execute on function public.authorize_pilot_session() to authenticated;
