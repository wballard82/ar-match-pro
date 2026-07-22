# Pilot Access — Operations Console Guide

## Deciding access
The console lets ARMP Operations control exactly which organizations and users get pilot access, their roles, and when access begins/ends/suspends/extends/revokes.

## Lifecycle
1. **Create pilot organization** (status pilot_pending; a pending entitlement is created).
2. **Approve** (pilot_pending → pilot_approved).
3. **Activate** with start/end dates (pilot_approved → pilot_active; dates validated; server clock authoritative).
4. **Invite users** (org must be approved/active). Each invite is single-use, email/org/role-bound, expiring (1–30 days).
5. User accepts: sets password, enrolls TOTP, verifies — becomes active; entitlement check gates real-data entry.
6. **Suspend** (access stops at next revalidation ≤300s), **Extend** (forward-only end date; optional restore from suspended), **Complete**, or **Revoke** (terminal; global sign-out of all members).

## Roles
Owner / Operations Admin: full lifecycle. Support and Sales/Read-Only: view only — the server rejects mutations regardless of the UI.

## MFA reset (dual control)
One admin requests; a **different** admin completes (DB-enforced). Completing deletes the user's TOTP factors and signs them out to re-enroll.
