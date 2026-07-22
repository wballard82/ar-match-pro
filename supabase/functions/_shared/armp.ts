// ARMP R3 — shared Edge Function security core.
// Every privileged function flows through these helpers. The service-role key
// exists ONLY in the Edge Function environment (injected by Supabase); it is
// never sent to, or readable by, any client.
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

export function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

const ALLOWED_ORIGINS = [
  "https://armatchpro-staging.netlify.app",
  "http://localhost:8888",
];
export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

export function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: cors(req) });
}

// Generic client-safe error — never leaks internals; request_id for correlation.
export function fail(req: Request, status: number, code: string, requestId: string): Response {
  return json(req, status, { ok: false, error: code, request_id: requestId });
}

export interface Caller {
  userId: string;
  email: string | null;
  aal: string;            // 'aal1' | 'aal2' from the VERIFIED session
  jwt: string;
}

// Verify the caller's session with the auth server (not by trusting the raw
// JWT), then read the MFA assurance level from the verified claims.
export async function getCaller(req: Request): Promise<Caller | null> {
  const auth = req.headers.get("authorization") ?? "";
  const jwt = auth.replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
  const { data, error } = await asUser.auth.getUser(jwt);
  if (error || !data?.user) return null;
  // aal claim from the (gateway-verified) token payload
  let aal = "aal1";
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    aal = payload.aal ?? "aal1";
  } catch { /* default aal1 */ }
  return { userId: data.user.id, email: data.user.email ?? null, aal, jwt };
}

// Internal-role gate. allowed=[] means "any active internal role".
export async function requireInternal(
  a: SupabaseClient, caller: Caller, allowed: string[],
): Promise<string | null> {
  const { data } = await a.from("internal_role_assignments")
    .select("internal_role,status").eq("user_id", caller.userId).eq("status", "active").maybeSingle();
  const role = data?.internal_role ?? null;
  if (!role) return null;
  if (allowed.length && !allowed.includes(role)) return null;
  return role;
}

export const OPS = ["armp_owner", "armp_operations_admin"];

// Validators — reject before touching the database.
export const isUUID = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export const isISODate = (v: unknown): v is string =>
  typeof v === "string" && !Number.isNaN(Date.parse(v));
export const CUSTOMER_ROLES = ["organization_admin","cash_application_manager","cash_application_analyst","reviewer","read_only"];
export const isCustomerRole = (v: unknown): v is string => typeof v === "string" && CUSTOMER_ROLES.includes(v);
export const isEmail = (v: unknown): v is string =>
  typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;

// Nonfinancial event recording. Returns request_id.
export async function recordEvent(a: SupabaseClient, e: {
  event_type: string; actor?: string | null; target?: string | null;
  org?: string | null; result?: string; source?: string; metadata?: Record<string, unknown>;
}): Promise<string> {
  const { data } = await a.from("security_events").insert({
    event_type: e.event_type,
    actor_user_id: e.actor ?? null,
    target_user_id: e.target ?? null,
    organization_id: e.org ?? null,
    result: e.result ?? "success",
    source: e.source ?? "edge_function",
    nonfinancial_metadata: e.metadata ?? {},
  }).select("request_id").single();
  return data?.request_id ?? crypto.randomUUID();
}

// Standard privileged-function preamble: OPTIONS, caller, AAL2, internal role.
export async function privileged(
  req: Request, allowedRoles: string[],
): Promise<{ res?: Response; caller?: Caller; role?: string; a?: SupabaseClient; rid: string }> {
  const rid = crypto.randomUUID();
  if (req.method === "OPTIONS") return { res: new Response(null, { headers: cors(req) }), rid };
  if (req.method !== "POST") return { res: fail(req, 405, "method_not_allowed", rid), rid };
  const caller = await getCaller(req);
  if (!caller) return { res: fail(req, 401, "not_authenticated", rid), rid };
  if (caller.aal !== "aal2") return { res: fail(req, 403, "mfa_required", rid), rid };
  const a = admin();
  const role = await requireInternal(a, caller, allowedRoles);
  if (!role) {
    await recordEvent(a, { event_type: "privileged_access_denied", actor: caller.userId, result: "denied" });
    return { res: fail(req, 403, "forbidden", rid), rid };
  }
  return { caller, role, a, rid };
}
