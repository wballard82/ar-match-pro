// ════════════════════════════════════════════════════════════════════════════
// PHASE 2 — verify the pending "2B" fix to _findInvoicesForPayment.
//
// A single lump WIRE of $100,205.95 from CARDINAL ELECTRONICS INTERNATIONAL
// (account 30037138), carrying NO invoice reference, must auto-allocate across
// its 5 open invoices via subset-sum — NOT route to Cash on Account.
//
// Open invoices (account 30037138):
//   5105001466  18,140.00
//   5105001467  15,310.34
//   5105001468  29,850.50
//   5105001469  17,654.61
//   5105001470  19,250.50
//   ─────────── ──────────
//   sum         100,205.95   == payment
//
// Drives the REAL runMatch() end-to-end (Priority 7 fallback).
// ════════════════════════════════════════════════════════════════════════════
print('\n=== PHASE 2: 2B subset-sum allocation by account ===');

ARMP.reset();
var CUST = 'CARDINAL ELECTRONICS INTERNATIONAL', ACCT = '30037138';
var invs = [
  { i: '5105001466', amt: 18140.00 },
  { i: '5105001467', amt: 15310.34 },
  { i: '5105001468', amt: 29850.50 },
  { i: '5105001469', amt: 17654.61 },
  { i: '5105001470', amt: 19250.50 },
];
invs.forEach(function (x) { ARMP.inv({ i: x.i, a: ACCT, c: CUST, amt: x.amt, po: '4500' + x.i.slice(4) }); });
ARMP.pay({ amt: 100205.95, a: ACCT, c: CUST, n: 'WIRE-CEI-0623' });

ARMP.match().then(function (snap) {
  var RES = snap.RES, EXC = snap.EXC;
  var applied = RES.filter(function (r) { return r.a === ACCT; });
  var appliedSum = applied.reduce(function (s, r) { return s + (r.pd || 0); }, 0);
  var appliedInvs = applied.map(function (r) { return r.i; }).sort();
  var wantInvs = invs.map(function (x) { return x.i; }).sort();

  print('\n   Matched ' + applied.length + ' invoice(s):');
  applied.forEach(function (r) { print('     • ' + r.i + '  $' + (r.pd).toFixed(2) + '  [' + r.st + '] ' + (r.m || '') + (r.n ? ' — ' + r.n : '')); });
  print('   Applied total: $' + appliedSum.toFixed(2));

  var coa = EXC.filter(function (e) { return /Cash on Account|Unapplied/.test(e.type || '') || /Cash on Account|Unapplied/.test(e.dec || ''); });
  if (EXC.length) { print('   Exceptions:'); EXC.forEach(function (e) { print('     ! [' + e.type + '] $' + (e.amt || 0).toFixed(2) + ' — ' + (e.detail || e.action || '')); }); }
  else print('   Exceptions: none');

  print('');
  T.eq(applied.length, 5, 'all 5 invoices auto-allocated');
  T.ok(JSON.stringify(appliedInvs) === JSON.stringify(wantInvs), 'picked the correct 5 invoice numbers');
  T.near(appliedSum, 100205.95, 0.01, 'applied total ties to payment $100,205.95');
  T.ok(applied.every(function (r) { return r.st === 'Exact'; }), 'every allocation marked Exact (no variance)');
  T.eq(coa.length, 0, 'NOT routed to Cash on Account / Unapplied');
  T.ok(applied.every(function (r) { return /subset|multi-invoice/i.test((r.m || '') + (r.n || '')); }), 'allocations attributed to subset-sum / multi-invoice match');

  var s = T.summary();
  print(s.failed === 0 ? '\nPHASE 2: PASS — 2B fix verified, lump auto-allocated across 5 invoices'
                       : '\nPHASE 2: FAIL — ' + s.failed + ' check(s) failed');
}).catch(function (e) {
  print('\nPHASE 2: ERROR — runMatch threw: ' + (e && e.stack ? e.stack : e));
});
