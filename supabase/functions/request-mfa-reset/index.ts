// Step 1 of dual-control MFA reset: one ops admin requests; a DIFFERENT ops
// admin must complete (DB constraint enforces distinct completer).
import { OPS, fail, isUUID, json, privileged, recordEvent } from "../_shared/armp.ts";
Deno.serve(async (req) => {
  const p = await privileged(req, OPS); if (p.res) return p.res;
  let b: Record<string, unknown>; try { b = await req.json(); } catch { return fail(req, 400, "invalid_json", p.rid); }
  if (!isUUID(b.user_id)) return fail(req, 400, "invalid_uuid", p.rid);
  const { data: existing } = await p.a!.from("admin_action_requests").select("id")
    .eq("target_user_id", b.user_id).eq("action_type", "mfa_reset").eq("status", "requested")
    .gt("expires_at", new Date().toISOString()).maybeSingle();
  if (existing) return fail(req, 409, "request_already_open", p.rid);
  const { data: row, error } = await p.a!.from("admin_action_requests").insert({
    action_type: "mfa_reset", target_user_id: b.user_id, requested_by: p.caller!.userId,
  }).select("id").single();
  if (error || !row) return fail(req, 500, "request_failed", p.rid);
  const request_id = await recordEvent(p.a!, { event_type: "mfa_reset_requested", actor: p.caller!.userId, target: b.user_id as string });
  return json(req, 200, { ok: true, request_id, action_request_id: row.id });
});
