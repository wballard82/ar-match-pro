// Admin-controlled invitation: creates the auth user via Supabase's invite
// mechanics (raw token never stored by us), an inert membership, an 'invited'
// profile, and the audit invitation row. Single-use/email-bound/expiring by
// Supabase Auth; org/role bound by our records; acceptance completes in
// authorize-pilot-session after password + TOTP (AAL2).
import { OPS, fail, isCustomerRole, isEmail, isUUID, json, privileged, recordEvent } from "../_shared/armp.ts";
Deno.serve(async (req) => {
  const p = await privileged(req, OPS); if (p.res) return p.res;
  let b: Record<string, unknown>; try { b = await req.json(); } catch { return fail(req, 400, "invalid_json", p.rid); }
  if (!isUUID(b.organization_id)) return fail(req, 400, "invalid_uuid", p.rid);
  if (!isEmail(b.email)) return fail(req, 400, "invalid_email", p.rid);
  if (!isCustomerRole(b.customer_role)) return fail(req, 400, "invalid_role", p.rid);
  const days = Number(b.expires_in_days ?? 7);
  if (!Number.isInteger(days) || days < 1 || days > 30) return fail(req, 400, "invalid_expiry", p.rid);
  const fullName = String(b.full_name ?? "").trim().slice(0, 120);
  const { data: org } = await p.a!.from("organizations").select("id,status").eq("id", b.organization_id).maybeSingle();
  if (!org) return fail(req, 404, "org_not_found", p.rid);
  if (!["pilot_approved","pilot_active"].includes(org.status)) return fail(req, 409, "org_not_invitable", p.rid);
  // Supabase Auth invite (email carries the single-use token; we never see/store it)
  const redirectTo = "https://armatchpro-staging.netlify.app/auth/invite.html";
  const { data: invited, error: invErr } = await p.a!.auth.admin.inviteUserByEmail(b.email as string, { redirectTo });
  if (invErr || !invited?.user) return fail(req, 409, "invite_failed", p.rid);
  const uid = invited.user.id;
  const { error: profErr } = await p.a!.from("profiles").upsert({
    user_id: uid, full_name: fullName, business_email: (b.email as string).toLowerCase(), account_status: "invited",
  }, { onConflict: "user_id" });
  if (profErr) return fail(req, 500, "profile_failed", p.rid);
  const { error: memErr } = await p.a!.from("organization_memberships").upsert({
    organization_id: b.organization_id, user_id: uid, customer_role: b.customer_role,
    status: "active", invited_by: p.caller!.userId, approved_by: p.caller!.userId,
  }, { onConflict: "organization_id,user_id" });
  if (memErr) return fail(req, 409, "membership_failed_seat_limit_or_duplicate", p.rid);
  const { error: rowErr } = await p.a!.from("invitations").insert({
    organization_id: b.organization_id, email: (b.email as string).toLowerCase(),
    intended_role: b.customer_role, status: "pending",
    expires_at: new Date(Date.now() + days * 86400_000).toISOString(), invited_by: p.caller!.userId,
  });
  if (rowErr) return fail(req, 409, "duplicate_pending_invitation", p.rid);
  const request_id = await recordEvent(p.a!, { event_type: "user_invited", actor: p.caller!.userId,
    target: uid, org: b.organization_id as string, metadata: { role: b.customer_role, expires_in_days: days } });
  return json(req, 200, { ok: true, request_id, user_id: uid });
});
