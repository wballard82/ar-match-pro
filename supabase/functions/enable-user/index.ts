import { OPS, fail, isUUID, json, privileged, recordEvent } from "../_shared/armp.ts";
Deno.serve(async (req) => {
  const p = await privileged(req, OPS); if (p.res) return p.res;
  let b: Record<string, unknown>; try { b = await req.json(); } catch { return fail(req, 400, "invalid_json", p.rid); }
  if (!isUUID(b.user_id)) return fail(req, 400, "invalid_uuid", p.rid);
  const { data: prof } = await p.a!.from("profiles").select("account_status").eq("user_id", b.user_id).maybeSingle();
  if (!prof) return fail(req, 404, "not_found", p.rid);
  if (prof.account_status === "revoked") return fail(req, 409, "revoked_requires_new_invitation", p.rid);
  const { error } = await p.a!.from("profiles").update({ account_status: "active" }).eq("user_id", b.user_id);
  if (error) return fail(req, 500, "enable_failed", p.rid);
  await p.a!.from("organization_memberships").update({ status: "active" }).eq("user_id", b.user_id).eq("status", "disabled");
  const request_id = await recordEvent(p.a!, { event_type: "user_enabled", actor: p.caller!.userId, target: b.user_id as string });
  return json(req, 200, { ok: true, request_id });
});
