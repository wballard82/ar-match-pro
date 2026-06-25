// ════════════════════════════════════════════════════════════════════════════
// PHASE 3f — SAP Delivery Bridge · ERS self-billing · VMI/consignment date-range
//   Delivery Bridge: driven through the REAL runMatch() (tracking→delivery→SO→inv)
//   ERS / VMI:        driven through their REAL top-level matchers
//                     (matchERSGrouped / matchVMIDateRange), which runMatch calls
//                     from Priority 5c after the file-import pipeline populates
//                     ERS_LINES / VMI_LINES. Here we populate those arrays directly.
// ════════════════════════════════════════════════════════════════════════════
print('\n=== PHASE 3f: delivery bridge · ERS · VMI ===');

(async function () {

  // ── 3f.1 SAP Delivery Bridge: tracking → delivery → SO → invoice ──────────
  print('\n[3f.1] Tracking 1Z…784 → Delivery 7105001234 → SO 2104999001 → Invoice 5105500001');
  ARMP.reset();
  // Delivery report row + tracking/delivery bridge maps (built by import in-app).
  var delRow = { deliveryNo: '7105001234', trackingNo: '1Z999AA10123456784', salesOrder: '2104999001', poNo: '4500001466', custName: 'TK Cust', custAcct: 'AAAA' };
  DELIV = [delRow];
  window._TRK_BRIDGE = new Map([['1Z999AA10123456784', [delRow]]]);
  window._DELIV_BRIDGE = new Map([['7105001234', delRow]]);
  // Open invoice carrying the bridged SO (different account/payer than the bank wire).
  ARMP.inv({ c: 'TK Cust', a: 'AAAA', i: '5105500001', so: '2104999001', po: '4500001466', amt: 5000 });
  // Bank payment carries a remittance line with only the tracking number.
  var pmt = ARMP.pay({ c: 'Diff Payer', a: 'BBBB', amt: 5000, txId: 'WIRE-3F1' });
  pmt._remLines = [{ trkNo: '1Z999AA10123456784', amt: 5000, invNo: '', soNo: '', delNo: '', poNo: '' }];
  var s = await ARMP.match();
  var m = s.RES.filter(function (r) { return r.i === '5105500001'; });
  if (m.length) print('   → matched via: ' + (m[0].n || m[0].bridgeChain || m[0].m));
  T.eq(m.length, 1, '3f.1 invoice matched through the delivery bridge');
  T.ok(m[0] && /bridge/i.test(m[0].m || ''), '3f.1 attributed to a bridge match');
  T.ok(m[0] && /Del:7105001234/.test((m[0].n || m[0].bridgeChain || '')) && /SO:2104999001/.test((m[0].n || m[0].bridgeChain || '')), '3f.1 lineage chain shows Delivery→SO→Invoice');
  // cleanup bridge globals so later scenarios are clean
  window._TRK_BRIDGE = new Map(); window._DELIV_BRIDGE = new Map();

  // ── 3f.2 ERS self-billing consolidated payment (PO-grouped tie-out) ───────
  print('\n[3f.2] ERS lines grouped by PO tie out to invoices (18,140 + 15,310.34)');
  ARMP.reset();
  ARMP.inv({ c: 'Cardinal', a: '30037138', i: '5105001466', po: '4500001466', amt: 18140.00 });
  ARMP.inv({ c: 'Cardinal', a: '30037138', i: '5105001467', po: '4500001467', amt: 15310.34 });
  ERS_LINES = [
    { poNumber: '4500001466', amount: 18140.00, salesOrder: '', deliveryNote: '', invoiceRef: '' },
    { poNumber: '4500001467', amount: 15310.34, salesOrder: '', deliveryNote: '', invoiceRef: '' },
  ];
  _buildInvIndexes();
  var ers = matchERSGrouped(33450.34, '30037138', _INV_IDX, 1);
  ERS_LINES = [];
  print('   → ERS matched ' + (ers ? ers.matched.length : 0) + ' invoice(s), total $' + (ers ? ers.total.toFixed(2) : '0'));
  T.ok(ers && ers.matched.length === 2, '3f.2 both ERS PO groups tied to invoices');
  T.ok(ers && Math.abs(ers.total - 33450.34) <= 0.01, '3f.2 ERS matched total ties to $33,450.34');
  T.ok(ers && ers.matched.map(function (v) { return v.i; }).sort().join() === '5105001466,5105001467', '3f.2 correct invoices selected');

  // ── 3f.3 ERS PO with no matching aging invoice → recorded for COA ─────────
  print('\n[3f.3] ERS PO with no open invoice → flagged as unmatched group (COA routing)');
  ARMP.reset();
  ARMP.inv({ c: 'Cardinal', a: '30037138', i: '5105001466', po: '4500001466', amt: 18140.00 });
  ERS_LINES = [
    { poNumber: '4500001466', amount: 18140.00 },
    { poNumber: '4500009999', amount: 2750.00 }, // no invoice for this PO
  ];
  _buildInvIndexes();
  ers = matchERSGrouped(20890.00, '30037138', _INV_IDX, 1);
  ERS_LINES = [];
  T.ok(ers && ers.matched.length === 1, '3f.3 matched only the PO that has an invoice');
  T.ok(ers && ers.unmatchedGroups.some(function (g) { return g.po === '4500009999'; }), '3f.3 unmatched PO recorded for COA note');

  // ── 3f.4 VMI/consignment date-range match ─────────────────────────────────
  print('\n[3f.4] VMI line (15-May-2026) falls in PO date range 05/01–05/31/2026 → invoice');
  ARMP.reset();
  ARMP.inv({ c: 'VMI Cust', a: '40050005', i: '5105600001', po: '4521570557-05/01/2026-05/31/2026', amt: 5000 });
  PAY = [{ amt: 5000, c: 'VMI Cust', a: '40050005' }]; // matchVMIDateRange reads payment customer by amount
  VMI_LINES = [{ amount: 5000, vcDate: new Date(2026, 4, 15), poRaw: 'VC;;05/15/2026' }];
  _buildInvIndexes();
  var vmi = matchVMIDateRange(5000, '40050005', _INV_IDX, 5);
  VMI_LINES = []; PAY = [];
  print('   → VMI matched ' + (vmi ? vmi.matched.length : 0) + ' invoice(s), subsetFound=' + (vmi ? vmi.subsetFound : 'n/a'));
  T.ok(vmi && vmi.matched.length === 1, '3f.4 VMI date-range tied to the in-range invoice');
  T.ok(vmi && vmi.matched[0].i === '5105600001', '3f.4 correct invoice selected');

  // ── 3f.5 VMI line OUTSIDE the PO date range → no match (conservative) ──────
  print('\n[3f.5] VMI line (15-Jul-2026) outside range 05/01–05/31 → NOT matched');
  ARMP.reset();
  ARMP.inv({ c: 'VMI Cust', a: '40050005', i: '5105600002', po: '4521570557-05/01/2026-05/31/2026', amt: 5000 });
  PAY = [{ amt: 5000, c: 'VMI Cust', a: '40050005' }];
  VMI_LINES = [{ amount: 5000, vcDate: new Date(2026, 6, 15) }]; // July — out of range
  _buildInvIndexes();
  vmi = matchVMIDateRange(5000, '40050005', _INV_IDX, 5);
  VMI_LINES = []; PAY = [];
  T.ok(!vmi || vmi.matched.length === 0, '3f.5 out-of-range VMI line correctly not matched');

  T.summary();
})().catch(function (e) { print('PHASE 3f ERROR: ' + (e && e.stack ? e.stack : e)); });
