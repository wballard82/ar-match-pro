// ════════════════════════════════════════════════════════════════════════════
// PHASE 3c — variance handling (tolerance = $1)
//   short pay / overpay within tol → Exact (absorbed)
//   short pay / overpay beyond tol → matched + Short pay / Overpay exception
//   partial payment (underpay w/ invoice ref) → Short pay path (auto-match)
// ════════════════════════════════════════════════════════════════════════════
print('\n=== PHASE 3c: short pay / overpay / partial / variance ===');
function res(s, p) { return s.RES.filter(p); }
function exc(s, p) { return s.EXC.filter(p); }

(async function () {

  // ── 3c.1 Short pay WITHIN tolerance (±$1) → Exact, no exception ────────────
  print('\n[3c.1] Invoice 5,000.00 · payment 4,999.50 (short $0.50 ≤ $1 tol)');
  ARMP.reset();
  ARMP.inv({ c: 'Acme', a: '60010001', i: '5105200001', amt: 5000.00 });
  ARMP.pay({ c: 'Acme', a: '60010001', i: '5105200001', amt: 4999.50, txId: 'P-3C1' });
  var s = await ARMP.match();
  var m = res(s, function (r) { return r.i === '5105200001'; });
  T.ok(m.length === 1 && m[0].st === 'Exact', '3c.1 within-tol short → Exact');
  T.eq(exc(s, function (e) { return /Short pay/.test(e.type); }).length, 0, '3c.1 no Short pay exception');

  // ── 3c.2 Short pay BEYOND tolerance → matched + Short pay exception ────────
  print('\n[3c.2] Invoice 5,000.00 · payment 4,900.00 (short $100)');
  ARMP.reset();
  ARMP.inv({ c: 'Acme', a: '60010001', i: '5105200002', amt: 5000.00 });
  ARMP.pay({ c: 'Acme', a: '60010001', i: '5105200002', amt: 4900.00, txId: 'P-3C2' });
  s = await ARMP.match();
  m = res(s, function (r) { return r.i === '5105200002'; });
  T.ok(m.length === 1 && m[0].st === 'Short pay', '3c.2 matched with Short pay status');
  T.near(m[0].vr, -100, 0.01, '3c.2 variance recorded as -$100');
  T.eq(exc(s, function (e) { return e.type === 'Short pay'; }).length, 1, '3c.2 one Short pay exception raised');

  // ── 3c.3 Overpay WITHIN tolerance → Exact, no exception ───────────────────
  print('\n[3c.3] Invoice 5,000.00 · payment 5,000.75 (over $0.75 ≤ $1 tol)');
  ARMP.reset();
  ARMP.inv({ c: 'Acme', a: '60010001', i: '5105200003', amt: 5000.00 });
  ARMP.pay({ c: 'Acme', a: '60010001', i: '5105200003', amt: 5000.75, txId: 'P-3C3' });
  s = await ARMP.match();
  m = res(s, function (r) { return r.i === '5105200003'; });
  T.ok(m.length === 1 && m[0].st === 'Exact', '3c.3 within-tol over → Exact');
  T.eq(exc(s, function (e) { return /Overpay/.test(e.type); }).length, 0, '3c.3 no Overpay exception');

  // ── 3c.4 Overpay BEYOND tolerance → matched + Overpay exception ───────────
  print('\n[3c.4] Invoice 5,000.00 · payment 5,250.00 (over $250)');
  ARMP.reset();
  ARMP.inv({ c: 'Acme', a: '60010001', i: '5105200004', amt: 5000.00 });
  ARMP.pay({ c: 'Acme', a: '60010001', i: '5105200004', amt: 5250.00, txId: 'P-3C4' });
  s = await ARMP.match();
  m = res(s, function (r) { return r.i === '5105200004'; });
  T.ok(m.length === 1 && m[0].st === 'Overpay', '3c.4 matched with Overpay status');
  T.near(m[0].vr, 250, 0.01, '3c.4 variance recorded as +$250');
  T.eq(exc(s, function (e) { return e.type === 'Overpay'; }).length, 1, '3c.4 one Overpay exception raised');

  // ── 3c.5 Partial payment (intentional underpay vs invoice ref) ────────────
  print('\n[3c.5] Invoice 10,000.00 · payment 6,000.00 (partial — pays part now)');
  ARMP.reset();
  ARMP.inv({ c: 'Acme', a: '60010001', i: '5105200005', amt: 10000.00 });
  ARMP.pay({ c: 'Acme', a: '60010001', i: '5105200005', amt: 6000.00, txId: 'P-3C5' });
  s = await ARMP.match();
  m = res(s, function (r) { return r.i === '5105200005'; });
  T.ok(m.length === 1 && m[0].st === 'Short pay', '3c.5 partial routed via Short pay path');
  T.near(m[0].vr, -4000, 0.01, '3c.5 open balance variance -$4,000 recorded');
  T.eq(exc(s, function (e) { return e.type === 'Short pay'; }).length, 1, '3c.5 exception flags remaining balance');
  print('   note: auto-match cannot distinguish "partial (will pay rest)" from "short pay (dispute)"');
  print('         — both surface as Short pay for a human disposition (browser workspace).');

  T.summary();
})().catch(function (e) { print('PHASE 3c ERROR: ' + (e && e.stack ? e.stack : e)); });
