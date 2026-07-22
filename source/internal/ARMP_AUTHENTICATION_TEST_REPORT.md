# ARMP Authentication Test Report — R3

## Scope
Password auth, TOTP MFA (enrollment + challenge), AAL1/AAL2 enforcement, invitation acceptance, session revocation.

## Local / static results <span class="badge ok">RUN</span>
- Frontend security (Suite 10, 176/176): auth pages present; `app.html` requires a server decision; console gate uses Supabase session + AAL2 + internal role; no secrets/format-codes in frontend.
- R2-migration (Suite 12, 18/18): legacy localStorage cannot authorize; failed auth never falls back to Demo Mode; §13 messages surface; workspace data preserved.
- Authorization function AAL gate: AAL1 denied, AAL2 authorized (proven in the RLS suite against real Postgres).

## Staging results <span class="badge warn">NOT RUN</span>
The following require the live project and are **NOT VALIDATED IN STAGING**: real password sign-in, TOTP enrollment against Supabase Auth, TOTP challenge, invitation email delivery + acceptance, `auth.admin.signOut` propagation timing. These will be executed and reported per-step in the Staging Acceptance Report.
