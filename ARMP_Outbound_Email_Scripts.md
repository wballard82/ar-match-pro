# AR Match Pro — Outbound Cold Email Scripts

Every claim below is true of the shipped product as tested: file-based imports (no integration), native FBL5N / NetSuite export compatibility, SAP F-28 / NetSuite Cash Receipt / D365 F&O posting files, conservative matching with an audit trail, client-side processing, and the 30-day shadow pilot. Do not add claims beyond these — the security sheet and demo have to cash every check the email writes.

**Targeting note:** send to Controllers, Assistant Controllers, and AR Managers (they feel the pain daily and can champion); CC-level goes in the pilot readout, not the cold email.

---

## Track A — NetSuite (wholesale & distribution, $30M–$80M)

**Subject options (pick one, A/B them):**
- Cash application without the NetSuite SuiteApp project
- Your AR team's Monday morning, minus the bank-file matching
- 80%+ of cash receipts, applied before coffee

**Email 1:**

> Hi {{FirstName}},
>
> Quick question: how many hours does your AR team spend each week matching bank deposits to open invoices in NetSuite — especially the payments where the customer quotes a PO or a tracking number instead of an invoice?
>
> AR Match Pro applies cash automatically from the files you already have: your open-invoice saved search, the bank file, and whatever remittance advice customers send (spreadsheets, PDFs, even screenshots). It outputs a clean **NetSuite Cash Receipt import file**. No SuiteApp, no integration project, no IT ticket — it runs in a browser and your data never leaves your team's machine.
>
> The way we prove it: a **30-day shadow pilot**. Your team keeps posting exactly as today; ARMP runs in parallel on the same files once a week. In week 3 we reconcile line-by-line against what your team actually posted. You convert only if the numbers convince you.
>
> Worth a 15-minute look? I'll demo on synthetic data — you don't need to share anything to see it match.
>
> {{Signature}}

**Follow-up 1 (day 4):**

> Hi {{FirstName}} — one number from the demo data set: 94% of payment dollars auto-applied, with every exception arriving pre-researched (the posting note already written). If month-end cash application is on your list of things to fix this year, 15 minutes will tell you whether this is it.

**Follow-up 2 (day 10, breakup):**

> Hi {{FirstName}} — closing the loop. If unapplied cash isn't a pain point right now I'll stop here. If it is but the timing's wrong, reply "Q4" and I'll come back then with the security data sheet your IT team will ask for anyway.

---

## Track B — SAP (tier-2 automotive, industrial packaging, aerospace components, $50M–$120M)

**Subject options:**
- F-28 posting files from your FBL5N export — same day, no project
- Cash application accelerator for SAP, without the SAP module price tag
- The remittance says "SS260409-KB3", not an invoice number. Now what?

**Email 1:**

> Hi {{FirstName}},
>
> If your customers pay against POs, delivery numbers, or shipment references instead of invoice numbers, your AR team is doing detective work on every remittance line. That's the exact problem AR Match Pro was built on.
>
> It takes your **FBL5N export as-is** (Billing Document, Payment reference, Reference Key 3 — all mapped automatically), your bank statement, and the customer's remittance — then bridges shipment references through your delivery report to the right invoice, applies exact-tying lines, and outputs a standard **SAP F-28 posting file**. Anything that doesn't tie exactly is never guess-applied; it lands in an exception queue with the research already done and the Cash-on-Account note pre-written in your convention.
>
> No implementation project: it's a browser app, live the same day, and your financial data is processed entirely on your team's machine — a two-minute Network-tab check your IT team can verify themselves.
>
> We prove it with a **30-day shadow pilot** alongside your current process — week 3 is a line-by-line reconciliation against what your team actually posted.
>
> Open to a 15-minute demo? Synthetic data, nothing to share, nothing to install.
>
> {{Signature}}

**Follow-up 1 (day 4):**

> Hi {{FirstName}} — a real example of what the matcher handles: a customer wire where one remittance line quoted an invoice number that had been rebilled under a new number. ARMP traced the tracking number → delivery → sales order → found the reissued invoice at the exact amount, and applied it — with the full chain shown for the auditor. That's the level of detective work your team stops doing manually.

**Follow-up 2 (day 10, breakup):**

> Hi {{FirstName}} — last note from me. If cash application isn't the bottleneck, I'll close this out. If it is, the 15-minute demo costs you nothing and the pilot doesn't touch your ledger. Either way — the security one-pager is attached for whenever the topic comes up internally.

---

## Rules of engagement

1. **Attach nothing to Email 1** (deliverability). Security sheet goes out after the first reply, or with follow-up 2.
2. **Never promise volumes beyond the tested guardrails**: ≤15K payment lines/month, ≤100K open invoices. If a prospect is bigger, say so honestly and park them — an honest "not yet" now beats a crashed pilot later.
3. **Demo Mode is the demo.** Load it live on the call (1,000 invoices, one click, Auto Match in front of them). Never demo on their data in call one.
4. **The pilot ask is the only ask.** Don't quote annual pricing in cold email; pricing enters at the week-4 readout with their own ROI numbers on the slide.
