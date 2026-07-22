# ARMP Pilot Access — Operations Console Guide

The console (`/admin.html`) requires a Supabase session, AAL2 (TOTP), and an active internal role. Owners and Operations Admins can perform write actions; Support and Sales/Read-Only are read-only (the server enforces this regardless of the UI).

## Grant pilot access to a new organization
1. **Organizations → Create pilot organization** — enter legal/display name, approved ERP, seats. Creates the org in `pilot_pending` with a `pending` entitlement.
2. **Approve** — moves to `pilot_approved`.
3. **Activate** — enter pilot start/end dates. Moves to `pilot_active`; access opens automatically at the start date (server clock).
4. **Invite user** — enter business email, full name, customer role, expiration (1–30 days). The user gets a single-use, email/org/role-bound invitation.
5. The user sets a password, enrolls TOTP, and enters the pilot app once `authorize_pilot_session()` passes.

## Lifecycle controls
- **Suspend** — immediate hold; users lose access within 300 s. **Restore** via Extend (with restore) or reactivation.
- **Extend** — forward-only new end date.
- **Complete** — ends the pilot (`pilot_completed`).
- **Revoke** — terminal; entitlement revoked, org terminated, all member sessions signed out server-side.
- **Users** — disable/enable, change role, revoke sessions, or start a **dual-control MFA reset** (a different admin must complete it).

## What the console never shows
No invoice, bank, remittance, matching, or allocation data — that never leaves the browser and is never stored in Supabase.
