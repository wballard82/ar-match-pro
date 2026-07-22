import { OPS, fail, isUUID, json, privileged, recordEvent } from "../_shared/armp.ts";
Deno.serve(async (req) => {
  const p = await privileged(req, OPS); if (p.res) return p.res;
  let b: Record<string, unknown>; try { b = await req.json(); } catch { return fail(req, 400, "invalid_json", p.rid); }
  if (!isUUID(b.organization_id)) return fail(req, 400, "invalid_uuid", p.rid);
  const { data: ent } = await p.a!.from("pilot_entitlements").select("id,status")
    .eq("organization_id", b.organization_id).in("status", ["pending","approved","active","suspended"]).maybeSingle();
  if (!ent) return fail(req, 404, "no_live_entitlement", p.rid);
  const { error } = await p.a!.from("pilot_entitlements").update({
    status: "suspended", suspended_by: p.caller!.userId, suspended_at: new Date().toISOString(),
  }).eq("id", ent.id);
  if (error) return fail(req, 409, "invalid_transition", p.rid);
  const { error: oe } = await p.a!.from("organizations")
    .update({ status: "pilot_suspended", updated_by: p.caller!.userId }).eq("id", b.organization_id);
  if (oe) return fail(req, 409, "org_transition_failed", p.rid);
  const request_id = await recordEvent(p.a!, { event_type: "pilot_suspended", actor: p.caller!.userId, org: b.organization_id as string });
  await p.a!.from("activation_events").insert({ organization_id: b.organization_id, event: "pilot_suspended", actor_user_id: p.caller!.userId });
  return json(req, 200, { ok: true, request_id });
});
