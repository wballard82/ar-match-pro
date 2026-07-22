import { OPS, fail, isCustomerRole, isUUID, json, privileged, recordEvent } from "../_shared/armp.ts";
Deno.serve(async (req) => {
  const p = await privileged(req, OPS); if (p.res) return p.res;
  let b: Record<string, unknown>; try { b = await req.json(); } catch { return fail(req, 400, "invalid_json", p.rid); }
  if (!isUUID(b.user_id) || !isUUID(b.organization_id)) return fail(req, 400, "invalid_uuid", p.rid);
  if (!isCustomerRole(b.customer_role)) return fail(req, 400, "invalid_role", p.rid);
  const { error, count } = await p.a!.from("organization_memberships")
    .update({ customer_role: b.customer_role }, { count: "exact" })
    .eq("user_id", b.user_id).eq("organization_id", b.organization_id);
  if (error || !count) return fail(req, 404, "membership_not_found", p.rid);
  const request_id = await recordEvent(p.a!, { event_type: "customer_role_changed", actor: p.caller!.userId,
    target: b.user_id as string, org: b.organization_id as string, metadata: { new_role: b.customer_role } });
  return json(req, 200, { ok: true, request_id });
});
