# ARMP Known Limitations — R3

- **Staging unvalidated in this package.** Every staging behavior (migrations applied, functions live, MFA, invitations, revocation timing, E2E) is NOT VALIDATED IN STAGING until the acceptance battery runs against project `vjxdqmujxnmlfvnksvpy`.
- **Revocation latency.** Server-side revocation propagates to an open session at its next revalidation — up to 300 seconds — not instantly.
- **Browser-local data is visible to the signed-in user.** RLS protects the control plane; it does not (and cannot) hide a user's own organization's financial data on their own screen.
- **Edge Functions are type-checked, not yet runtime-tested** against live Supabase Auth (invites, MFA factor deletion, global sign-out).
- **Supabase default email is rate-limited** (~2–4/hour); production SMTP is required for real invitation volume.
- **Legal drafts require attorney review**; pricing is not final.
- **No production Supabase project, backup/recovery automation, or monitoring** — all prerequisites for paid production.
