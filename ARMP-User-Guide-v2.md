# AR Match Pro — User Guide & Reference Manual

**Version:** 2.0
**Date:** June 2026
**Platform:** Web — Single-page application (Netlify hosted)
**Support:** info@armatchpro.com · armatchpro.com

---

## Table of Contents

1. Overview & Key Concepts
2. Getting Started
3. Dashboard & KPI Cards
4. Importing Data
5. The SAP Delivery Bridge — Deterministic Matching
6. Cash Application Workflow
7. Exception Management
8. AI Remittance Parser (NEW in v2.0)
9. Customer Learning & Profiles (NEW in v2.0)
10. Historical Trends Dashboard (NEW in v2.0)
11. Review Tab
12. Reconcile Tab
13. Invoices & Remittance Panels
14. Posting Export
15. Reports
16. CFO Summary
17. Settings
18. Keyboard Shortcuts & Power-User Tips
19. Troubleshooting & Support

---

## 1. Overview & Key Concepts

AR Match Pro is an **enterprise-grade Accounts Receivable cash application platform** purpose-built for SAP-shop AR teams handling complex multi-channel payments (ERS, VMI, lockbox, ACH, wire). It automates matching incoming payments to open invoices using **deterministic SAP data lineage** — every match traces to a clear, auditable reason. No black-box AI predictions.

### What makes ARMP different

| Capability | What it does | Why it matters |
|---|---|---|
| **SAP Delivery Bridge** | Uses your delivery report (PO → SO → invoice lineage) for exact-amount matching | Audit-friendly. Every match has a concrete data path. |
| **Conservative matching** | Routes ambiguous payments to Cash on Account instead of partial-paying | No false matches. No stuck cash from misallocation. |
| **Per-line COA postings** | Each unmatched ERS/VMI line becomes its own posting entry | Maps 1:1 to your AR team's manual allocation spreadsheet |
| **Customer learning** | Persists per-customer matching patterns across sessions | ARMP recognizes Applied Materials, Celestica, etc. on subsequent encounters |
| **AI Remittance Parser** | Extracts structured remittance from unstructured emails/PDFs | Handles the 20% of cases that defeat column-based parsers |

### Key Metrics

| Term | Definition |
|---|---|
| **Auto-Match Rate (STP)** | % of payments matched automatically. ≥80% is excellent. |
| **DSO — Days Sales Outstanding** | (Open Balance ÷ Matched Revenue) × 30. Lower is better. |
| **Match Confidence** | 0–100% score on every match. 98% = VMI explicit, 96% = ERS residual, 92% = generic COA. |
| **Unapplied Cash** | Payments received but not yet matched. |
| **Short Pay / Overpay** | Payment < or > invoice amount. Requires resolution. |
| **Exception** | Any payment that couldn't auto-match and needs manual review. |
| **Posting Export** | Final file for ERP import (SAP F-28, NetSuite, D365, generic CSV). |

### Workflow

```
Import Invoices → Import Remittance → Run Auto-Match → Review Exceptions → Approve → Export to ERP
```

All steps are reversible until the posting export is downloaded.

---

## 2. Getting Started

### Logging In

Navigate to your AR Match Pro URL. New users register from the login screen.

### Free Trial

Click **Start 7-Day Free Trial** for full Pro access — no credit card required. Trial data persists in your browser between sessions.

### Loading Sample Data

- **Invoices tab** → "Load sample" → 17 sample invoices including the Pinnacle Systems multi-invoice PO case
- **Remittance tab** → "Load JPM" or "Load BOA" → bank-tagged sample payments

### Navigation

| Section | Purpose |
|---|---|
| Today's Work | Worklist dashboard with urgent exceptions |
| Cash Application | Main workspace: match, review, reconcile, export |
| Invoices | View, edit, import, manage open invoices |
| Remittance | View, edit, import remittance details |
| CFO Summary | Executive view with **NEW Trends Dashboard** |
| Posting Export | Final review & ERP file download |
| Reports | Operational metrics |
| Settings | Account, matching rules, plan management |

---

## 3. Dashboard & KPI Cards

The KPI strip displays real-time metrics. Each card is clickable and navigates to the relevant section.

| Card | Color | Click → |
|---|---|---|
| Cash Matched | Green | Reconcile tab |
| Match Rate | Blue | Reports |
| Unapplied Cash | Gold | To Be Matched |
| Exceptions | Red | All Exceptions |
| Short Pays | Orange | Exceptions, filtered |
| Invoices / Payments | Neutral | Respective panels |

---

## 4. Importing Data

ARMP accepts data in CSV, Excel, BAI2, CAMT.053, OFX, MT940. Column names auto-detect — no template required.

### Auto-Detected Column Names

Standard SAP and NetSuite exports recognized:

| Field | Recognized variants |
|---|---|
| Customer Name | Name, Name1, Debtor Name, Sold-to Name |
| Account # | KUNNR, Customer Account, Debtor Number |
| Invoice # | BELNR, Document Number, Reference |
| PO Number | EBELN, Purchase Order, Customer PO, Assignment, ZUONR |
| Sales Order | VBELN, SO, Sales Document |
| Amount | WRBTR, DMBTR, Net Due, Open Amount |
| Invoice Date | BLDAT, BUDAT, Document Date |
| Due Date | ZFBDT, Net Due Date, Maturity Date |

### Delivery Report — Persistent Index (NEW in v2.0)

Upload your SAP delivery report once. ARMP **persists it locally** (IndexedDB) so subsequent sessions load it automatically. The "Delivery index: 13,162 records · last updated today" indicator confirms the persisted state.

Click "Clear" in the indicator to wipe and re-upload.

---

## 5. The SAP Delivery Bridge — Deterministic Matching

This is ARMP's primary differentiator. When you upload an SAP delivery report alongside your AR aging file, ARMP uses the delivery → SO → invoice lineage to deterministically match payments — no ML predictions, no opaque scoring.

### How it works

For each ERS line in a customer's payment:

1. **Look up the delivery row** by PO + amount (built into an O(1) index at import time)
2. **Resolve the Sales Order** from the delivery row
3. **Find the matching open invoice** in the SO's candidates (exact-amount only)
4. **Apply the payment** with full data lineage stored in the audit trail

### Conservative philosophy

If the amount doesn't tie exactly to a specific aging invoice, ARMP **does NOT partial-pay** — it routes the line to Cash on Account with a detailed reference (`COA for SO 2104422821`, `VC;;05/05/2026`).

**Why:** Partial-paying an unrelated invoice creates "stuck cash" that auditors flag and that requires manual reversal. ARMP's approach: when in doubt, COA — never guess.

### ERS / VMI consolidated payments

ARMP natively handles SAP-shop AR scenarios:

- **ERS (Evaluated Receipt Settlement)** — customer self-billing with PO references
- **VMI (Vendor-Managed Inventory)** — `VC;;DATE` references with no specific invoice
- **Consolidated wires** — 40-50 invoices in one bank payment

Each unmatched ERS line and each VMI line becomes its own Cash on Account exception with the specific reference preserved.

---

## 6. Cash Application Workflow

Cash Application has four tabs: **To Be Matched**, **Review**, **Needs Attention** (formerly Exceptions), and **Reconcile**.

### Auto-Match priority order

| Priority | Match Type | Description |
|---|---|---|
| 1 | Direct Invoice # | Payment references exact invoice number |
| 2 | Document # | Posting document number match |
| 3 | PO Group Match | Sum of invoices on the same PO = payment amount |
| 4 | Sales Order Match | Match by SO reference |
| 5a | **Delivery Bridge (NEW)** | Use SAP delivery report for ERS/VMI routing |
| 5b | Subset Sum | A subset of invoices on the same PO equals the payment |
| 6 | Exception | No match — flagged for manual review |

### Match Confidence Pills (NEW in v2.0)

Every match shows a color-coded confidence pill:
- **Green ≥90%** — Auto-approve safely
- **Amber 70-89%** — Quick verify recommended
- **Red <70%** — Deeper review needed

The pill is visible on both the **Review tab** rows and the **Needs Attention** cards. Click any row/card to see the "Matched by" breakdown (Invoice # ✓, Delivery Bridge ✓, Sales Order ✓, etc.).

---

## 7. Exception Management (Needs Attention)

### Exception Types

| Type | Resolution |
|---|---|
| Short Pay | Write off difference, chase remainder |
| Overpay | Return excess or apply as credit |
| Unmatched | Contact customer to identify payment |
| Missing PO | Request PO from customer |
| Duplicate | Verify with bank; reject if confirmed |
| Cash on Account | Post as unapplied credit |
| Bank Fee | Book to bank fee GL account |

### Per-Line Cash on Account (NEW in v2.0)

For a customer payment like Applied Materials' $247K (which historically required 15 separate posting entries: 3 ERS COA lines for PO 4521689046 + 12 VMI VC date lines), ARMP creates **one EXC per posting line**. Each carries the specific reference note your AR team would type into SAP:

```
💰 Cash on Account · APPLIED MATERIALS · $21,600.00 · VC;;05/05/2026  [98% pill]
💰 Cash on Account · APPLIED MATERIALS · $16,500.00 · COA for SO 2104422821  [96% pill]
💰 Cash on Account · APPLIED MATERIALS · $5,400.00  · VC;;05/05/2026  [98% pill]
... (15 total for this payment)
```

### Bulk Approve (NEW in v2.0)

When 2+ Cash on Account EXCs share the same payment reference, a cyan banner appears at the top of the Needs Attention tab:

```
⚡ 15 Cash on Account postings · APPLIED MATERIALS · $83,654.00
   Same payment (Ref: 2226041757) · Account 40016800
                                       [⚡ Post All as Cash on Account]
```

One click resolves all 15 EXCs with their specific notes preserved.

---

## 8. AI Remittance Parser (NEW in v2.0)

For unstructured remittance — emails, PDFs, vendor portal exports that don't have a clean column structure — the **🤖 AI Parse** button extracts structured remittance lines using Claude.

### How to use

1. Click **🤖 AI Parse** next to "+ Remittance Details" on the Cash Application page
2. First time only: paste your Anthropic API key (stored in your browser's localStorage — never sent to ARMP servers)
3. Paste unstructured text:
   ```
   Hi, our payment of $50,000 is applied as:
   - Invoice 5105123456: $12,500
   - Invoice 5105123457: $20,000
   - PO 4521000123: $17,750 (less $250 damage deduction)
   ```
   OR drag/drop a PDF or image
4. Click **Parse with AI** → ARMP returns structured remittance lines
5. Review the parsed table → click **Add to Remittance** → entries flow into your remittance details for matching

### Tier policy

| Tier | AI Parsing |
|---|---|
| **Starter** ($799/mo) | 50 free parses per month, then $0.05/parse |
| **Pro** ($1,399/mo) | Unlimited parses included |
| **Team** ($2,699/mo) | Unlimited parses included |

### When to use AI parsing

✓ Customer emails with prose remittance instructions
✓ Scanned PDFs from vendor portals
✓ Image attachments of remittance advice
✓ Multi-page PDFs with embedded tables

When NOT to use AI parsing:
✗ Clean CSV/Excel exports — use the regular Remittance Details import (faster, free)
✗ Standard SAP F-28 outputs — column-based parser handles these

---

## 9. Customer Learning & Profiles (NEW in v2.0)

After every Auto-Match, ARMP records what it observed per customer and persists it locally. On subsequent payments from the same customer, ARMP **recognizes them** and surfaces their learned profile.

### What ARMP learns

```json
{
  "name": "APPLIED MATERIALS, INC.",
  "accounts": ["40016800", "40017108"],
  "observedPOFormats": ["##########", "VC;;##/##/####"],
  "avgPaymentAmount": 247274,
  "maxPaymentAmount": 686725,
  "paymentTypes": { "hasERS": true, "hasVMI": true, "hasDelivery": true },
  "encounterCount": 24
}
```

### Where you see it

- **Review tab** — Each customer row shows `🧠 Profile loaded · 24×` badge when ARMP recognizes them from prior sessions
- **CFO Summary** — Customer Profiles grid showing top customers by encounter count, with badges for payment type mix
- **Settings** — Manage / clear individual profiles if needed

### Why it matters

This is the explainable alternative to ML "learning":
- **Transparent** — every observation is a readable JSON field, not opaque neural network weights
- **Cold-start friendly** — works from encounter #1, gets richer over time
- **Auditable** — when a controller asks "Why did ARMP confidently match this customer?" the profile is right there

---

## 10. Historical Trends Dashboard (NEW in v2.0)

The **CFO Summary** page now includes a "📈 Historical Trends" section showing operational performance over time. Reads from a persistent match-history store (auto-logged after every Auto-Match run).

### Three charts

1. **Match Rate Trend** — Line chart of the last 10/30/90 runs. Dots color-coded by tier. Stats line shows latest %, average %, trend vs previous run.

2. **Exception Mix** — Donut breaking down the latest run: Exact / Subset Exact / Partial / Cash on Account / Short Pay. Center shows total count.

3. **Customer Profiles Grid** — Top 8 customers by encounter count, each card showing accounts, average payment amount, and badges for payment types (ERS/VMI/Delivery).

### Range selector

Top-right dropdown: switch between 10, 30, or 90 most-recent runs.

### Clear history

"Clear" button wipes all persisted match runs (the customer profiles stay).

---

## 11. Review Tab

Shows all matched records awaiting export. Sources: auto-matching results + manually approved allocations.

### Match Reason Pills (NEW in v2.0)

Below each row's customer header, ARMP displays the specific signals that produced the match:

```
✓ Invoice #  ✓ Delivery Bridge (SAP)  ✓ Sales Order  ✓ PO #  ✓ Amount Tie-Out  ✓ Customer
```

Hover to see the per-signal confidence weighting. This makes every match defensible in an audit.

### Actions

- **Approve** — locks the match for export
- **Revert** — sends back to Needs Attention
- **Remove** — deletes the match row (with confirmation)
- **Export Posting File** — downloads ERP-ready file (next section)

---

## 12. Reconcile Tab

Line-by-line view of matched payments vs invoices with editable **Write-off** and **Bank Fee** columns. Available on Pro and Team.

| Column | Description |
|---|---|
| Customer | From matched invoice |
| Invoice # | Invoice number |
| PO # | Purchase order (if available) |
| Payment / Applied | Original vs applied amounts |
| **Write-off** | Editable — close small variances |
| **Bank Fee** | Editable — bank-deducted amounts |
| Variance | Net of (Applied − Original) − Write-off − Bank Fee. "Ties" = zero. |
| Status | Reconciled / Open |

Enter write-offs within your tolerance policy to clear variances before export.

---

## 13. Invoices & Remittance Panels

Spreadsheet-like views with inline editing, multi-column sorting/filtering, and export. Click any cell to edit. Type in the filter row below headers to filter that column in real-time.

---

## 14. Posting Export

Generate ERP-ready files in the format your team uses.

| Format | Best For |
|---|---|
| **SAP F-28** | SAP cash application posting (KUNNR, BUDAT, BELNR, EBELN, VBELN, WRBTR, WMWST) |
| **NetSuite** | NetSuite Receive Payment import |
| **D365** | Dynamics 365 cash app |
| **Sage X3** | Sage X3 posting |
| **QuickBooks** | QuickBooks IIF |
| **Generic CSV** | Any ERP that accepts delimited imports |
| **Excel** | Manual review with UTF-8 BOM encoding |

Each **Cash on Account** line exports as its own row with the specific note (`VC;;05/05/2026`, `COA for SO 2104422821`) preserved — making it ready to post in SAP without any further editing.

---

## 15. Reports

Operational metrics for AR managers (Pro/Team).

| Metric | Description |
|---|---|
| Cash Matched | Total $ matched this session |
| Auto-Match Rate | STP rate |
| Unapplied Cash | Pending decisions $ |
| Short Pays | Count + $ underpayments |
| DSO | (Open Balance ÷ Matched Revenue) × 30 |
| Exception Aging | Open exceptions count |
| Top Issue Type | Most common exception |

Export as CSV, Excel, or PDF (print → Save as PDF).

---

## 16. CFO Summary

Executive view across monthly / quarterly / YTD periods. Includes the NEW Historical Trends section (see Section 10).

### KPI alert thresholds

| KPI | Default Alert |
|---|---|
| Auto-Match Rate | < 80% |
| DSO | > 45 days |
| Exception Rate | > 10% |

Configure in Settings → CFO Settings.

---

## 17. Settings

### Account
Name, email, role (Specialist / Manager / Controller / CFO / Admin), theme (light/dark).

### Matching Engine
Drag rules to reorder, set tolerance ($), enable/disable Invoice/PO/SO/Bridge passes.

### CFO Settings
Target STP rate, AR labor rate (for ROI), subscription cost, fiscal year start, DSO/exception alert thresholds.

### Anthropic API Key (NEW in v2.0)
For AI Remittance Parser. Stored locally in your browser only. Never sent to ARMP servers. Get a key at [console.anthropic.com](https://console.anthropic.com).

### Change Plan
Upgrade activates immediately. Downgrade at end of billing period.

---

## 18. Keyboard Shortcuts & Power-User Tips

### Keyboard Shortcuts (NEW in v2.0)

Active on the Needs Attention tab:

| Key | Action |
|---|---|
| `J` or `↓` | Next exception |
| `K` or `↑` | Previous exception |
| `A` | Approve suggested action |
| `X` | Reject exception |
| `E` | Open / edit (Apply modal) |
| `/` | Focus filter |
| `?` | Show help |
| `Esc` | Close modal / blur input |

Selected exception card highlighted with a purple outline.

### Power-User Tips

**Bulk approve a payment's COA lines.** When a single payment generates many Cash on Account exceptions (Applied Materials' 15-line VMI+ERS payments), use the cyan bulk-approve banner.

**Reconcile before export.** Always check the Reconcile tab for "Ties" status before downloading the posting file.

**Use the persistent delivery index.** Upload your delivery report once per refresh cycle (monthly or weekly). ARMP remembers it for subsequent sessions.

**Bank-specific workflows.** Filter by bank account before matching when different team members handle JPM vs BOA payments.

**Customer profiles.** Let ARMP build them. They populate automatically. Check the CFO Summary's Customer Profiles grid to see what's been learned.

---

## 19. Troubleshooting & Support

| Issue | Cause | Solution |
|---|---|---|
| Matching finds no results | Account # mismatch between invoices & remittance | Verify accounts match exactly. Edit inline in Invoices panel. |
| Delivery index empty after session | Cleared accidentally | Re-upload delivery report. It'll persist again. |
| AI parser fails | API key invalid or not set | Settings → Anthropic API Key. Verify with a test parse. |
| Exception won't resolve | Invoice already matched or account not found | Check Invoices panel for status. |
| CFO trends empty | No matching runs yet | Run Auto-Match at least once. Trends populate after. |
| Keyboard shortcuts not working | You're in an input field | Press Esc to blur input, then try again. |

### Getting Help

| Channel | How |
|---|---|
| In-app AI support | Click "Contact AR Match Pro" in Settings, or ? Help in topnav |
| Email support | info@armatchpro.com |
| User guide download | Help (?) modal in topnav |
| Documentation | armatchpro.com |

---

*AR Match Pro v2.0 · June 2026 · armatchpro.com · Enterprise AR Automation · All rights reserved.*
