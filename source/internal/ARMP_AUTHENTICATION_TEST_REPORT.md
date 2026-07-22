# Authentication Test Report

## Verified locally
- AAL1 session is denied real-data access; AAL2 authorized (authorize_pilot_session, real Postgres).
- launchApp blocks any non-demo plan without a server-authorized decision (frontend-security + R2-migration suites).
- Failed authorization never falls back to Demo Mode; shows a §13 status message.
- Operations Console requires Supabase session + AAL2 + active internal role (email domain alone insufficient).

## NOT VALIDATED IN STAGING
Real TOTP enrollment/challenge against Supabase Auth, real sign-in, invitation acceptance, and AAL2 issuance by the live auth server. Pending the staging E2E.
