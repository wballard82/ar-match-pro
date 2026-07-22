// Internal-only nonfinancial event recording (e.g., console UI actions).
import { fail, json, privileged, recordEvent } from "../_shared/armp.ts";
const ALLOWED = ["console_view","note_added","export_config_viewed","support_action"];
Deno.serve(async (req) => {
  const p = await privileged(req, []); if (p.res) return p.res;
  let body: Record<string, unknown>; try { body = await req.json(); } catch { return fail(req, 400, "invalid_json", p.rid); }
  const et = String(body.event_type ?? "");
  if (!ALLOWED.includes(et)) return fail(req, 400, "invalid_event_type", p.rid);
  const request_id = await recordEvent(p.a!, {
    event_type: et, actor: p.caller!.userId,
    org: typeof body.organization_id === "string" ? body.organization_id : null,
    metadata: { source_role: p.role },
  });
  return json(req, 200, { ok: true, request_id });
});
