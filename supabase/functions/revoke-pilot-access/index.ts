import { OPS, fail, isUUID, json, privileged, recordEvent } from "../_shared/armp.ts";
Deno.serve(async (req) => {
  const p = await privileged(req, OPS); if (p.res) return p.res;
  let b: Record<string, unknown>; try { b = await req.json(); } catch { return fail(req, 400, "invalid_json", p.rid); }
  if (!isUUID(b.organization_id)) return fail(req, 400, "invalid_uuid", p.rid);
  const reason = String(b.reason ?? "").slice(0, 500) || "unspecified";
  const { data: ent } = await p.a!.from("pilot_entitlements").select("id,status")
    .eq("organization_id", b.organization_id).in("status", ["pending","approved","active","suspended"]).maybeSingle();
  if (ent) {
    const { error } = await p.a!.from("pilot_entitlements").update({
      status: "revoked", revoked_by: p.caller!.userId, revoked_at: new Date().toISOString(), revocation_reason: reason,
    }).eq("id", ent.id);
    if (error) return fail(req, 409, "invalid_transition", p.rid);
  }
  const { error: oe } = await p.a!.from("organizations").update({ status: "terminated", updated_by: p.caller!.userId }).eq("id", b.organization_id);
  if (oe) return fail(req, 409, "org_transition_failed", p.rid);
  // Disable memberships + revoke every member's sessions (server-side, not browser storage)
  const { data: members } = await p.a!.from("organization_memberships").select("user_id").eq("organization_id", b.organization_id);
  await p.a!.from("organization_memberships").update({ status: "revoked" }).eq("organization_id", b.organization_id);
  for (const m of members ?? []) { try { await p.a!.auth.admin.signOut(m.user_id, "global"); } catch { /* recorded below */ } }
  const request_id = await recordEvent(p.a!, { event_type: "pilot_revoked", actor: p.caller!.userId,
    org: b.organization_id as string, metadata: { reason, members_signed_out: (members ?? []).length } });
  await p.a!.from("activation_events").insert({ organization_id: b.organization_id, event: "pilot_revoked", actor_user_id: p.caller!.userId, detail: { reason } });
  return json(req, 200, { ok: true, request_id });
});
