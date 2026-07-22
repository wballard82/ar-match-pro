# ARMP Rollback — R3

## Never roll back to
- Any release with hardcoded credentials (pre-R2).
- Any release with exposed Stripe identifiers (pre-R2).
- Format-only pilot access (R2) for **real customer data**.

## Sanitized rollback baseline
`ARMP_SANITIZED_ROLLBACK_BASELINE.zip` = the R2 **deploy set** (no credentials, no Stripe, no format-code real-data access is enabled without the R3 backend). Use it only for the **public website / Demo Mode**, never to grant real-data pilots.

## Frontend rollback (Netlify)
Netlify → Deploys → select last-known-good → Publish deploy. Atomic; the site is static.

## Backend rollback (Supabase)
- Migrations are forward-only in practice: prefer a **forward fix** migration over destructive down-migrations. RLS changes must be corrected with a tested forward migration, never by disabling RLS.
- Auth and invitation state must not be corrupted: do not delete `auth.users` rows to "reset"; use the disable/revoke Edge Functions.
- Control-plane metadata (orgs, entitlements, events) should be backed up (Supabase scheduled backups) before any schema change.
- Financial workspace data is local to each browser and is unaffected by any rollback.

## Different actions for different planes
Public-website rollback (Netlify redeploy) and authenticated pilot-app rollback (Netlify + Supabase migration/function state) are separate operations; performing one does not roll back the other.
