// Console data feed: ALL internal roles may view (support + sales read-only
// included). Includes internal_notes — this is the ONLY path notes travel,
// and it is internal-only. Never returns financial data (none exists server-side).
import { fail, json, privileged } from "../_shared/armp.ts";
Deno.serve(async (req) => {
  const p = await privileged(req, []); if (p.res) return p.res;
  const a = p.a!;
  const [orgs, ents, profs, mems, invs, sev, act] = await Promise.all([
    a.from("organizations").select("*").order("created_at", { ascending: false }).limit(200),
    a.from("pilot_entitlements").select("*").limit(400),
    a.from("profiles").select("*").limit(1000),
    a.from("organization_memberships").select("*").limit(2000),
    a.from("invitations").select("*").order("created_at", { ascending: false }).limit(300),
    a.from("security_events").select("*").order("occurred_at", { ascending: false }).limit(200),
    a.from("activation_events").select("*").order("occurred_at", { ascending: false }).limit(200),
  ]);
  if (orgs.error) return fail(req, 500, "load_failed", p.rid);
  // MFA enrollment status per user (metadata only — never secrets)
  const mfa: Record<string, boolean> = {};
  for (const pr of profs.data ?? []) {
    try {
      const { data: f } = await a.auth.admin.mfa.listFactors({ userId: pr.user_id });
      mfa[pr.user_id] = (f?.factors ?? []).some((x: { status: string }) => x.status === "verified");
    } catch { mfa[pr.user_id] = false; }
  }
  return json(req, 200, { ok: true, request_id: p.rid, viewer_role: p.role,
    organizations: orgs.data, entitlements: ents.data, profiles: profs.data,
    memberships: mems.data, invitations: invs.data, security_events: sev.data,
    activation_events: act.data, mfa_enrolled: mfa, server_time: new Date().toISOString() });
});
