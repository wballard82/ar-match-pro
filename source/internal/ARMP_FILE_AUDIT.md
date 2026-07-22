# ARMP File Audit — R3 (authoritative file per purpose)

| Purpose | Authoritative file | Status |
|---|---|---|
| Pilot app | `deploy/app.html` | Server-gated; pilot-only; not paid-production |
| Operations Console | `deploy/admin.html` | Supabase + AAL2 + internal role |
| Auth pages | `deploy/auth/{invite,callback,setup-mfa,challenge-mfa,reset-password}.html` | MFA-enforcing |
| Public site | `deploy/{index,demo,video,terms,privacy,checkout}.html` | Public / synthetic Demo |
| Headers | `deploy/_headers` | Supabase origin; no Stripe |
| DB schema | `supabase/migrations/*.sql` (12) | Real-Postgres-verified |
| RLS | `supabase/migrations/20260722000009_rls_policies.sql` | Default-deny; 26/26 |
| Edge Functions | `supabase/functions/*` (20 + `_shared`) | deno-checked |
| Authorization | `supabase/migrations/20260722000011_authorize_fn.sql` | Server decision |
| Import template | `templates/ARMP_Invoice_Import_Template.xlsx` | 7 required fields |
| Tests | `tests/*` (14 suites) | 503 R2 + R3 additions |
| Release gate | `tests/test_prohibited_terms.js` | Context-aware (R3) |

Superseded R2 items (format-code, license inputs) are removed, not carried forward.
