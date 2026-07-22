# ARMP Test Results — ARMP-2026.07.21-PILOT-AUTH-R3

## JavaScript battery (run locally this build) <span class="badge ok">RUN</span>
| Suite | Assertions |
|---|---|
| 1 — $232,050 real-data E2E | 26/26 |
| 2 — Review controls | 24/24 |
| 3 — Import Template & validation | 23/23 |
| 4 — Multi-file regression & smoke | 15/15 |
| 5 — TK-Fujikin $2,305,295 template E2E | 34/34 |
| 6 — OCR-degraded RMA recommendation | 9/9 |
| 7 — Go-live guardrails | 30/30 |
| 8 — Support bot | 24/24 |
| 9 — Prohibited-pattern gate (R3, expanded) | 1063/1063 |
| Video player | 27/27 |
| Staging smoke (deployable artifact) | 8/8 |
| 10 — Frontend security (R3) | 176/176 |
| 11 — Data boundary (network-instrumented) | 8/8 |
| 12 — R2 localStorage cannot grant access | 18/18 |

**R2 regression subset (suites 1-9 + video + staging_smoke): 503/503 — unweakened.**

## Database / RLS (real PostgreSQL 16) <span class="badge ok">RUN</span>
- 12 migrations apply cleanly; `rls_test.sql` **26/26 PASS**.

## Edge Functions <span class="badge ok">TYPE-CHECK</span> / <span class="badge warn">RUNTIME NOT RUN</span>
- 20 functions type-check under Deno with real dependency resolution.
- Runtime behavior against live Supabase Auth: **NOT VALIDATED IN STAGING**.

## Staging acceptance <span class="badge warn">NOT RUN</span>
See ARMP_STAGING_ACCEPTANCE_REPORT — every step NOT RUN until executed against the live project.
