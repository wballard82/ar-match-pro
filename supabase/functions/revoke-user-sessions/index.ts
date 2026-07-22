import { OPS, fail, isUUID, json, privileged, recordEvent } from "../_shared/armp.ts";
Deno.serve(async (req) => {
  const p = await privileged(req, OPS); if (p.res) return p.res;
  let b: Record<string, unknown>; try { b = await req.json(); } catch { return fail(req, 400, "invalid_json", p.rid); }
  if (!isUUID(b.user_id)) return fail(req, 400, "invalid_uuid", p.rid);
  try { await p.a!.auth.admin.signOut(b.user_id as string, "global"); }
  catch { return fail(req, 500, "signout_failed", p.rid); }
  const request_id = await recordEvent(p.a!, { event_type: "sessions_revoked", actor: p.caller!.userId, target: b.user_id as string });
  return json(req, 200, { ok: true, request_id });
});
