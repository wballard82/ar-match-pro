# ARMP Staging Smoke Test — 5 Minutes, Run After Every Deploy

The automated battery (182 assertions across 8 suites + staging smoke) already verified the exact `app.html` you're deploying. This checklist covers the only things a jsdom harness cannot see: real Chrome rendering, real network, real Tesseract, real localStorage on your production origin. Run it in **Chrome, in a regular (non-incognito) window**, on your staging URL.

## 1. Demo Mode wow-check (90 seconds)
- [ ] Load the staging URL, log in, click **Load Sample Data / Demo Mode**.
- [ ] Confirm ~1,000 invoices and 140 payments appear.
- [ ] Click **⚡ Auto Match**. Expect: **~94% of dollars applied**, ~130 payments matched, ~20 open exceptions with pre-written notes.
- [ ] Open one exception — the recommendation chip should name a resolution with a rationale.

## 2. Zero-egress verification (60 seconds) — the security-sheet claim, on prod
- [ ] F12 → **Network** tab → clear the log **after** the page finishes loading.
- [ ] Re-run Auto Match, click through Review and an exception, download an export.
- [ ] Expect: **zero new requests**. (Page-load requests to cdnjs/jsdelivr/unpkg/tessdata are expected — those are code/model downloads; nothing should fire *during* the workflow.)

## 3. Guardrails (90 seconds)
- [ ] Import a payment CSV with >2,500 rows (make one in Excel: fill a column down). Expect the **"File too large to import safely"** modal, nothing imported.
- [ ] Rename a `.png` to `.csv` and import it as invoices. Expect the **"This file can't be read"** modal.
- [ ] In the payment queue with demo data: scroll — smooth; confirm the **Load 100 more** button appears only when >100 payments exist.

## 4. Real-hardware spot checks (90 seconds)
- [ ] Import a scanned multi-page PDF as a bank file. Expect **"Reading page X/Y…"** advancing — note the seconds/page on YOUR laptop (this is the number to quote prospects, not the server benchmark).
- [ ] F12 → **Memory** tab → after a demo Auto Match, take a heap snapshot. Expect well under 1GB at demo scale.
- [ ] Support chat: ask *"does ARMP integrate with SAP?"* — the answer must say **import files**, never API integration.

## 5. Persistence on the production origin (30 seconds)
- [ ] After Auto Match, refresh the tab. The session should restore (demo scale is under the auto-save limit).

**Any red X → stop, don't send outbound, tell me what step failed and what the screen showed.** All green → download the GTM assets and start Track A/B sends.
