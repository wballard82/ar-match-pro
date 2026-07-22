# ARMP Incident Response — R3 (staging)

## Immediate containment
- **Compromised pilot user:** Operations → Users → Disable + Revoke sessions (server-side sign-out). Propagation ≤300 s.
- **Compromised organization:** Revoke pilot access (terminal): entitlement revoked, org terminated, all member sessions signed out.
- **Suspected key exposure:** rotate the service-role key in Supabase (Project Settings → API), redeploy functions. The publishable key is public and needs no rotation. Never share keys in chat/tickets.

## Investigation
Use `security_events` + `activation_events` (nonfinancial) via the Operations Console Activity view; every privileged action carries a `request_id`.

## Boundaries
No customer financial data is stored server-side, so a control-plane incident does not expose invoice/payment data. Financial workspace data lives in each user's browser.

## Escalation & notification
Document scope, affected orgs/users, and timeline. Legal/notification obligations are determined with counsel (legal drafts pending attorney review).
