// THE server-backed real-data authorization decision.
// Calls the SECURITY DEFINER SQL function AS THE CALLER (their JWT), so the
// decision uses the server clock + live entitlement rows. Also performs the
// one-time invited→active promotion at first fully-MFA'd entry (invitation
// acceptance completion) and stamps last_login_at.
import { createClient } from "npm:@supabase/supabase-js@2";
import { SUPABASE_URL, admin, cors, fail, getCaller, json, recordEvent } from "../_shared/armp.ts";

Deno.serve(async (req) => {
  const rid = crypto.randomUUID();
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return fail(req, 405, "method_not_allowed", rid);
  const caller = await getCaller(req);
  if (!caller) return fail(req, 401, "not_authenticated", rid);
  const a = admin();

  // Invitation acceptance completion: profile 'invited' + verified session at
  // AAL2 (password set + TOTP challenge passed) → promote to 'active', mark the
  // invitation accepted, record the event. Membership was pre-created inert.
  if (caller.aal === "aal2") {
    const { data: prof } = await a.from("profiles").select("account_status")
      .eq("user_id", caller.userId).maybeSingle();
    if (prof?.account_status === "invited") {
      await a.from("profiles").update({ account_status: "active" }).eq("user_id", caller.userId);
      if (caller.email) {
        await a.from("invitations")
          .update({ status: "accepted", accepted_by: caller.userId, accepted_at: new Date().toISOString() })
          .eq("status", "pending").ilike("email", caller.email);
      }
      await recordEvent(a, { event_type: "invitation_accepted", actor: caller.userId });
    }
  }

  const asUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${caller.jwt}` } },
    auth: { persistSession: false },
  });
  const { data, error } = await asUser.rpc("authorize_pilot_session");
  if (error) return fail(req, 500, "authorization_error", rid);

  await a.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("user_id", caller.userId);
  const request_id = await recordEvent(a, {
    event_type: (data?.authorized ? "pilot_session_authorized" : "pilot_session_denied"),
    actor: caller.userId, org: data?.organization_id ?? null,
    result: data?.authorized ? "success" : "denied",
    metadata: { reason: data?.reason ?? "authorized", aal: caller.aal },
  });
  return json(req, 200, { ok: true, request_id, decision: data });
});
