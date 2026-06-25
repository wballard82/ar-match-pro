# ARMP Matching Engine — Headless Test Results

**App under test:** `app.html` (single-file deploy) — treated as source of truth.
**Harness:** `test/harness.js` + per-phase test files, running under **JavaScriptCore (`jsc`)**.
**Run:** `bash test/run.sh`  (or `jsc test/harness.js test/<file>.js`)
**Status:** ✅ **139 / 139 assertions passing** across 8 suites.
**Last updated:** 2026-06-24

| Suite | Assertions | Result |
|---|---|---|
| smoke (engine load) | 25 | ✅ |
| phase2_2B (subset-sum 2B fix) | 6 | ✅ |
| phase3a_references | 14 | ✅ |
| phase3b_subsetsum (+ ambiguity rule + dedicated type) | 14 | ✅ |
| phase3c_variance | 13 | ✅ |
| phase3d_memos_dupes_coa | 13 | ✅ |
| phase3e_fieldmap_edge | 43 | ✅ |
| phase3f_bridge_ers_vmi | 11 | ✅ |
| **TOTAL** | **139** | ✅ |

> Was 138; +1 is the new assertion confirming ambiguous lumps route to the
> dedicated **`Ambiguous`** exception type (its own Needs-Attention chip).

---

## How the harness works (Phase 1)

Node is not installed on this machine; the harness runs under the system
**JavaScriptCore** shell (`/System/.../Helpers/jsc`). It loads the **real**
engine out of `app.html` with **zero edits to make it testable**:

1. `harness.js` installs headless shims on `globalThis` — a recursive `Proxy`
   DOM (`document`, elements), `localStorage`, `window`/event APIs, `XLSX`,
   `FileReader`/`Blob`/`URL`, etc. Form-input reads (`s-inv`/`s-po`/`s-so`
   checkboxes) return `checked=true` so every match pass stays enabled.
2. It extracts **every inline `<script>` block** from `app.html` (11 blocks; the
   3 external CDN `<script src=…>` tags are skipped), concatenates them to
   `test/_appbundle.js`, and `load()`s it. `load()` shares top-level
   `let`/`const`, so **all** engine globals come alive in one scope:
   `INV, PAY, RES, EXC, runMatch, _findInvoicesForPayment, findSub, findSubset,
   RemittanceParser, _buildColMap, ConfidenceScorer, _classifyDocRef,
   RM_FIELD_MAPS, SAP_DOC_PARSER_PROFILE, MatchScenarioLibrary,
   matchERSGrouped, matchVMIDateRange, DateRangeMatcher, …`.
3. A thin `ARMP` test API wraps the real engine: `ARMP.reset()`, `ARMP.inv({…})`,
   `ARMP.pay({…})`, `ARMP.match()` → runs the **real** `runMatch()` and snapshots
   `RES`/`EXC`/`INV`.

**Fidelity note.** `runMatch()` runs its full matching pass (Priorities 0–8 +
ERS/VMI tie-out) and *then* a DOM render pass (`rAll`/`rInv`/…). The render pass
is browser-only and throws harmlessly under the shim; `RES`/`EXC` are fully
populated **before** render, so `ARMP.match()` snapshots results whether the
render tail throws or not. **Matching logic = verified headlessly. Rendering/UI =
must be tested in the browser.** Engine load is clean: `loadError: null`.

### Data model (discovered from `app.html`, mirrored in fixtures)
- **INV row:** `c` customer, `a` account, `i` invoice#, `po`, `so`, `amt`,
  `dt` doc-type, `dt2` invoice date, `due`, `d` accounting doc#, `t` tracking#,
  `dl` delivery#, `s` settled-flag (set during match).
- **PAY row:** `a, c, amt, po, i, so, m, txType, txId, payDate, ccy, n, coa`
  (+ engine-set `_remLines, _creditMemo, _debitMemo, trackingNo, _ambigCombos`).
- **SAP doc-prefix classifier:** `510→invNo, 210→soNo, 710→delNo, 310→creditMemo,
  410→debitMemo`; string prefixes `1Z→trkNo`, `SS→poNo`.
- **runMatch priority chain:** P0 multi-ref-from-notes → P1 invoice#/doc# →
  P2 SO group → P3 PO group → P4 tracking# → P5 delivery# → P5b delivery bridge →
  P6 account+amount(single) → **P7 account/name subset-sum (`_findInvoicesForPayment`)**
  → P5c ERS/VMI remittance tie-out → P8 credit/debit memo → TK-F delivery bridge
  → multi-source → P9 oldest-invoice → exception routing (Duplicate / Cash on
  Account / Unmatched). Tolerance = **$1**.

---

## Full results matrix

Legend: **Expected** vs **Actual**, all ✅ PASS.

### Phase 2 — pending 2B fix (subset-sum allocation by account)
| # | Scenario | Expected | Actual |
|---|----------|----------|--------|
| 2B | Lump $100,205.95 (no refs), acct 30037138, 5 open invoices | Auto-allocate across all 5 as Exact; **not** Cash on Account | 5/5 picked, total ties to $100,205.95, all Exact, 0 COA — via exact-total shortcut |

### Phase 3a — reference-based matching
| # | Scenario | Expected | Actual |
|---|----------|----------|--------|
| 3a.1 | Clean invoice# match (510…) | 1 Direct-invoice Exact, 0 exc | ✅ |
| 3a.2 | PO group (2 invoices, PO 4522100001 → 39,700) | 2 invoices PO-group Exact, ties, 0 exc | ✅ |
| 3a.3 | SO group (2 invoices, SO 2104999001 → 12,500) | 2 invoices SO-group Exact, ties, 0 exc | ✅ |
| 3a.4 | Two invoice#s embedded in payment notes | 2 invoices multi-invoice match, 0 exc | ✅ |

### Phase 3b — lump-sum subset-sum (incl. ambiguity rule)
| # | Scenario | Expected | Actual |
|---|----------|----------|--------|
| 3b.1 | Single distinct combination {70,130}=200 | Auto-apply the 2 invoices, no COA | ✅ |
| 3b.2 | All-invoices exact-total 100/80/120=300 | All 3 applied, no COA | ✅ |
| 3b.3 | **Ambiguous** {100,100} OR {50,150}=200 | **Auto-apply NOTHING**, 1 review exc (type=`Ambiguous`) listing both combos, left Open | ✅ |
| 3b.4 | Control: unique {100,150}=250 | Auto-applied, no false-ambiguity exc | ✅ |

### Phase 3c — short pay / overpay / partial (tolerance $1)
| # | Scenario | Expected | Actual |
|---|----------|----------|--------|
| 3c.1 | Short within tol (−$0.50) | Exact, no exc | ✅ |
| 3c.2 | Short beyond tol (−$100) | Matched Short pay, 1 Short pay exc, vr −100 | ✅ |
| 3c.3 | Over within tol (+$0.75) | Exact, no exc | ✅ |
| 3c.4 | Over beyond tol (+$250) | Matched Overpay, 1 Overpay exc, vr +250 | ✅ |
| 3c.5 | Partial (pay 6,000 of 10,000) | Short pay path, open balance −4,000 flagged | ✅ |

### Phase 3d — memos / duplicates / COA / multi-customer
| # | Scenario | Expected | Actual |
|---|----------|----------|--------|
| 3d.1 | Credit memo 310… offset | Applied as Credit Memo | ✅ |
| 3d.2 | Debit memo 410… offset | Applied as Debit Memo (via P8) | ✅ |
| 3d.3 | Duplicate payment (same inv/amt/date) | Invoice applied **once**, 2nd flagged Duplicate | ✅ *(engine fix — see Fixes)* |
| 3d.4 | Cash-on-Account flag (coa=true) | Nothing applied, Unapplied/COA exc | ✅ |
| 3d.5 | Known customer, no ref, no tie | Cash on Account exc | ✅ |
| 3d.6 | Unknown payer (no acct/cust/ref) | Unmatched exc | ✅ |
| 3d.7 | Multi-customer bank file (3 payers) | Each tied to correct customer, no cross-leak, 0 exc | ✅ |

### Phase 3e — field-mapping auto-detect + edge cases
| # | Scenario | Expected | Actual |
|---|----------|----------|--------|
| 3e.1 | Standard headers auto-map | custName/date/inv/po/amt → correct cols | ✅ |
| 3e.2 | Aliased headers (Payer From / Value Date / Billing Document / Purchase Order / Remittance Amount) | Correct canonical mapping | ✅ |
| 3e.3 | **Two-pass exact-over-fuzzy** (Customer vs Customer Account) | "Customer"→custName (not fuzzy-grabbed), "Customer Account"→custAcct | ✅ |
| 3e.4 | SAP prefix classify 510/210/710/310/410, 1Z, SS + detectors | All correct | ✅ |
| 3e.5 | Amounts: $, commas, (parens)=neg, −, 0, blank, spaced | All normalized correctly | ✅ |
| 3e.6 | Dates: ISO→US, passthrough, garbage (no crash), empty | All safe | ✅ |
| 3e.7 | Zero-dollar line (kept w/ ref; dropped w/o ref); negative preserved | ✅ |
| 3e.8 | Leading-zero invoice ("INV 0001234" → ledger "1234") | Matched via strip-zeros | ✅ |
| 3e.9 | Missing customer name cascades from prior row | ✅ |

### Phase 3f — delivery bridge / ERS / VMI
| # | Scenario | Expected | Actual |
|---|----------|----------|--------|
| 3f.1 | **Delivery bridge** tracking 1Z…→Del 710…→SO 210…→Inv 510… (through real `runMatch`) | Invoice matched, lineage chain Delivery→SO→Invoice | ✅ |
| 3f.2 | ERS PO-grouped tie-out (2 POs → 2 invoices, $33,450.34) | Both tied, correct invoices, total ties | ✅ |
| 3f.3 | ERS PO with no aging invoice | Only the invoiced PO matched; unmatched PO recorded for COA | ✅ |
| 3f.4 | VMI line in PO date range 05/01–05/31 | In-range invoice matched | ✅ |
| 3f.5 | VMI line outside date range (July) | Correctly **not** matched (conservative) | ✅ |

---

## Fixes made to `app.html`

All fixes are minimal/surgical; the file remains one coherent deploy artifact.

### Fix 1 — Ambiguous lump subset-sum routes to review (product rule)
**Where:** `_findInvoicesForPayment` (+ new `_enumDistinctSubsets` helper) and
`runMatch` Priority 7.
**Before:** The code comment promised "auto-apply only when unambiguous," but it
applied the **first** combination `findSub()` returned — it never checked for a
second valid combination. A lump with 2+ combinations tying to the amount would
be silently auto-allocated to a guessed combination.
**After (per your decision):** A new bounded enumerator finds up to two **distinct**
subsets. Exactly one → auto-apply (unchanged). **Two or more → auto-apply nothing**;
`runMatch` raises one Needs-Attention exception listing the candidate combinations
("…specialist must choose: 5105130001+5105130002 OR 5105130003+5105130004"),
left Open for a specialist. Single-combination and the all-invoices exact-total
shortcut are untouched, so **2B still auto-allocates** (verified).

### Fix 3 — Dedicated "Ambiguous / Choose combination" Needs-Attention chip
**Where:** the Needs-Attention chip bar (HTML), both exception filter dropdowns
(`exc-type-filter`, `ws-exc-type-filter`), the `typeIcon`/`typeSev` maps, the
`naUpdateChipCounts` type list, and the `runMatch` Priority-7 exception `type`.
**Change:** ambiguous lumps previously surfaced under the existing **"Missing
Invoice / Unmatched"** chip. They now route to their own exception
**`type:'Ambiguous'`** (icon 🔀, high severity) and a dedicated chip
**"Ambiguous / Choose combination"** sits alongside the others. The exception
`detail` lists the candidate combinations, and a new `ambigCombos` field carries
them explicitly for the specialist's pick. **Only the exception type/bucket
changed — the ambiguity *detection* logic in `_findInvoicesForPayment` is
untouched.** Other chips (Short pay, Missing Invoice, Duplicate, Cash on Account,
Bank Fee, Missing PO, Overpay) are unchanged and still counted/filtered.
**Headless coverage:** test 3b.3 asserts the exception `type === 'Ambiguous'`
(engine wiring). The chip's *rendering* is browser-only — see below.

### Fix 2 — Duplicate payment no longer double-applies cash (correctness bug)
**Where:** `_findInvoicesForPayment` reference-match path.
**Bug found by test 3d.3:** the ref path matched invoices **without checking the
settled flag** (`!v.s`), unlike its own subset-sum path which already filters it.
A duplicate payment referencing an already-matched invoice was **re-applied via
Priority 7** instead of being flagged — double-counting cash against one invoice.
**After:** the ref path now requires `!v.s`, so a duplicate falls through to the
duplicate-detection exception. Consistent with the subset-sum path; no regression
across the other 137 assertions.

---

## What was verified HEADLESSLY vs. what to test in the BROWSER

### ✅ Verified headlessly (real engine logic, this report)
- Full `runMatch()` priority chain end-to-end for: invoice#, PO group, SO group,
  multi-ref-from-notes, account/name subset-sum, account+amount, delivery bridge
  (tracking→delivery→SO→invoice), credit/debit memo, duplicate detection,
  Cash-on-Account, Unmatched, multi-customer files.
- Subset-sum **ambiguity routing** (the new rule) and single-combination /
  exact-total auto-apply.
- Short pay / overpay / partial variance handling within & beyond the $1 tolerance.
- ERS PO-group tie-out and VMI date-range matching (via their real top-level
  matchers `matchERSGrouped` / `matchVMIDateRange`).
- `RemittanceParser` field auto-detection: two-pass exact-then-fuzzy, varied/aliased
  headers, header-row detection, customer cascade.
- SAP doc-prefix classifier + `detect*` helpers; amount/date normalizers; edge
  cases (zero, negative, parens, currency symbols, malformed dates, leading zeros,
  missing names).

### 🌐 Must be tested in the browser (out of headless scope)
0. **NEW — "Ambiguous / Choose combination" chip (Fix 3).** The engine wiring
   (exception `type:'Ambiguous'` + `ambigCombos` payload) is headless-verified
   (test 3b.3), but the **chip itself is a UI element that could NOT be verified
   headlessly** (the harness stubs the DOM). Confirm in the browser:
   (a) the chip **renders** in the Needs-Attention bar with the 🔀 icon and a
   live count; (b) clicking it **filters** the exception list to only ambiguous
   payments and does **not** disturb the other chips' counts/filters;
   (c) ambiguous lumps **group** under this chip (not under "Missing Invoice");
   (d) the exception card shows the **candidate combinations** and the
   specialist's **combination-pick / resolution flow** works end-to-end. Use a
   lump with 2+ valid invoice combinations (e.g. invoices 100/100/50/150 + a
   $200 reference-less payment) to trigger it.
1. **Rendering / UI** — every render path (`rAll`, `rInv`, Needs-Attention panel,
   filter chips, dashboards, CFO summary, worklist). The harness deliberately
   stubs the DOM; nothing about visual output is verified here.
2. **File-import pipelines** — CSV/XLSX/XML parsing into `INV`/`PAY`/`DELIV`/
   `ERS_LINES`/`VMI_LINES`, OCR, AI remittance parse, and the construction of the
   delivery/tracking bridge indexes (`_TRK_BRIDGE`, `_DELIV_BRIDGE`,
   `_buildDelivIndexes`). Here those structures were populated directly; the
   parsers that build them from real files are browser-tested. (The provided
   `Test CSV/` files are good inputs for this.)
3. **ERS/VMI through the full Priority 5c gate** — the *matchers* are verified,
   but the runMatch gating (`_remTotal` must tie to the payment within
   5%/$25k before 5c fires, and only when P7 didn't already resolve) depends on
   import-built `ERS_LINES`/`VMI_LINES` and real payment/account conditions.
   Validate an end-to-end ERS or VMI file in the browser.
4. **Persistence & integrations** — IndexedDB (`ArmpDB`), localStorage profiles,
   customer-learning writes, Stripe/checkout, plan gating, exports (CSV/PDF).
5. **Manual workspace** — the engine workspace (`engConfirm`, partial allocation,
   write-offs, bank-fee handling) that produces the `Partial` status and lets a
   specialist resolve exceptions (incl. the new ambiguous-allocation reviews).

---

## Open items / decisions for you
- **RESOLVED — dedicated "Ambiguous / Choose combination" chip** is now wired in
  (Fix 3). Its rendering/filter/pick flow is the one remaining item to confirm
  in the browser (see Browser item 0 above).

## Reproduce
```bash
bash test/run.sh                 # whole suite
bash test/run.sh phase3b_subsetsum   # one suite
```
