# ARMP Support Procedures — R3

- **Support role** (`armp_support`) can view the Operations Console (read) but cannot activate/suspend/extend/complete/revoke pilots or change entitlements — the server enforces this.
- **Password reset:** direct the user to the sign-in page's reset link (`/auth/reset-password.html`); they re-verify TOTP after reset.
- **Lost authenticator:** an Operations Admin starts a **dual-control MFA reset** (`request-mfa-reset`); a *different* admin completes it (`complete-mfa-reset`), which removes TOTP factors and signs the user out to re-enroll.
- **"I can't get in" triage:** confirm invitation accepted → profile active → org `pilot_active` → within pilot dates → membership active. The console's Users/Activity views show each.
- **Never** ask a user for their password, TOTP secret, or recovery codes.
