# ARMP Cold Email Sequence — Controllers & VPs of Finance ($20M–$100M, SAP/NetSuite)

Merge fields: `{{FirstName}}`, `{{Company}}`, `{{ERP}}` (SAP / NetSuite), `{{ExportFormat}}` (SAP F-28 / NetSuite Cash Receipt), `{{Signature}}`.
Cadence: Day 0 → Day 4 → Day 9. Stop on any reply.
Rules enforced by automated check: every email under 120 words, no hype words, short sentences, engineer-founder voice. Every claim is measured: the 7-second import and zero-network behavior come from the test bench, not marketing.

---

## Email 1 — The Core Friction Hook (Day 0)

**Subject (ERP-matched):** NetSuite cash receipts without the IT project · *or* · SAP F-28 posting without the IT project

> Hi {{FirstName}},
>
> Quick question. How long did your team spend matching last week's remittances?
>
> Most {{ERP}} shops burn hours on it. Customers pay against POs and tracking numbers. Someone plays detective, line by line.
>
> I built AR Match Pro to end that. It matches from files you already export. Bank statement in, {{ExportFormat}} posting file out. No integration. No IT ticket. Zero implementation days.
>
> You could run your first match today.
>
> Open to a 10-minute look Tuesday?
>
> {{Signature}}

---

## Email 2 — The Proof Point (Day 4)

**Subject:** 100,000 open invoices, loaded in seven seconds

> Hi {{FirstName}},
>
> Two facts from our test bench.
>
> One: the matching engine is indexed. Constant-time lookups. It loads 100,000 open invoices in seven seconds. Match speed stays flat as your book grows.
>
> Two: your IT team will ask where the data goes. Answer: nowhere. Everything runs inside the browser tab. Open DevTools, run a match, watch the Network panel. Zero requests.
>
> That check takes two minutes. Fastest security review they'll do all year.
>
> Want the one-page security sheet?
>
> {{Signature}}

---

## Email 3 — The Low-Friction Offer (Day 9)

**Subject:** risk-free parallel test for {{Company}}

> Hi {{FirstName}},
>
> Last note from me.
>
> Here's a risk-free test. Take your next messy remittance file. Run it through AR Match Pro beside your normal process. Your team posts exactly as today. We just compare results.
>
> One week. Same files. Two numbers measured: auto-match rate, hours spent.
>
> We don't promise a rate upfront. Your file sets the number. That's the point.
>
> If it doesn't convince you, close the tab. Nothing was installed. Nothing left your machine.
>
> Want the one-page pilot plan?
>
> {{Signature}}

---

## Operating notes

1. **Attachment discipline:** nothing on Email 1. Security sheet goes out only when asked (Email 2 reply) — it doubles reply rate as a natural CTA.
2. **Truth ceiling:** if a prospect's volume exceeds 15,000 payment lines/month or 100,000 open invoices, say "not yet" and park them. The load report is the source of truth.
3. **Reply routing:** any reply mentioning "bug," "security review," or "procurement" goes to the founder same-day.
4. **Never guarantee a match rate on their file.** The seeded demo runs at 94% because it's seeded. Their rate depends on their reference quality — the pilot measures it; the emails never promise it.
