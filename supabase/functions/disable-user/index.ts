import { OPS, fail, isUUID, json, privileged, recordEvent } from "../_shared/armp.ts";
Deno.serve(async (req) => {
  const p = await privileged(req, OPS); if (p.res) return p.res;
  let b: Record<string, unknown>; try { b = await req.json(); } catch { return fail(req, 400, "invalid_json", p.rid); }
  if (!isUUID(b.user_id)) return fail(req, 400, "invalid_uuid", p.rid);
  if (b.user_id === p.caller!.userId) return fail(req, 400, "cannot_disable_self", p.rid);
  const { error } = await p.a!.from("profiles").update({ account_status: "disabled" }).eq("user_id", b.user_id);
  if (error) return fail(req, 404, "not_found", p.rid);
  await p.a!.from("organization_memberships").update({ status: "disabled" }).eq("user_id", b.user_id).eq("status", "active");
  try { await p.a!.auth.admin.signOut(b.user_id as string, "global"); } catch { /* noop */ }
  const request_id = await recordEvent(p.a!, { event_type: "user_disabled", actor: p.caller!.userId, target: b.user_id as string });
  return json(req, 200, { ok: true, request_id });
});
