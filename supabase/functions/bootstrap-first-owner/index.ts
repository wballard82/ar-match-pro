// One-time first-owner bootstrap. Valid ONLY while no active internal role
// exists AND env ARMP_BOOTSTRAP_ENABLED === "true". Assigns armp_owner to the
// authenticated caller, then is permanently inert. No hardcoded identities.
import { admin, cors, fail, getCaller, json, recordEvent } from "../_shared/armp.ts";

Deno.serve(async (req) => {
  const rid = crypto.randomUUID();
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return fail(req, 405, "method_not_allowed", rid);
  if (Deno.env.get("ARMP_BOOTSTRAP_ENABLED") !== "true") return fail(req, 403, "bootstrap_disabled", rid);
  const caller = await getCaller(req);
  if (!caller) return fail(req, 401, "not_authenticated", rid);
  const a = admin();
  const { count } = await a.from("internal_role_assignments")
    .select("id", { count: "exact", head: true }).eq("status", "active");
  if ((count ?? 0) > 0) return fail(req, 403, "bootstrap_already_completed", rid);
  const { error } = await a.from("internal_role_assignments")
    .insert({ user_id: caller.userId, internal_role: "armp_owner", assigned_by: caller.userId });
  if (error) return fail(req, 500, "bootstrap_failed", rid);
  await a.from("profiles").upsert({
    user_id: caller.userId, business_email: caller.email ?? "", account_status: "active",
  }, { onConflict: "user_id" });
  const request_id = await recordEvent(a, {
    event_type: "owner_bootstrap_completed", actor: caller.userId,
    metadata: { note: "first ARMP owner established; unset ARMP_BOOTSTRAP_ENABLED now" },
  });
  return json(req, 200, { ok: true, request_id, next_step: "Unset ARMP_BOOTSTRAP_ENABLED to disable this function permanently." });
});
