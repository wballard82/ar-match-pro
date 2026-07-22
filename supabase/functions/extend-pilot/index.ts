import { OPS, fail, isISODate, isUUID, json, privileged, recordEvent } from "../_shared/armp.ts";
Deno.serve(async (req) => {
  const p = await privileged(req, OPS); if (p.res) return p.res;
  let b: Record<string, unknown>; try { b = await req.json(); } catch { return fail(req, 400, "invalid_json", p.rid); }
  if (!isUUID(b.organization_id) || !isISODate(b.new_pilot_end_at)) return fail(req, 400, "invalid_input", p.rid);
  const { data: ent } = await p.a!.from("pilot_entitlements").select("id,status,pilot_end_at")
    .eq("organization_id", b.organization_id).in("status", ["active","suspended"]).maybeSingle();
  if (!ent) return fail(req, 404, "no_extendable_entitlement", p.rid);
  if (ent.pilot_end_at && Date.parse(b.new_pilot_end_at as string) <= Date.parse(ent.pilot_end_at)) {
    return fail(req, 400, "end_date_not_forward", p.rid);   // forward-only extension
  }
  const patch: Record<string, unknown> = { pilot_end_at: b.new_pilot_end_at };
  const restore = b.restore === true && ent.status === "suspended";
  if (restore) patch.status = "active";
  const { error } = await p.a!.from("pilot_entitlements").update(patch).eq("id", ent.id);
  if (error) return fail(req, 409, "invalid_transition", p.rid);
  if (restore) {
    const { error: oe } = await p.a!.from("organizations").update({ status: "pilot_active", updated_by: p.caller!.userId }).eq("id", b.organization_id);
    if (oe) return fail(req, 409, "org_transition_failed", p.rid);
  }
  const request_id = await recordEvent(p.a!, { event_type: restore ? "pilot_extended_and_restored" : "pilot_extended",
    actor: p.caller!.userId, org: b.organization_id as string, metadata: { new_end: b.new_pilot_end_at } });
  await p.a!.from("activation_events").insert({ organization_id: b.organization_id, event: "pilot_extended", actor_user_id: p.caller!.userId });
  return json(req, 200, { ok: true, request_id });
});
