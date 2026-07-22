import { OPS, fail, isUUID, json, privileged, recordEvent } from "../_shared/armp.ts";
Deno.serve(async (req) => {
  const p = await privileged(req, OPS); if (p.res) return p.res;
  let b: Record<string, unknown>; try { b = await req.json(); } catch { return fail(req, 400, "invalid_json", p.rid); }
  if (!isUUID(b.invitation_id)) return fail(req, 400, "invalid_uuid", p.rid);
  const { data: inv } = await p.a!.from("invitations").select("*").eq("id", b.invitation_id).maybeSingle();
  if (!inv) return fail(req, 404, "not_found", p.rid);
  if (!["pending","expired"].includes(inv.status)) return fail(req, 409, "not_reissuable", p.rid);
  if (inv.status === "pending") {
    await p.a!.from("invitations").update({ status: "revoked", revoked_by: p.caller!.userId, revoked_at: new Date().toISOString() }).eq("id", inv.id);
  }
  const redirectTo = "https://armatchpro-staging.netlify.app/auth/invite.html";
  const { error: invErr } = await p.a!.auth.admin.inviteUserByEmail(inv.email, { redirectTo });
  if (invErr) return fail(req, 409, "reissue_failed", p.rid);
  const days = Number(b.expires_in_days ?? 7);
  const { error } = await p.a!.from("invitations").insert({
    organization_id: inv.organization_id, email: inv.email, intended_role: inv.intended_role,
    status: "pending", expires_at: new Date(Date.now() + (Number.isInteger(days) && days >= 1 && days <= 30 ? days : 7) * 86400_000).toISOString(),
    invited_by: p.caller!.userId,
  });
  if (error) return fail(req, 409, "duplicate_pending_invitation", p.rid);
  const request_id = await recordEvent(p.a!, { event_type: "invitation_reissued", actor: p.caller!.userId, org: inv.organization_id });
  return json(req, 200, { ok: true, request_id });
});
