# Prohibited-Pattern Sweep — R3

The sweep is an executable release gate: `tests/test_prohibited_terms.js` (Suite 9), **1101/1101**, no whitelist. It scans frontend deployables, generators, SQL migrations, and Edge Functions.

## §24 distinctions the gate enforces
- **Variable name vs secret value:** `SUPABASE_SERVICE_ROLE_KEY` as a name is allowed in backend/config examples; a service-role key *value* (JWT literal, `sb_secret_…`, assignment with a real value) fails the build.
- **Backend reference vs frontend exposure:** `service_role` is permitted only under `supabase/functions/`; any occurrence in `deploy/*` fails.
- **Search vs use:** this gate file and tests search for patterns; that is distinguished from implementations that use them.
- **Public vs protected RLS:** `using(true)`/`with check(true)` fails only as a real policy — a comment documenting the ban is exempted by stripping SQL comments before scanning.

## Banned set (zero occurrences)
MASTER_ADMIN, VALID_KEYS, ARMP-PILOT-XXXX-XXXX + isValidPilotCode, rows: Infinity, Free (7-day), 7-day demo, free trial, no IT approval, all Stripe origins/fields, checkout=success, pk_live_, Stripe price IDs, embedded JWT/service-role/db-password/JWT-secret VALUES, GOOGLE_CLIENT_ID (frontend), query-string plan entitlement, localStorage plan authorization.

## Result
Zero prohibited occurrences. The R2 format-only pilot mechanism is fully removed and server-backed authorization confirmed present.
