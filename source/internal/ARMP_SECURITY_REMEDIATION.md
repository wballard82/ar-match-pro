# ARMP Security Remediation — R2 → R3

| # | R2 weakness | R3 remediation | Verified |
|---|---|---|---|
| 1 | Client-side format-only pilot code (`ARMP-PILOT-XXXX-XXXX`) granted the pilot plan | Removed entirely; access requires a server authorization decision | Suite 10 + gate |
| 2 | Plan stored in localStorage; client could self-grant | `launchApp` blocks any non-demo plan without a server-authorized decision; revalidated ≤300 s | Suite 12 |
| 3 | Operations Console gated by Google email-domain only | Supabase session + AAL2 + active internal role via `list-operations-dashboard`; domain check removed | Suite 10 |
| 4 | No MFA | Mandatory TOTP (AAL2) for pilot users, console users, and every privileged action | Local; staging E2E pending |
| 5 | No server authorization | RLS default-deny on all tables + `authorize_pilot_session()` server decision | RLS 26/26 local |
| 6 | No admin control over access lifecycle | 20 Edge Functions: create/approve/activate/suspend/extend/complete/revoke pilots; invite/disable/enable/role/session/MFA-reset users | deno check; staging pending |
| 7 | No audit trail | Nonfinancial `security_events` + `activation_events`; dual-control MFA reset | RLS + local |

## Residual risk (honest)
- Because the browser holds the working financial data, a user with local access can still see their own organization's data — expected; RLS protects the control plane, not the user's own screen.
- Revocation is not instantaneous; the bound is 300 seconds (documented, tested locally, staging-pending).
- All staging behaviors remain **NOT VALIDATED IN STAGING** until the E2E runs.
