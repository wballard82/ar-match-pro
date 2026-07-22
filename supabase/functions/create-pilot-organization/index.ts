import { OPS, fail, json, privileged, recordEvent } from "../_shared/armp.ts";
Deno.serve(async (req) => {
  const p = await privileged(req, OPS); if (p.res) return p.res;
  let b: Record<string, unknown>; try { b = await req.json(); } catch { return fail(req, 400, "invalid_json", p.rid); }
  const legal = String(b.legal_name ?? "").trim(), display = String(b.display_name ?? "").trim();
  if (!legal || !display || legal.length > 200 || display.length > 120) return fail(req, 400, "invalid_name", p.rid);
  const seats = Number(b.maximum_pilot_seats ?? 5);
  if (!Number.isInteger(seats) || seats < 1 || seats > 100) return fail(req, 400, "invalid_seats", p.rid);
  const erp = b.approved_erp == null ? null : String(b.approved_erp);
  if (erp !== null && !["sap","netsuite","sap_and_netsuite"].includes(erp)) return fail(req, 400, "invalid_erp", p.rid);
  const { data: org, error } = await p.a!.from("organizations").insert({
    legal_name: legal, display_name: display, status: "pilot_pending",
    approved_erp: erp, approved_monthly_payment_line_range: b.approved_volume_range ?? null,
    primary_contact_name: b.primary_contact_name ?? null, primary_contact_email: b.primary_contact_email ?? null,
    customer_champion_name: b.customer_champion_name ?? null, customer_champion_email: b.customer_champion_email ?? null,
    maximum_pilot_seats: seats, internal_notes: b.internal_notes ?? null,
    created_by: p.caller!.userId, updated_by: p.caller!.userId, armp_owner_user_id: p.caller!.userId,
  }).select("id").single();
  if (error || !org) return fail(req, 500, "create_failed", p.rid);
  const { error: entErr } = await p.a!.from("pilot_entitlements").insert({
    organization_id: org.id, status: "pending", seat_limit: seats,
    approved_volume_range: b.approved_volume_range ?? null,
  });
  if (entErr) return fail(req, 500, "entitlement_create_failed", p.rid);
  const request_id = await recordEvent(p.a!, { event_type: "organization_created", actor: p.caller!.userId, org: org.id });
  await p.a!.from("activation_events").insert({ organization_id: org.id, event: "organization_created", actor_user_id: p.caller!.userId });
  return json(req, 200, { ok: true, request_id, organization_id: org.id });
});
