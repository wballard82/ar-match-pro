# ARMP RLS Test Report — R3

## Method
`supabase/tests/local_shim.sql` replicates the Supabase runtime surface (`auth.uid()`, `auth.jwt()`, anon/authenticated/service_role roles) on real PostgreSQL 16. All 12 migrations apply, then `rls_test.sql` runs as each role via `SET ROLE` + JWT-claim GUCs — exactly as PostgREST does.

## Result <span class="badge ok">26 / 26 PASS on real Postgres 16</span>
Proven: anonymous denied on all 7 protected tables; customer A sees only its own org + entitlement and cannot see or write Corp B; customer cannot change pilot dates/status, insert an internal role, or change own role; `internal_notes` column not selectable by customers; AAL1 denied and AAL2 authorized via `authorize_pilot_session()`; ops admin reads across orgs, invitations, and roles.

## Label
These are **local-Postgres** results. Re-running RLS against the live staging project is part of the acceptance battery (the CI `staging-tests` workflow reproduces this suite on an ephemeral Postgres and can be pointed at staging).
