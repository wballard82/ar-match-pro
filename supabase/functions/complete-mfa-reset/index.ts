// Step 2 of dual-control MFA reset: a DIFFERENT ops admin completes. Deletes
// the user's TOTP factors + revokes sessions; user re-enrolls at next login.
import { OPS, fail, isUUID, json, privileged, recordEvent } from "../_shared/armp.ts";
Deno.serve(async (req) => {
  const p = await privileged(req, OPS); if (p.res) return p.res;
  let b: Record<string, unknown>; try { b = await req.json(); } catch { return fail(req, 400, "invalid_json", p.rid); }
  if (!isUUID(b.action_request_id)) return fail(req, 400, "invalid_uuid", p.rid);
  const { data: ar } = await p.a!.from("admin_action_requests").select("*").eq("id", b.action_request_id).maybeSingle();
  if (!ar || ar.action_type !== "mfa_reset") return fail(req, 404, "not_found", p.rid);
  if (ar.status !== "requested" || Date.parse(ar.expires_at) < Date.now()) return fail(req, 409, "not_open", p.rid);
  if (ar.requested_by === p.caller!.userId) return fail(req, 403, "dual_control_distinct_admin_required", p.rid);
  const { data: factors } = await p.a!.auth.admin.mfa.listFactors({ userId: ar.target_user_id });
  for (const f of factors?.factors ?? []) {
    try { await p.a!.auth.admin.mfa.deleteFactor({ id: f.id, userId: ar.target_user_id }); } catch { /* continue */ }
  }
  try { await p.a!.auth.admin.signOut(ar.target_user_id, "global"); } catch { /* noop */ }
  const { error } = await p.a!.from("admin_action_requests").update({
    status: "completed", completed_by: p.caller!.userId, completed_at: new Date().toISOString(),
  }).eq("id", ar.id);
  if (error) return fail(req, 409, "complete_failed", p.rid);
  const request_id = await recordEvent(p.a!, { event_type: "mfa_reset_completed", actor: p.caller!.userId, target: ar.target_user_id });
  return json(req, 200, { ok: true, request_id });
});
