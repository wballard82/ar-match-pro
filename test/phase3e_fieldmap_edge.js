// ════════════════════════════════════════════════════════════════════════════
// PHASE 3e — field-mapping auto-detection (two-pass exact→fuzzy) + edge cases
//   Exercises RemittanceParser.parse / _buildColMap / _classifyDocRef and the
//   amount/date normalizers directly (no runMatch needed for these).
// ════════════════════════════════════════════════════════════════════════════
print('\n=== PHASE 3e: field-mapping auto-detect + edge cases ===');

// ── 3e.1 Standard headers auto-map to canonical fields ──────────────────────
print('\n[3e.1] Header: Customer | Payment Date | Invoice No | PO Number | Amount');
var p1 = RemittanceParser.parse([
  ['Customer', 'Payment Date', 'Invoice No', 'PO Number', 'Amount'],
  ['Acme Co', '2026-06-23', '5105001466', '4500001466', '18140.00'],
], { fileName: 't3e1.csv' });
T.eq(p1.colMap.custName, 0, '3e.1 custName→col0');
T.eq(p1.colMap.paymentDate, 1, '3e.1 paymentDate→col1');
T.eq(p1.colMap.invNo, 2, '3e.1 invNo→col2');
T.eq(p1.colMap.poNo, 3, '3e.1 poNo→col3');
T.eq(p1.colMap.amt, 4, '3e.1 amt→col4');
T.ok(p1.lines.length === 1 && p1.lines[0].invNo === '5105001466', '3e.1 data row parsed');

// ── 3e.2 Varied/aliased headers still auto-map ──────────────────────────────
print('\n[3e.2] Header: Payer From | Value Date | Billing Document | Purchase Order | Remittance Amount');
var p2 = RemittanceParser.parse([
  ['Payer From', 'Value Date', 'Billing Document', 'Purchase Order', 'Remittance Amount'],
  ['Globex', '2026-06-23', '5105002000', '4500002000', '5000.00'],
], { fileName: 't3e2.csv' });
T.eq(p2.colMap.custName, 0, '3e.2 "Payer From"→custName');
T.eq(p2.colMap.paymentDate, 1, '3e.2 "Value Date"→paymentDate');
T.eq(p2.colMap.invNo, 2, '3e.2 "Billing Document"→invNo');
T.eq(p2.colMap.poNo, 3, '3e.2 "Purchase Order"→poNo');
T.eq(p2.colMap.amt, 4, '3e.2 "Remittance Amount"→amt');

// ── 3e.3 Two-pass: EXACT match wins over FUZZY (Customer vs Customer Account)
print('\n[3e.3] Header: Customer | Customer Account | Amount | Invoice Number');
var p3 = RemittanceParser.parse([
  ['Customer', 'Customer Account', 'Amount', 'Invoice Number'],
  ['Initech', '30037138', '1000.00', '5105003000'],
], { fileName: 't3e3.csv' });
T.eq(p3.colMap.custName, 0, '3e.3 "Customer" exact→custName (not fuzzy-grabbed by custAcct)');
T.eq(p3.colMap.custAcct, 1, '3e.3 "Customer Account" exact→custAcct');
T.eq(p3.colMap.amt, 2, '3e.3 amt→col2');
T.eq(p3.colMap.invNo, 3, '3e.3 "Invoice Number"→invNo');

// ── 3e.4 SAP doc-prefix classifier (510/210/710/310/410, 1Z, SS) ────────────
print('\n[3e.4] SAP doc-prefix classification');
var pf = SAP_DOC_PARSER_PROFILE.docPrefixes;
T.ok(_classifyDocRef('5105001466', pf).field === 'invNo', '3e.4 510…→invNo');
T.ok(_classifyDocRef('2104105623', pf).field === 'soNo', '3e.4 210…→soNo');
T.ok(_classifyDocRef('7105001234', pf).field === 'delNo', '3e.4 710…→delNo');
T.ok(_classifyDocRef('3105000001', pf).field === 'creditMemo', '3e.4 310…→creditMemo');
T.ok(_classifyDocRef('4105000001', pf).field === 'debitMemo', '3e.4 410…→debitMemo');
T.ok(_classifyDocRef('1Z999AA10123456784', pf).field === 'trkNo', '3e.4 1Z…→trkNo (UPS)');
T.ok(_classifyDocRef('SS260312-DS1', pf).field === 'poNo', '3e.4 SS…→poNo');
T.ok(detectInvoiceNumber('5105001466') === '5105001466', '3e.4 detectInvoiceNumber');
T.ok(detectSalesOrder('2104105623') === '2104105623', '3e.4 detectSalesOrder');
T.ok(detectDeliveryNumber('7105001234') === '7105001234', '3e.4 detectDeliveryNumber');
T.ok(detectDHLTracking('3/12/2026 DHL 5213011672') === '5213011672', '3e.4 detectDHLTracking');

// ── 3e.5 Amount normalization — currency symbols, commas, parens, negatives ─
print('\n[3e.5] _parseRemAmt edge cases');
T.near(_parseRemAmt('$1,234.56'), 1234.56, 0.001, '3e.5 "$1,234.56"→1234.56');
T.near(_parseRemAmt('1,234.56'), 1234.56, 0.001, '3e.5 "1,234.56"→1234.56');
T.near(_parseRemAmt('(1,200.00)'), -1200, 0.001, '3e.5 "(1,200.00)"→-1200 (accounting negative)');
T.near(_parseRemAmt('-500.00'), -500, 0.001, '3e.5 "-500.00"→-500');
T.near(_parseRemAmt('0.00'), 0, 0.001, '3e.5 "0.00"→0');
T.near(_parseRemAmt('$0.00'), 0, 0.001, '3e.5 "$0.00"→0');
T.near(_parseRemAmt(''), 0, 0.001, '3e.5 ""→0');
T.near(_parseRemAmt('  $ 9,999.99 '), 9999.99, 0.001, '3e.5 spaced "$ 9,999.99"→9999.99');

// ── 3e.6 Date normalization — valid + malformed (no crash) ──────────────────
print('\n[3e.6] _fmtRdDate edge cases');
T.eq(_fmtRdDate('2026-06-23'), '06/23/2026', '3e.6 ISO→US');
T.eq(_fmtRdDate('06/23/2026'), '06/23/2026', '3e.6 US passthrough');
T.ok(typeof _fmtRdDate('notadate') === 'string', '3e.6 garbage date does not crash');
T.eq(_fmtRdDate(''), '', '3e.6 empty→empty');

// ── 3e.7 Zero-dollar & negative lines through parse ─────────────────────────
print('\n[3e.7] zero-dollar line kept (has ref); ref-less zero line skipped');
var p7 = RemittanceParser.parse([
  ['Customer', 'Invoice No', 'Amount'],
  ['Z Co', '5105004000', '0.00'],     // zero but has invoice ref → kept
  ['Z Co', '', '0.00'],               // no ref, zero → skipped
  ['Z Co', '5105004001', '-250.00'],  // negative (credit) → kept
], { fileName: 't3e7.csv' });
T.eq(p7.lines.length, 2, '3e.7 two lines kept (zero-with-ref + negative), ref-less zero dropped');
T.near(p7.lines[1].amt, -250, 0.01, '3e.7 negative amount preserved');

// ── 3e.8 Leading-zero invoice number resolves (strip-zeros match) ───────────
print('\n[3e.8] payment note "INV 0001234" resolves to ledger invoice "1234"');
ARMP.reset();
ARMP.inv({ c: 'Lead Co', a: '90010001', i: '1234', amt: 1234 });
var found = _findInvoicesForPayment({ n: 'INV 0001234', amt: 1234, a: '90010001', c: 'Lead Co' });
T.ok(found.length === 1 && found[0].i === '1234', '3e.8 leading-zero ref matched open invoice');

// ── 3e.9 Missing customer name cascades from prior row ──────────────────────
print('\n[3e.9] blank customer cell cascades from previous row');
var p9 = RemittanceParser.parse([
  ['Customer', 'Invoice No', 'Amount'],
  ['Cascade Inc', '5105005000', '100.00'],
  ['', '5105005001', '200.00'],   // missing name → cascade
], { fileName: 't3e9.csv' });
T.eq(p9.lines.length, 2, '3e.9 both rows parsed');
T.eq(p9.lines[1].custName, 'Cascade Inc', '3e.9 missing name cascaded from prior row');

T.summary();
