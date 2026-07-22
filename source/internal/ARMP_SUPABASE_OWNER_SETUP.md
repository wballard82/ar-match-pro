# ARMP Supabase Owner Setup — Staging

These are the **owner-only** steps that cannot be done from code or CI. Do them in order. **Never paste any secret value into chat.** All values below are either public or entered only in the Supabase/GitHub dashboards.

## Step 1 — Auth URL configuration  ✅ (confirmed done)
Authentication → URL Configuration. Site URL = `https://armatchpro-staging.netlify.app`; the nine staging redirect URLs added. Production URLs prepared but NOT added until production approval.

## Step 2 — GitHub repo secrets (names only; values entered in GitHub, never shared)
GitHub → repo `wballard82/ar-match-pro` → Settings → Secrets and variables → Actions → New repository secret. Add:
- `SUPABASE_ACCESS_TOKEN` — from Supabase → Account → Access Tokens → Generate. Secret. Do not share.
- `SUPABASE_DB_PASSWORD` — your staging database password (Supabase → Project Settings → Database). Secret. Do not share.
- `NETLIFY_AUTH_TOKEN` — optional, only if CI deploys the static site. Secret.

**Confirm success:** the three names appear in the Actions secrets list. Values are write-only in GitHub — that's expected.

## Step 3 — Push the R3 branch
Claude's environment cannot push (no Git credentials). You will receive `armp-r3.bundle`. From a machine with repo access:
```
git clone https://github.com/wballard82/ar-match-pro && cd ar-match-pro
git bundle verify /path/to/armp-r3.bundle
git fetch /path/to/armp-r3.bundle pilot-auth-r3:pilot-auth-r3
git push origin pilot-auth-r3
```
**Confirm success:** branch `pilot-auth-r3` shows on GitHub. `main` is unchanged.

## Step 4 — Deploy migrations + functions to staging (after you approve the file list)
GitHub → Actions → "ARMP R3 — Staging Deploy (manual)" → Run workflow → branch `pilot-auth-r3`, type `STAGING` to confirm. This runs `supabase db push` and `supabase functions deploy` against ref `vjxdqmujxnmlfvnksvpy`.
**Confirm success:** workflow is green; Supabase → Database → Tables shows the ARMP tables; Edge Functions shows 20 functions.

## Step 5 — First owner bootstrap (one-time)
1. Supabase → Edge Functions → Secrets (or `supabase secrets set`): add `ARMP_BOOTSTRAP_ENABLED` = `true`. Secret-ish; do not share.
2. Supabase → Authentication → Users → Add user → your ARMP email + a strong password (enter it only in the dashboard).
3. Sign in at `/admin.html`, complete TOTP enrollment, then the app calls `bootstrap-first-owner`, assigning you `armp_owner`.
4. **Immediately** remove `ARMP_BOOTSTRAP_ENABLED` (set it to empty / delete it). The function is then permanently inert.
**Confirm success:** you can load the Operations Console; Activity shows `owner_bootstrap_completed`.

## Step 6 — SMTP (later, for reliable invitations)
Supabase's default email is rate-limited (~2–4/hour) and fine for early staging. For real invitation volume: Authentication → Email → SMTP Settings → enter host, port, user, and password (password entered only in the dashboard; never shared). **Confirm success:** a test invitation email arrives within a minute.
