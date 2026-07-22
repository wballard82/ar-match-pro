# Supabase Owner Setup — Staging (exact steps)

All values below are public except where marked secret. Never paste secrets into chat. Do one step at a time.

## 1. Auth redirect URLs — DONE
Site URL `https://armatchpro-staging.netlify.app` and the nine staging redirect URLs are configured (Authentication → URL Configuration).

## 2. Set Edge Function secrets (secret — dashboard only)
Supabase Dashboard → Project Settings → Edge Functions → Secrets → Add:
- `SUPABASE_URL` = `https://vjxdqmujxnmlfvnksvpy.supabase.co` (public)
- `SUPABASE_ANON_KEY` = your project's anon/publishable key (public)
- `SUPABASE_SERVICE_ROLE_KEY` = (secret — copy from Project Settings → API → service_role; do NOT share)
- `ARMP_BOOTSTRAP_ENABLED` = `true` (temporary; unset after bootstrap)
Confirm: the Secrets list shows all four names (values hidden).

## 3. GitHub repo secrets for CI (secret — GitHub only)
Repo → Settings → Secrets and variables → Actions → New repository secret:
- `SUPABASE_ACCESS_TOKEN` (from supabase.com/dashboard/account/tokens)
- `SUPABASE_DB_PASSWORD` (your staging DB password)
Confirm: both names appear in the Actions secrets list.

## 4. Create your owner user (dashboard)
Authentication → Users → Add user → email + password (you'll enroll MFA on first sign-in).
Confirm: the user appears in the Users list.

## 5. Bootstrap first owner (one-time)
After migrations + functions are deployed and `ARMP_BOOTSTRAP_ENABLED=true`, sign in at `/admin.html`, complete MFA, then the bootstrap runs once assigning armp_owner to you.
Confirm: the Activity view shows `owner_bootstrap_completed`. **Then remove `ARMP_BOOTSTRAP_ENABLED`** (step 2) — the function becomes permanently inert.

## 6. SMTP (later, production only)
Authentication → Emails → SMTP Settings. Provide host/port/user and the SMTP password (secret — entered in dashboard, never in chat). Staging uses the built-in service (low rate limits).
