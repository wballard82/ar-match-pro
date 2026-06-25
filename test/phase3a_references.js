// ════════════════════════════════════════════════════════════════════════════
// PHASE 3a — reference-based matching (baseline + PO/SO groups + notes refs)
// Drives the REAL runMatch(). SAP convention: invoice 510…, SO 210…, PO 45….
// ════════════════════════════════════════════════════════════════════════════
print('\n=== PHASE 3a: reference-based matching ===');

function res(snap, pred) { return snap.RES.filter(pred); }
function exc(snap, pred) { return snap.EXC.filter(pred); }

(async function () {

  // ── 3a.1 Clean invoice-number match (baseline) ────────────────────────────
  print('\n[3a.1] Clean invoice-number match (baseline)');
  ARMP.reset();
  ARMP.inv({ c: 'Delta Aerospace', a: '40017108', i: '5104868961', po: '4520051766', so: '2104105623', amt: 1295 });
  ARMP.pay({ c: 'Delta Aerospace', a: '40017108', i: '5104868961', amt: 1295, txId: 'ACH-3A1' });
  print('   expect: 1 Direct-invoice Exact match, 0 exceptions');
  var s = await ARMP.match();
  var m = res(s, function (r) { return r.i === '5104868961'; });
  T.eq(m.length, 1, '3a.1 invoice matched once');
  T.ok(m[0] && m[0].st === 'Exact' && /Direct invoice/.test(m[0].m), '3a.1 marked Exact / Direct invoice');
  T.eq(s.EXC.length, 0, '3a.1 no exceptions');

  // ── 3a.2 PO-group match (multiple invoices, one PO) ───────────────────────
  print('\n[3a.2] PO-group match — 2 invoices share PO 4522100001 (28,500 + 11,200 = 39,700)');
  ARMP.reset();
  ARMP.inv({ c: 'Pinnacle Systems', a: '40058700', i: '5105001001', po: '4522100001', so: '2104500001', amt: 28500 });
  ARMP.inv({ c: 'Pinnacle Systems', a: '40058700', i: '5105001002', po: '4522100001', so: '2104500002', amt: 11200 });
  ARMP.pay({ c: 'Pinnacle Systems', a: '40058700', po: '4522100001', amt: 39700, txId: 'ACH-3A2' });
  print('   expect: 2 invoices matched as PO group, total 39,700, 0 exceptions');
  s = await ARMP.match();
  m = res(s, function (r) { return r.po === '4522100001'; });
  T.eq(m.length, 2, '3a.2 both PO invoices matched');
  T.ok(m.every(function (r) { return /PO group/.test(r.m); }), '3a.2 attributed to PO group');
  T.near(m.reduce(function (a, r) { return a + r.pd; }, 0), 39700, 0.01, '3a.2 group total ties to payment');
  T.eq(s.EXC.length, 0, '3a.2 no exceptions');

  // ── 3a.3 SO-group match (multiple invoices, one Sales Order) ──────────────
  print('\n[3a.3] SO-group match — 2 invoices share SO 2104999001 (5,000 + 7,500 = 12,500)');
  ARMP.reset();
  ARMP.inv({ c: 'Vertex Energy', a: '40045600', i: '5104940001', po: '4521900001', so: '2104999001', amt: 5000 });
  ARMP.inv({ c: 'Vertex Energy', a: '40045600', i: '5104940002', po: '4521900002', so: '2104999001', amt: 7500 });
  ARMP.pay({ c: 'Vertex Energy', a: '40045600', so: '2104999001', amt: 12500, txId: 'ACH-3A3' });
  print('   expect: 2 invoices matched as SO group, total 12,500, 0 exceptions');
  s = await ARMP.match();
  m = res(s, function (r) { return r.so === '2104999001'; });
  T.eq(m.length, 2, '3a.3 both SO invoices matched');
  T.ok(m.every(function (r) { return /SO group/.test(r.m); }), '3a.3 attributed to SO group');
  T.near(m.reduce(function (a, r) { return a + r.pd; }, 0), 12500, 0.01, '3a.3 group total ties to payment');
  T.eq(s.EXC.length, 0, '3a.3 no exceptions');

  // ── 3a.4 Multi-invoice refs embedded in notes (Priority 0) ────────────────
  print('\n[3a.4] Two invoice #s in payment notes → multi-invoice match (18,140 + 15,310.34)');
  ARMP.reset();
  ARMP.inv({ c: 'Cardinal Elec', a: '30037138', i: '5105001466', amt: 18140.00 });
  ARMP.inv({ c: 'Cardinal Elec', a: '30037138', i: '5105001467', amt: 15310.34 });
  ARMP.pay({ c: 'Cardinal Elec', a: '30037138', amt: 33450.34, n: 'Payment for INV 5105001466 and 5105001467', txId: 'ACH-3A4' });
  print('   expect: 2 invoices matched from notes refs, 0 exceptions');
  s = await ARMP.match();
  m = res(s, function (r) { return r.i === '5105001466' || r.i === '5105001467'; });
  T.eq(m.length, 2, '3a.4 both notes-referenced invoices matched');
  T.ok(m.every(function (r) { return /Multi-invoice/.test(r.m); }), '3a.4 attributed to multi-invoice match');
  T.eq(s.EXC.length, 0, '3a.4 no exceptions');

  T.summary();
})().catch(function (e) { print('PHASE 3a ERROR: ' + (e && e.stack ? e.stack : e)); });
