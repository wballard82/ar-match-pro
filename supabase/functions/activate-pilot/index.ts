// Approve (pending→approved) and/or activate (approved→active) a pilot.
// Activation requires valid dates; org moves pilot_pending→pilot_approved→pilot_active.
import { OPS, fail, isISODate, isUUID, json, privileged, recordEvent } from "../_shared/armp.ts";
Deno.serve(async (req) => {
  const p = await privileged(req, OPS); if (p.res) return p.res;
  let b: Record<string, unknown>; try { b = await req.json(); } catch { return fail(req, 400, "invalid_json", p.rid); }
  if (!isUUID(b.organization_id)) return fail(req, 400, "invalid_uuid", p.rid);
  const action = String(b.action ?? "activate"); // "approve" | "activate"
  const { data: ent } = await p.a!.from("pilot_entitlements").select("*")
    .eq("organization_id", b.organization_id).in("status", ["pending","approved","active","suspended"]).maybeSingle();
  if (!ent) return fail(req, 404, "no_live_entitlement", p.rid);
  if (action === "approve") {
    if (ent.status !== "pending") return fail(req, 409, "invalid_transition", p.rid);
    const { error } = await p.a!.from("pilot_entitlements").update({ status: "approved" }).eq("id", ent.id);
    if (error) return fail(req, 409, "invalid_transition", p.rid);
    await p.a!.from("organizations").update({ status: "pilot_approved", updated_by: p.caller!.userId }).eq("id", b.organization_id);
    const request_id = await recordEvent(p.a!, { event_type: "pilot_approved", actor: p.caller!.userId, org: b.organization_id as string });
    await p.a!.from("activation_events").insert({ organization_id: b.organization_id, event: "pilot_approved", actor_user_id: p.caller!.userId });
    return json(req, 200, { ok: true, request_id });
  }
  // activate
  if (!isISODate(b.pilot_start_at) || !isISODate(b.pilot_end_at)) return fail(req, 400, "invalid_dates", p.rid);
  if (Date.parse(b.pilot_end_at as string) <= Date.parse(b.pilot_start_at as string)) return fail(req, 400, "invalid_dates", p.rid);
  if (ent.status !== "approved") return fail(req, 409, "invalid_transition", p.rid);
  const { error } = await p.a!.from("pilot_entitlements").update({
    status: "active", pilot_start_at: b.pilot_start_at, pilot_end_at: b.pilot_end_at,
    activated_by: p.caller!.userId, activated_at: new Date().toISOString(),
  }).eq("id", ent.id);
  if (error) return fail(req, 409, "invalid_transition", p.rid);
  const { error: orgErr } = await p.a!.from("organizations")
    .update({ status: "pilot_active", updated_by: p.caller!.userId }).eq("id", b.organization_id);
  if (orgErr) return fail(req, 409, "org_transition_failed", p.rid);
  const request_id = await recordEvent(p.a!, { event_type: "pilot_activated", actor: p.caller!.userId, org: b.organization_id as string });
  await p.a!.from("activation_events").insert({ organization_id: b.organization_id, event: "pilot_activated", actor_user_id: p.caller!.userId });
  return json(req, 200, { ok: true, request_id });
});
