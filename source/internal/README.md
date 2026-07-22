# AR Match Pro — Release ARMP-2026.07.21-PILOT-AUTH-R3

Server-controlled pilot access (Supabase Auth + Postgres RLS + Edge Functions + mandatory TOTP MFA), replacing the R2 format-only pilot code.

## Release status (honest)
- **Public website + synthetic Demo Mode:** ready for staging smoke, then production on approval.
- **Controlled real-data pilot access:** **NOT approved yet.** Requires the staging deployment + 16-step staging E2E to pass and an independent review. Until executed against the supplied Supabase staging project and Netlify staging site, all staging items are reported **NOT RUN / NOT VALIDATED IN STAGING**.
- **Paid production:** **BLOCKED** pending independent security review, attorney sign-off, cleared-funds activation, production Supabase project, production SMTP, backup/recovery validation, E&O/cyber insurance, incident-response process, monitoring, and Phase 4 modularization.

## What runs today (verified locally)
- 12 SQL migrations apply cleanly to real PostgreSQL 16.
- RLS suite: **26/26** on real Postgres (org isolation, anonymous denial, customer-cannot-write, internal-notes column block, AAL1 denied / AAL2 authorized).
- 20 Edge Functions type-check (deno check) 20/20.
- JS battery green, R2's 503 assertions retained unweakened; new R3 suites: frontend-security 176, data-boundary 8, R2-migration 18; expanded prohibited-pattern gate.

## Deploy
Upload **contents of `deploy/`** (including `deploy/auth/`) to the Netlify staging site root. Never upload `tests/`, `supabase/seed/`, `source/`, `generators/`. Backend deploys run via the approval-gated GitHub Actions workflows.

Legal drafts require attorney review. Test fixtures are customer-derived — never deploy.
