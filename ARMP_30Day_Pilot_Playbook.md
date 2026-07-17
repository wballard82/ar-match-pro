# ARMP 30-Day Shadow Pilot — Operational Playbook (Day by Day)

Internal document for whoever runs the pilot (today: the founder). Companion to the customer-facing Shadow Pilot Framework PDF. Every technical number here matches the measured limits: **100,000-row invoice ceiling · 2,500-row hard cap per payment/remittance file · ~3,000 payment rows per session ideal · weekly workspace reset · every session ends with an export** (SAP F-28, NetSuite Cash Receipt, D365 F&O, or Generic CSV).

---

## Week 1 — Setup & Baseline (Days 1–7)

*Goal: establish technical trust, demonstrate the interface on seeded data, and land the first real invoice book safely inside the measured limits.*

**Day 1 — Kickoff call (45 min, white-glove).**
Agenda: (1) Demo Mode walkthrough — load the seeded 1,000-invoice book live, run Auto Match in front of them, open one exception to show the pre-written Cash on Account note. (2) Send the Security & Privacy Data Sheet and pilot agreement if not already signed. (3) Book the recurring weekly session slot (same weekday — the workspace resets weekly, so one session per cycle is the natural rhythm). (4) Assign roles: their champion runs the keyboard; you observe.

**Day 2 — Baseline capture (their homework, 15 min).**
Champion logs: hours spent on manual cash application last week, current unapplied-cash balance, and payment line volume per week. **This is the ROI denominator. Do not proceed without it.** If weekly volume exceeds ~3,000 payment lines, plan split sessions now (2,500-row hard cap per file — split by bank account or date range).

**Day 3 — First real invoice import (guided, 30 min).**
They export their open-invoice book (FBL5N for SAP — maps natively; saved search for NetSuite) and import it. Books up to 100,000 rows are fine. If the book exceeds ~13,000 invoices, tell them now: auto-save pauses above that (browser storage quota), the app warns once, and the rule becomes "export before closing the tab." Confirm customer names resolved; add normalization aliases for any bank-truncated names.

**Day 5 — Hardware check via demo rerun (10 min).**
On the champion's own laptop: reload Demo Mode, run Auto Match, and confirm it feels instant. This is the cheapest way to verify their hardware handles the memory profile before any real batch — and it doubles as their hands-on practice rep.

**Days 5–7 — Dry run on one small batch.**
One real bank file (≤2,500 rows), one Auto Match, no posting. Goal is fluency, not metrics. Fix template or alias issues within 24h. End the session with an export download even though it won't be posted — the export habit starts on day one.

---

## Week 2 — The Shadow Test (Days 8–15)

*Goal: process live payment batches in parallel and capture the metrics — while the export files are archived, never posted (their manual process remains the process of record; posting both would double-post cash).*

**Days 8–9 — Shadow batch #1.**
Their team completes manual cash application as normal (process of record unchanged). Same files go through ARMP: invoice book refresh → bank file → remittances → Auto Match → work Needs Attention → **export the posting file** (not posted; archived for week-3 comparison). Record from the Reports tab: auto-match rate, dollars auto-applied, exception count, minutes spent in ARMP.

**Days 10–12 — Shadow batch #2.**
Repeat. If they have scanned/PDF remittances, run one through this session and **time the OCR on their hardware** — the reference benchmark is ~2.4 seconds per page (a 100-page scan ≈ 4–8 minutes), but the number you quote them from now on is the one measured on their machine. Show them the "Reading page X/Y" progress bar so nobody refreshes mid-read. If a customer can send Excel/CSV remittances instead, switch them — no OCR at all.

**Days 13–15 — Shadow batch #3 + tuning.**
Third batch. By now the match rate should be stabilizing. Tune: name normalization, template columns (Delivery #, Bill of Lading, Logistics Memo unlock shipment-reference matching if they have a delivery report), short-pay threshold.

---

## Week 3 — Exception Handling Mastery (Days 16–22)

*Goal: make the champion self-sufficient on the 5–10% that needs human eyes, and win the deal in the line-by-line verification.*

**Days 16–17 — Needs Attention training (60 min).**
Teach the philosophy first: ARMP never guess-applies. A line only auto-applies when the amount ties exactly on the right account, and PO groups never span customers. The 5–10% that lands in Needs Attention is the control working. Then the mechanics: each exception arrives with the research done — the recommendation names the delivery → sales order chain and pre-writes the **Cash on Account** note in their convention. Train: resolve-as-COA, short-pay handling, Approve All ↔ Unselect All in Review, and Clear Review (Review-scoped, nothing else touched).

**Days 18–20 — Verification reconciliation (the proof).**
Line-by-line: every ARMP allocation from the three shadow batches vs. what their team actually posted. Target: **100% agreement on auto-applied lines.** Disagreements get a written root cause same-day — this is where the deal is won or lost, so treat every discrepancy as a gift. Special attention to stale-invoice recoveries (remittance quotes a rebilled invoice number; ARMP's delivery bridge finds the reissued one) — walk their analyst through the audit chain on one example.

**Days 21–22 — Champion solo run.**
They run a full session with you silent on the call. Under 30 minutes end-to-end including the export download = ready for the readout.

---

## Week 4 — ROI Review & Conversion (Days 23–30)

*Goal: quantify the savings with their own numbers and convert to the EOY contract. (The pilot agreement was signed before Day 1 — it governs the pilot; the only paper in week 4 is the order form.)*

**Days 23–24 — Build the readout.**
One page: weeks 1–3 average auto-match rate · dollars auto-applied · week-3 verification agreement % · their baseline hours vs. in-ARMP minutes → hours saved × loaded analyst cost × 12 · exception quality examples (screenshot one pre-written COA note next to the analyst's identical manual note).

**Day 25 — The readout meeting (Controller/VP in the room).**
Their numbers, not yours. Close: pilot pricing honored for an annual commitment signed within 14 days — the EOY contract. If a metric missed target: extend two weeks free with a named fix list. A transparent miss converts better than a shaky win.

**Days 26–30 — Paper and cutover plan.**
Order form out within 24h of a verbal yes. Cutover plan for going live as process of record: weekly session cadence, file checklist, the 2,500-row batching rule, export-before-close rule for large books, and the support-bot-first / founder-escalation support path.

---

## Hard rules (never bend during a pilot)

1. **Never exceed the measured limits to impress anyone.** 2,500 rows per payment file, ~3,000 per session, 100K invoices. A crashed tab in week 2 kills the deal; a batching instruction doesn't.
2. **Every session ends with an export download.** It protects their work (large books run without auto-save) and builds the habit that survives conversion.
3. **Their team posts everything.** ARMP recommends; their finance team verifies and posts. This is a pilot-agreement term and the core trust posture — never post for them, never let "just this once" happen.
4. **Quote their hardware, not the benchmark.** OCR speed, match feel, render smoothness — demonstrate on their machines and let their numbers be the story.
