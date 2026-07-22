# ARMP Claims Register — R3

| Claim | Status | Basis |
|---|---|---|
| "Server-controlled pilot access" | Supportable after staging | RLS + Edge Functions + authorize_pilot_session; local-verified, staging pending |
| "Mandatory MFA for pilot and console users" | Supportable after staging | AAL2 enforced in gate + functions; staging E2E pending |
| "Financial data stays in your browser" | Supportable | Data-boundary suite 8/8 local; staging repeat pending |
| "Organization isolation" | Supportable after staging | RLS 26/26 local; staging RLS pending |
| "Immediate revocation" | NOT claimed | Revocation is ≤300 s, not instant — stated honestly |
| "Paid-production ready" | NOT claimed | Explicitly blocked |
| "No ERP integration or implementation project required" | Supportable | Approved wording; unchanged from R2 |
