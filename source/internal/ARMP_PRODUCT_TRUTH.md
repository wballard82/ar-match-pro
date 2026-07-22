# ARMP Product Truth — R3

- **Access model:** invitation-only, server-controlled pilots. No self-service signup for real data; no format-only codes; no client-side entitlement. Demo Mode is synthetic-only, no expiry, no entitlement.
- **Authentication:** Supabase email/password + mandatory TOTP MFA (AAL2). Operations Console requires an active internal role — an @armatchpro.com email alone grants nothing.
- **Data boundary:** invoice/bank/remittance/delivery/matching/allocation/export/OCR content stays in the browser. Supabase stores control-plane metadata only.
- **Commercial:** Pro $4,599/mo billed annually ($55,188/yr) + Custom; ACH/wire only; no Stripe, no cards, no self-serve checkout. 30-Day Shadow Pilot precedes purchase. Pricing + legal are DRAFT pending attorney review.
- **Revocation:** server-side; up to 300 s to propagate to an open session.
- **Status:** real-data pilot NOT approved until staging acceptance + independent review; paid production BLOCKED.
