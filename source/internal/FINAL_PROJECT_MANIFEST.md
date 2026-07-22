# ARMP Final Project Manifest — ARMP-2026.07.21-PILOT-AUTH-R3

## Package planes
- `deploy/` — Netlify-uploadable static frontend (site, Demo, pilot app, Operations Console, `/auth/`).
- `supabase/` — config, 12 migrations, 20 Edge Functions, RLS + local test shim.
- `tests/` — 14 suites (503 R2 + R3 auth/security/data-boundary/gate) + fixtures (customer-derived; never deploy).
- `docs/` — PDF documentation (below) as the primary deliverable.
- `source/internal/` — machine-readable Markdown sources + generators (not the primary docs).
- `.github/workflows/` — manual staging deploy + test workflows.

## PDF documents (source → PDF, verified)
| Source (source/internal) | PDF (docs/) | Generator | Pages | Text extraction | SHA-256 (short) |
|---|---|---|---|---|---|
| README.md | docs/release/README.pdf | build_pdfs.py | 1 | PASS | `91332abc4a52c290…` |
| ARMP_CHANGELOG.md | docs/release/ARMP_CHANGELOG.pdf | build_pdfs.py | 1 | PASS | `5b1e8cfb69bfa0ff…` |
| ARMP_KNOWN_LIMITATIONS.md | docs/release/ARMP_KNOWN_LIMITATIONS.pdf | build_pdfs.py | 1 | PASS | `7bc3f56b77115048…` |
| ARMP_ROLLBACK.md | docs/release/ARMP_ROLLBACK.pdf | build_pdfs.py | 1 | PASS | `bd0aaac5f75e7a26…` |
| ARMP_DEPLOYMENT.md | docs/release/ARMP_DEPLOYMENT.pdf | build_pdfs.py | 1 | PASS | `d14d175304177a8a…` |
| ARMP_PRODUCT_TRUTH.md | docs/release/ARMP_PRODUCT_TRUTH.pdf | build_pdfs.py | 1 | PASS | `c30444bcf340801f…` |
| ARMP_CLAIMS_REGISTER.md | docs/release/ARMP_CLAIMS_REGISTER.pdf | build_pdfs.py | 1 | PASS | `9653a8e99d2f931a…` |
| ARMP_FILE_AUDIT.md | docs/release/ARMP_FILE_AUDIT.pdf | build_pdfs.py | 1 | PASS | `5c0a11ba7d2d82e7…` |
| ARMP_CONSISTENCY_MATRIX.md | docs/release/ARMP_CONSISTENCY_MATRIX.pdf | build_pdfs.py | 1 | PASS | `a1b2712432d4572f…` |
| ARMP_ARCHITECTURE.md | docs/architecture/ARMP_ARCHITECTURE.pdf | build_pdfs.py | 1 | PASS | `773d63f8a90ad3aa…` |
| ARMP_SECURITY_REMEDIATION.md | docs/security/ARMP_SECURITY_REMEDIATION.pdf | build_pdfs.py | 1 | PASS | `bbcd9657a26b73e4…` |
| ARMP_PILOT_ACCESS_ADMIN_GUIDE.md | docs/operations/ARMP_PILOT_ACCESS_ADMIN_GUIDE.pdf | build_pdfs.py | 1 | PASS | `fd7f786e4fea564f…` |
| ARMP_SUPABASE_OWNER_SETUP.md | docs/operations/ARMP_SUPABASE_OWNER_SETUP.pdf | build_pdfs.py | 1 | PASS | `a31a0fbe812fe529…` |
| ARMP_SUPPORT_PROCEDURES.md | docs/operations/ARMP_SUPPORT_PROCEDURES.pdf | build_pdfs.py | 1 | PASS | `9a718d7d75c0f980…` |
| ARMP_INCIDENT_RESPONSE.md | docs/security/ARMP_INCIDENT_RESPONSE.pdf | build_pdfs.py | 1 | PASS | `32f02e314815d5b2…` |
| ARMP_AUTHENTICATION_TEST_REPORT.md | docs/security/ARMP_AUTHENTICATION_TEST_REPORT.pdf | build_pdfs.py | 1 | PASS | `90a44ef4efe33caa…` |
| ARMP_RLS_TEST_REPORT.md | docs/security/ARMP_RLS_TEST_REPORT.pdf | build_pdfs.py | 1 | PASS | `6dbc15158b8ab95e…` |
| ARMP_DATA_BOUNDARY_TEST_REPORT.md | docs/security/ARMP_DATA_BOUNDARY_TEST_REPORT.pdf | build_pdfs.py | 1 | PASS | `03c59ef0df441ee3…` |
| ARMP_STAGING_ACCEPTANCE_REPORT.md | docs/release/ARMP_STAGING_ACCEPTANCE_REPORT.pdf | build_pdfs.py | 1 | PASS | `ff9ac722e4dc8215…` |

## Authoritative file per purpose
See ARMP_FILE_AUDIT. One active app, console, user guide, security sheet, order-form draft, pilot-agreement draft, import template, product truth, claims register, known limitations, consistency matrix, architecture spec.

## Status
Real-data pilot NOT approved until staging acceptance passes; paid production BLOCKED. Full SHA256SUMS.txt accompanies the ZIP.
