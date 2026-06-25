// ════════════════════════════════════════════════════════════════════════════
// PHASE 3b — lump-sum subset-sum allocation (no references)
//   • single distinct combination → auto-apply (unchanged behavior)
//   • all-invoices exact-total shortcut → auto-apply
//   • 2+ distinct combinations (AMBIGUOUS) → route to review, NEVER guess  [FIX]
// ════════════════════════════════════════════════════════════════════════════
print('\n=== PHASE 3b: lump-sum subset-sum (incl. ambiguity rule) ===');
function res(s, p) { return s.RES.filter(p); }

(async function () {

  // ── 3b.1 Single distinct combination → auto-apply ─────────────────────────
  print('\n[3b.1] Lump $200, no refs · invoices 70/130/500 · only {70,130} ties');
  ARMP.reset();
  ARMP.inv({ c: 'Acme Co', a: '50010001', i: '5105110001', amt: 70 });
  ARMP.inv({ c: 'Acme Co', a: '50010001', i: '5105110002', amt: 130 });
  ARMP.inv({ c: 'Acme Co', a: '50010001', i: '5105110003', amt: 500 });
  ARMP.pay({ c: 'Acme Co', a: '50010001', amt: 200, n: 'WIRE-ACME', txId: 'WIRE-3B1' });
  print('   expect: auto-allocate {5105110001, 5105110002}, no Cash on Account');
  var s = await ARMP.match();
  var m = res(s, function (r) { return r.a === '50010001'; });
  T.eq(m.length, 2, '3b.1 exactly the 2-invoice combination applied');
  T.ok(m.map(function (r) { return r.i; }).sort().join() === '5105110001,5105110002', '3b.1 picked {70,130}');
  T.ok(m.every(function (r) { return r.st === 'Exact'; }), '3b.1 marked Exact');
  T.eq(s.EXC.filter(function (e) { return /Cash on Account|Unapplied/.test(e.type); }).length, 0, '3b.1 not routed to COA');

  // ── 3b.2 All-invoices exact-total shortcut → auto-apply ───────────────────
  print('\n[3b.2] Lump $300, no refs · ALL 3 invoices 100/80/120 sum to payment');
  ARMP.reset();
  ARMP.inv({ c: 'Beta Co', a: '50020002', i: '5105120001', amt: 100 });
  ARMP.inv({ c: 'Beta Co', a: '50020002', i: '5105120002', amt: 80 });
  ARMP.inv({ c: 'Beta Co', a: '50020002', i: '5105120003', amt: 120 });
  ARMP.pay({ c: 'Beta Co', a: '50020002', amt: 300, n: 'WIRE-BETA', txId: 'WIRE-3B2' });
  print('   expect: all 3 invoices applied (exact-total), no COA');
  s = await ARMP.match();
  m = res(s, function (r) { return r.a === '50020002'; });
  T.eq(m.length, 3, '3b.2 all three invoices applied');
  T.near(m.reduce(function (a, r) { return a + r.pd; }, 0), 300, 0.01, '3b.2 total ties to $300');
  T.eq(s.EXC.filter(function (e) { return /Cash on Account|Unapplied/.test(e.type); }).length, 0, '3b.2 not routed to COA');

  // ── 3b.3 AMBIGUOUS — 2 distinct combinations → route to review (FIX) ──────
  print('\n[3b.3] Lump $200, no refs · invoices 100/100/50/150/300 · {100,100} OR {50,150}');
  ARMP.reset();
  ARMP.inv({ c: 'Gamma Co', a: '50030003', i: '5105130001', amt: 100 });
  ARMP.inv({ c: 'Gamma Co', a: '50030003', i: '5105130002', amt: 100 });
  ARMP.inv({ c: 'Gamma Co', a: '50030003', i: '5105130003', amt: 50 });
  ARMP.inv({ c: 'Gamma Co', a: '50030003', i: '5105130004', amt: 150 });
  ARMP.inv({ c: 'Gamma Co', a: '50030003', i: '5105130005', amt: 300 });
  ARMP.pay({ c: 'Gamma Co', a: '50030003', amt: 200, n: 'WIRE-GAMMA', txId: 'WIRE-3B3' });
  print('   expect: NOTHING auto-applied; 1 review exception listing candidate combinations');
  s = await ARMP.match();
  m = res(s, function (r) { return r.a === '50030003'; });
  var ambig = s.EXC.filter(function (e) { return /Ambiguous allocation/.test(e.detail || ''); });
  if (ambig.length) print('   → review EXC: [' + ambig[0].type + '] ' + ambig[0].detail);
  T.eq(m.length, 0, '3b.3 NO invoices auto-applied (no guess)');
  T.eq(ambig.length, 1, '3b.3 exactly one ambiguity review exception raised');
  T.eq(ambig[0].type, 'Ambiguous', '3b.3 routed to dedicated "Ambiguous" exception type (its own chip)');
  T.ok(ambig[0] && /5105130001\+5105130002|5105130003\+5105130004/.test(ambig[0].detail), '3b.3 exception lists candidate combinations');
  T.ok(ambig[0] && ambig[0].s === 'Open' && !ambig[0].dec, '3b.3 left Open for specialist (no auto-decision)');

  // ── 3b.4 Ambiguity does NOT trigger when a single combination is unique ───
  print('\n[3b.4] Control: lump $250 · invoices 100/150/300 · only {100,150} ties → auto-apply');
  ARMP.reset();
  ARMP.inv({ c: 'Delta2 Co', a: '50040004', i: '5105140001', amt: 100 });
  ARMP.inv({ c: 'Delta2 Co', a: '50040004', i: '5105140002', amt: 150 });
  ARMP.inv({ c: 'Delta2 Co', a: '50040004', i: '5105140003', amt: 300 });
  ARMP.pay({ c: 'Delta2 Co', a: '50040004', amt: 250, n: 'WIRE-D2', txId: 'WIRE-3B4' });
  s = await ARMP.match();
  m = res(s, function (r) { return r.a === '50040004'; });
  T.eq(m.length, 2, '3b.4 unique 2-invoice combo auto-applied');
  T.eq(s.EXC.filter(function (e) { return /Ambiguous/.test(e.detail || ''); }).length, 0, '3b.4 no false-ambiguity exception');

  T.summary();
})().catch(function (e) { print('PHASE 3b ERROR: ' + (e && e.stack ? e.stack : e)); });
