# File Audit — R3 (authoritative-file register)

| Purpose | Authoritative file | Status |
|---|---|---|
| Customer app | deploy/app.html | Server-auth gate; pilot-only; NOT production-ready |
| Operations Console | deploy/admin.html | Supabase session + AAL2 + internal role |
| Auth pages | deploy/auth/*.html | invite, callback, setup-mfa, challenge-mfa, reset-password |
| Public site | deploy/index.html, demo.html, video.html, terms.html, privacy.html | Public; synthetic Demo Mode |
| Redirect stub | deploy/checkout.html | Stripe-free redirect |
| Headers | deploy/_headers | CSP allows only staging Supabase origin; no Stripe; payment=() |
| DB schema | supabase/migrations/*.sql (12) | Apply cleanly to real Postgres 16 |
| RLS + tests | supabase/migrations/…_rls_policies.sql, supabase/tests/ | 26/26 local |
| Edge Functions | supabase/functions/* (20) | deno check 20/20 |
| Product truth / claims / limitations / matrix | docs/release/*.pdf | R3 |
| Architecture | docs/release/ARMP_ARCHITECTURE.pdf | Planes, AAL, roles |
| Import template | templates/ARMP_Invoice_Import_Template.xlsx | 7 required + 4 recommended |

## Deliberately excluded
R2 format-only pilot code and its UI; Google-domain console gate; any pre-R2 credentialed baseline; Stripe artifacts. Superseded R2 docs are not carried as active deliverables.
