import { OPS, fail, isUUID, json, privileged, recordEvent } from "../_shared/armp.ts";
Deno.serve(async (req) => {
  const p = await privileged(req, OPS); if (p.res) return p.res;
  let b: Record<string, unknown>; try { b = await req.json(); } catch { return fail(req, 400, "invalid_json", p.rid); }
  if (!isUUID(b.invitation_id)) return fail(req, 400, "invalid_uuid", p.rid);
  const { data: inv } = await p.a!.from("invitations").select("*").eq("id", b.invitation_id).maybeSingle();
  if (!inv) return fail(req, 404, "not_found", p.rid);
  if (inv.status !== "pending") return fail(req, 409, "not_pending", p.rid);
  await p.a!.from("invitations").update({ status: "revoked", revoked_by: p.caller!.userId, revoked_at: new Date().toISOString() }).eq("id", inv.id);
  // Neutralize the not-yet-accepted auth user + inert membership
  const { data: prof } = await p.a!.from("profiles").select("user_id,account_status").ilike("business_email", inv.email).maybeSingle();
  if (prof && prof.account_status === "invited") {
    await p.a!.from("profiles").update({ account_status: "revoked" }).eq("user_id", prof.user_id);
    await p.a!.from("organization_memberships").update({ status: "revoked" }).eq("user_id", prof.user_id).eq("organization_id", inv.organization_id);
    try { await p.a!.auth.admin.signOut(prof.user_id, "global"); } catch { /* noop */ }
  }
  const request_id = await recordEvent(p.a!, { event_type: "invitation_revoked", actor: p.caller!.userId, org: inv.organization_id });
  return json(req, 200, { ok: true, request_id });
});
