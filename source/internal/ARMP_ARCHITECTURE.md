# ARMP Architecture — R3

## System shape
Two planes with a strict boundary:
- **Data plane (browser-local):** invoice/bank/remittance/delivery import, matching, allocation, exception review, and posting-export all run in the customer's browser. This data is never transmitted to ARMP or Supabase during the core workflow.
- **Control plane (Supabase):** authentication identity, profiles, organization membership, customer roles, internal ARMP roles, pilot entitlements, invitation metadata, MFA enrollment metadata, account status, nonfinancial security/administrative events, and login timestamps.

## Components
- **Netlify** — static hosting for `deploy/` (public site, Demo Mode, the pilot app shell, the Operations Console, and `/auth/` pages).
- **Supabase Auth** — email/password + mandatory TOTP MFA (AAL2). Invitation-only; public signup disabled.
- **Supabase PostgreSQL + RLS** — control-plane tables; default-deny RLS on every protected table.
- **Supabase Edge Functions** — all privileged mutations run here with the service-role key, which exists only in the function environment.

## Authorization decision
`authorize_pilot_session()` (SECURITY DEFINER) is the single source of truth for real-data access. It evaluates, using the **server clock**: authenticated → AAL2 → profile active → active membership → organization `pilot_active` → entitlement `active` → `now()` within the pilot window. The app calls it before real-data workflows and every ≤300 seconds while open.

## AAL1 vs AAL2
- **AAL1** — password only. Sufficient to reach MFA enrollment/challenge pages; grants no real-data or console access.
- **AAL2** — password + a verified TOTP challenge in the current session. Required for real-data pilot access, all Operations Console access, and every privileged Edge Function.

## Session revocation & propagation
Revocation is server-side (`auth.admin.signOut`, membership/entitlement status changes). An already-open browser session loses access at its next authorization revalidation — **maximum 300 seconds** — or immediately on any action that calls a privileged function. The app does not claim instant revocation.

## Not built (future phases)
Full modularization (Phase 4), production Supabase project, production SMTP, backup/recovery automation, and monitoring are out of scope for R3 and are prerequisites for paid production.
