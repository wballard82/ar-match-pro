# ARMP Deployment — R3

## Frontend (Netlify staging)
Upload the contents of `deploy/` (including `deploy/auth/`) to the Netlify staging site root. `_headers` must be at the root. **Never upload** `tests/`, `supabase/seed/`, `source/internal/`, `generators/`, or `docs/` — they contain customer-derived fixtures or internal material.

Frontend config uses only public values: `SUPABASE_URL=https://vjxdqmujxnmlfvnksvpy.supabase.co` and the publishable key. The service-role key is never in frontend config.

## Backend (Supabase staging) — owner-approved, CI-driven
1. Owner sets GitHub secrets (ARMP_SUPABASE_OWNER_SETUP, Step 2).
2. GitHub → Actions → "ARMP R3 — Staging Deploy (manual)" → type `STAGING`. Runs `supabase db push` + `supabase functions deploy` against ref `vjxdqmujxnmlfvnksvpy`.
3. Bootstrap the first owner (Step 5), then unset `ARMP_BOOTSTRAP_ENABLED`.

## Exact files deployed to staging (shown before any apply, per §27A)
- Migrations: `supabase/migrations/2026072200000{1..8}*.sql`, `..8a`, `..9`, `..10`, `..11` (12 files).
- Functions: all 20 directories under `supabase/functions/` + `_shared/armp.ts`.
Command target: project ref `vjxdqmujxnmlfvnksvpy` (staging). Production is never targeted.

## CSP / headers
`deploy/_headers` allows the Supabase origin in `connect-src` (https only), no Stripe origins, `payment=()`, object-src none, base-uri/form-action restricted, referrer-policy set, nosniff. The `_headers` HTTP response file — not a meta tag — is the primary control.

## Verify
`sha256sum -c SHA256SUMS.txt`, then `npm install && npm test`. Smoke-check `/`, `/demo.html` (synthetic), `/admin.html` (console sign-in), `/auth/*` pages.
