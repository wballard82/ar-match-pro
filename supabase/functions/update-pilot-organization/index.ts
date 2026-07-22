import { OPS, fail, isUUID, json, privileged, recordEvent } from "../_shared/armp.ts";
const FIELDS = ["legal_name","display_name","approved_domains","approved_erp",
  "approved_monthly_payment_line_range","primary_contact_name","primary_contact_email",
  "customer_champion_name","customer_champion_email","maximum_pilot_seats",
  "pilot_agreement_status","security_review_status","internal_notes"];
Deno.serve(async (req) => {
  const p = await privileged(req, OPS); if (p.res) return p.res;
  let b: Record<string, unknown>; try { b = await req.json(); } catch { return fail(req, 400, "invalid_json", p.rid); }
  if (!isUUID(b.organization_id)) return fail(req, 400, "invalid_uuid", p.rid);
  const patch: Record<string, unknown> = {};
  for (const f of FIELDS) if (f in b) patch[f] = b[f];
  if (!Object.keys(patch).length) return fail(req, 400, "no_updatable_fields", p.rid);
  patch.updated_by = p.caller!.userId;
  const { error } = await p.a!.from("organizations").update(patch).eq("id", b.organization_id);
  if (error) return fail(req, 400, "update_rejected", p.rid);
  if ("maximum_pilot_seats" in patch) {
    await p.a!.from("pilot_entitlements").update({ seat_limit: patch.maximum_pilot_seats })
      .eq("organization_id", b.organization_id).in("status", ["pending","approved","active","suspended"]);
  }
  const request_id = await recordEvent(p.a!, { event_type: "organization_updated", actor: p.caller!.userId,
    org: b.organization_id as string, metadata: { fields: Object.keys(patch) } });
  return json(req, 200, { ok: true, request_id });
});
