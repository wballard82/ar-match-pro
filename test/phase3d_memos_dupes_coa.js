// ════════════════════════════════════════════════════════════════════════════
// PHASE 3d — credit/debit memos · duplicate detection · COA / unapplied ·
//            unmatched (unknown payer) · multi-customer bank file
// SAP convention: credit memo 310…, debit memo 410…
// ════════════════════════════════════════════════════════════════════════════
print('\n=== PHASE 3d: memos · duplicates · COA · multi-customer ===');
function res(s, p) { return s.RES.filter(p); }
function exc(s, p) { return s.EXC.filter(p); }

(async function () {

  // ── 3d.1 Credit memo offset (310-prefix) ──────────────────────────────────
  print('\n[3d.1] Remittance references credit memo 3105000001 (−$1,200)');
  ARMP.reset();
  ARMP.inv({ c: 'MedCore', a: '70010001', i: '3105000001', amt: -1200 }); // credit memo lives in ledger as negative
  ARMP.pay({ c: 'MedCore', a: '70010001', amt: 1200, txId: 'P-3D1', _creditMemo: '3105000001' });
  var s = await ARMP.match();
  var m = res(s, function (r) { return r.i === '3105000001'; });
  T.ok(m.length === 1 && m[0].st === 'Credit Memo', '3d.1 credit memo offset applied');
  T.ok(m[0] && /Credit memo/.test(m[0].m), '3d.1 attributed to credit memo offset');

  // ── 3d.2 Debit memo offset (410-prefix) ───────────────────────────────────
  // Payment amount differs from the memo amount so Priority 6 amount-match
  // does not grab it first — this isolates the P8 debit-memo code path.
  print('\n[3d.2] Remittance references debit memo 4105000001');
  ARMP.reset();
  ARMP.inv({ c: 'MedCore', a: '70010001', i: '4105000001', amt: 800 });
  ARMP.pay({ c: 'MedCore', a: '70010001', amt: 2000, txId: 'P-3D2', _debitMemo: '4105000001' });
  s = await ARMP.match();
  m = res(s, function (r) { return r.i === '4105000001'; });
  T.ok(m.length === 1 && m[0].st === 'Debit Memo', '3d.2 debit memo offset applied');
  T.ok(m[0] && /Debit memo/.test(m[0].m), '3d.2 attributed to debit memo offset');

  // ── 3d.3 Duplicate payment detection ──────────────────────────────────────
  print('\n[3d.3] Two identical payments for invoice 5105300001 ($2,500, same date)');
  ARMP.reset();
  ARMP.inv({ c: 'Acme', a: '70020002', i: '5105300001', amt: 2500 });
  ARMP.pay({ c: 'Acme', a: '70020002', i: '5105300001', amt: 2500, payDate: '2026-06-01', txId: 'D-1' });
  ARMP.pay({ c: 'Acme', a: '70020002', i: '5105300001', amt: 2500, payDate: '2026-06-01', txId: 'D-2' });
  s = await ARMP.match();
  T.eq(res(s, function (r) { return r.i === '5105300001'; }).length, 1, '3d.3 invoice applied once only');
  T.eq(exc(s, function (e) { return e.type === 'Duplicate'; }).length, 1, '3d.3 second payment flagged Duplicate');

  // ── 3d.4 Cash on Account flag (explicit unapplied) ────────────────────────
  print('\n[3d.4] Payment flagged coa=true (no allocation intended)');
  ARMP.reset();
  ARMP.inv({ c: 'Acme', a: '70030003', i: '5105310001', amt: 9000 });
  ARMP.pay({ c: 'Acme', a: '70030003', amt: 5000, coa: true, txId: 'P-3D4' });
  s = await ARMP.match();
  T.eq(res(s, function (r) { return r.a === '70030003'; }).length, 0, '3d.4 nothing auto-applied');
  T.eq(exc(s, function (e) { return e.type === 'Unapplied payment'; }).length, 1, '3d.4 routed to Unapplied / Cash on Account');

  // ── 3d.5 Customer identified, no reference, no matchable invoice → COA ─────
  // (runMatch requires ≥1 invoice loaded to run; add an unrelated open invoice
  //  on a different account that cannot match this payment.)
  print('\n[3d.5] Known customer+account, no refs, no invoice ties → Cash on Account');
  ARMP.reset();
  ARMP.inv({ c: 'Other Co', a: '99999999', i: '5105999999', amt: 12345 });
  ARMP.pay({ c: 'Lonely Co', a: '70040004', amt: 4321.99, txId: 'P-3D5' });
  s = await ARMP.match();
  T.eq(exc(s, function (e) { return e.type === 'Cash on Account'; }).length, 1, '3d.5 routed to Cash on Account');

  // ── 3d.6 Unknown payer (no account, name, or reference) → Unmatched ────────
  print('\n[3d.6] No account / customer / reference → Unmatched (contact bank)');
  ARMP.reset();
  ARMP.inv({ c: 'Other Co', a: '99999999', i: '5105999999', amt: 12345 });
  ARMP.pay({ amt: 7777.00, txId: 'P-3D6' });
  s = await ARMP.match();
  T.eq(exc(s, function (e) { return e.type === 'Unmatched'; }).length, 1, '3d.6 routed to Unmatched');

  // ── 3d.7 Multi-customer bank file (many payers, one file) ─────────────────
  print('\n[3d.7] One bank file: 3 customers, each pays its own invoice exactly');
  ARMP.reset();
  ARMP.inv({ c: 'Alpha Inc', a: '80010001', i: '5105400001', amt: 1000 });
  ARMP.inv({ c: 'Bravo LLC', a: '80020002', i: '5105400002', amt: 2000 });
  ARMP.inv({ c: 'Charlie Co', a: '80030003', i: '5105400003', amt: 3000 });
  ARMP.pay({ c: 'Charlie Co', a: '80030003', i: '5105400003', amt: 3000, txId: 'M-3' });
  ARMP.pay({ c: 'Alpha Inc', a: '80010001', i: '5105400001', amt: 1000, txId: 'M-1' });
  ARMP.pay({ c: 'Bravo LLC', a: '80020002', i: '5105400002', amt: 2000, txId: 'M-2' });
  s = await ARMP.match();
  T.eq(res(s, function (r) { return r.st === 'Exact'; }).length, 3, '3d.7 all 3 payers matched');
  T.ok(res(s, function (r) { return r.i === '5105400001' && r.a === '80010001'; }).length === 1 &&
       res(s, function (r) { return r.i === '5105400002' && r.a === '80020002'; }).length === 1 &&
       res(s, function (r) { return r.i === '5105400003' && r.a === '80030003'; }).length === 1, '3d.7 each invoice tied to correct customer (no cross-leak)');
  T.eq(s.EXC.length, 0, '3d.7 no exceptions');

  T.summary();
})().catch(function (e) { print('PHASE 3d ERROR: ' + (e && e.stack ? e.stack : e)); });
