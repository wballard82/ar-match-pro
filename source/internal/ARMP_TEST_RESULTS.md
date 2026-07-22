# Test Results — ARMP-2026.07.21-PILOT-AUTH-R3

Run 2026-07-22. JS suites via `npm test` against `deploy/app.html`; backend proofs against real PostgreSQL 16.

## JavaScript battery (all green)
| Suite | Result |
|---|---|
| 1 — $232,050 real-data E2E | 26/26 |
| 2 — Review controls | 24/24 |
| 3 — Import Template & validation | 23/23 |
| 4 — Multi-file regression & smoke | 15/15 |
| 5 — TK-Fujikin $2,305,295 template E2E | 34/34 |
| 6 — OCR-degraded RMA | 9/9 |
| 7 — Go-live guardrails | 30/30 |
| 8 — Support bot | 24/24 |
| Video player | 27/27 |
| 9 — Prohibited-pattern gate (R3, expanded) | 1101/1101 |
| Staging smoke (deployable artifact) | 8/8 |
| 10 — Frontend security (R3) | 176/176 |
| 11 — Data boundary (network-instrumented) | 8/8 |
| 12 — R2 localStorage cannot grant R3 access | 18/18 |

**R2's original 503 assertions are retained and unweakened** (suites 1–9 + smoke + gate).

## Backend proofs (real PostgreSQL 16, local)
- 12 migrations apply cleanly.
- RLS suite: **26/26** (org isolation read+write, anonymous denial on all protected tables, customer cannot change pilot dates/status or assign internal roles, internal_notes column blocked, AAL1 denied / AAL2 authorized, ops admin cross-org read).
- 20 Edge Functions: `deno check` 20/20.

## NOT RUN / NOT VALIDATED IN STAGING
Everything requiring the live Supabase staging project or Netlify staging site: migrations applied to staging, Edge Function runtime behavior, MFA enrollment/challenge, invitation email + links, session-revocation propagation timing, staging data-boundary capture, and the 16-step staging E2E. These are reported NOT RUN until executed via the CI workflows.
