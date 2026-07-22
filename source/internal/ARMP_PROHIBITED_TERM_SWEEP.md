# ARMP Prohibited-Pattern Sweep — R3

The sweep is executable: `tests/test_prohibited_terms.js` (Suite 9). Result this build: **1063/1063 PASS**, and a planted-violation negative control correctly failed the gate (1062/1063), proving it is not a no-op.

## Zero-tolerance in deployables + generators
MASTER_ADMIN(_EMAIL/_PASS), VALID_KEYS, ARMP-PILOT-XXXX-XXXX, isValidPilotCode, rows: Infinity, Free (7-day), 7-day demo, free trial, no IT approval, all Stripe domains, stripeCustomerId/SubscriptionId, checkout=success, pk_live_, Stripe price IDs, query-string plan entitlement, localStorage plan authorization.

## Secret-VALUE patterns (deployables AND backend)
sb_secret_*, embedded JWT literals, `SUPABASE_SERVICE_ROLE_KEY=<value>`, `database_password=<value>`, `JWT_SECRET=<value>`, SMTP/DB passwords with values.

## §24 context-awareness (not a naive global scan)
- `service_role`, `using (true)`, `with check (true)` are **permitted in backend source** and are NOT in the deployable ban list.
- The gate proves `service_role` appears in backend and in **no** frontend file.
- It distinguishes a variable **name** from a secret **value**, and a test that **searches** for a pattern from code that **implements** it.
- No broad whitelists; the only carve-outs are the backend keyword allowances above.
