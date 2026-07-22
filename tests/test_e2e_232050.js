// Suite 1 — Applied Materials $232,050 real-data E2E
// Files: real FBL5N aging, real ERS + VMI self-billing, real bank screenshot text.
// Ground truth: customer's own Payment Allocation workbook (verified externally):
//   37 invoice applications totaling $229,300 + ONE Cash-on-Account of $2,750
//   COA note "COA for SO 2104396495" (PO 4521570557), account 40017108.
const { boot, importFile, importMappedInvoice, importBankImage, makeT, sleep, UPLOADS } = require('./harness');
const path = require('path');
const XLSX = require('xlsx');

// Expected invoice applications from the allocation workbook ($232,050 block)
const EXPECTED = [
  ['40017108','5105178250',6000],['40017108','5105178251',8250],['40017108','5105175489',1200],
  ['40017108','5105175494',4785],['40016800','5105189855',8400],['40017108','5105185974',2546],
  ['40017108','5105175488',5100],['40017108','5105169917',1200],['40017108','5105175498',4125],
  ['40017108','5105201164',1200],['40017108','5105178252',160],['40017108','5105180182',2750],
  ['40017108','5105180181',200],['40016800','5105185524',2350],['40017108','5105175497',1595],
  ['40017108','5105185975',7638],['40017108','5105178253',15950],['40017108','5105183891',15950],
  ['40016800','5105189854',19200],['40017108','5105175490',8125],['40017108','5105180183',900],
  ['40017108','5105175491',1200],['40017108','5105175492',1200],['40016800','5105179780',4150],
  ['40017108','5105175495',3600],['40017108','5105178254',1200],['40017108','5105180184',1200],
  ['40017108','5105180180',1800],['40017108','5105178255',980],['40017108','5105175493',3600],
  ['40016800','5105177771',15276],['40016800','5105174410',1200],['40017108','5105180185',500],
  ['40017108','5105175496',1800],['40016800','5105220741',56894],['40016800','5105228952',1800],
  ['40017108','5105220777',15276]
];

(async () => {
  const { w, errors } = await boot();
  const { t, done } = makeT('Suite 1 — $232,050 real-data E2E');

  t('boot: no jsdom script errors', errors.length === 0, errors[0]);

  // 1) Import the real FBL5N aging (filename variant with dotted date — the
  //    exact shape that produced "Applied Materials 06.01." in production)
  // Raw SAP FBL5N export → mapped into the 7-field ARMP template via the adapter,
  // then imported (production requires the template; this proves adapter + engine).
  await importMappedInvoice(w, path.join(UPLOADS, 'Applied_Materials_Aging_Detail_FBL5N_06_01_2026.XLSX'),
    'Applied_Materials_ARMP_Template.xlsx', { customerName: 'Applied Materials', currency: 'USD' });
  for (let i = 0; i < 100 && w.eval('INV.length') < 2226; i++) await sleep(100); // chunked import
  await sleep(300);

  t('aging import: 2226 rows', w.eval('INV.length') === 2226, w.eval('INV.length'));
  t('aging import: customer name cleaned (no "06.01.")',
    w.eval(`INV[0].c`) === 'Applied Materials', JSON.stringify(w.eval('INV[0].c')));
  const soPromoted = w.eval(`INV.filter(v=>v.po==='4521570557').map(v=>({i:v.i,so:v.so,a:v.a,amt:v.amt}))`);
  t('FBL5N Reference Key 3 promoted to Sales Order on PO 4521570557 rows',
    soPromoted.length === 2 && soPromoted.every(r => r.so === '2104396495' && r.a === '40017108'),
    JSON.stringify(soPromoted));

  // 2) Import the two real self-billing files (XML Spreadsheet .XLS)
  await importFile(w, 'rem', path.join(UPLOADS, 'ERS_Selfbilling_LineDetails.XLS'));
  await sleep(200);
  await importFile(w, 'rem', path.join(UPLOADS, 'VMI_Selfbilling_LineDetails.XLS'));
  await sleep(200);
  const ersTotal = w.eval(`ERS_LINES.reduce((s,l)=>s+(l.amount||0),0)`);
  const vmiTotal = w.eval(`VMI_LINES.reduce((s,l)=>s+(l.amount||0),0)`);
  t('ERS lines total $158,080', Math.abs(ersTotal - 158080) < 0.01, ersTotal);
  t('VMI lines total $73,970', Math.abs(vmiTotal - 73970) < 0.01, vmiTotal);

  // 3) Import the bank statement image (real image branch, OCR text stubbed)
  await importBankImage(w);
  await sleep(400);
  t('bank image created exactly 1 payment', w.eval('PAY.length') === 1, w.eval('PAY.length'));
  const pay = w.eval(`JSON.parse(JSON.stringify(PAY[0]))`);
  t('payment amount $232,050.00', Math.abs(pay.amt - 232050) < 0.01, pay.amt);
  t('payment txId is a bank transaction ref (ACC…), NOT the ACH RCVR ID',
    /^ACC[-]?\d+/i.test(pay.txId || '') && pay.txId !== '2226040562', JSON.stringify({ txId: pay.txId }));
  t('RCVR/ORIG IDs stored in their own fields',
    pay.receiverId === '2226040562' && pay.originatorId === '1000000333',
    JSON.stringify({ r: pay.receiverId, o: pay.originatorId }));
  t('payer resolved to Applied Materials from customer data',
    /applied materials/i.test(pay.c || ''), pay.c);

  // 4) Run Auto Match
  await w.runMatch();
  for (let i = 0; i < 100 && !w.eval('autoMatchHasRun'); i++) await sleep(100);
  await sleep(600);

  const res = w.eval(`JSON.parse(JSON.stringify(RES))`);
  const excOpen = w.eval(`JSON.parse(JSON.stringify(EXC.filter(e=>e.s==='Open')))`);

  // ── THE core requirement: exactly ONE exception, $2,750, COA for SO 2104396495 ──
  t('exactly ONE open exception', excOpen.length === 1,
    JSON.stringify(excOpen.map(e => ({ id: e.id, type: e.type, amt: e.amt, po: e.po, notes: e.notes }))));
  const ex = excOpen[0] || {};
  t('exception amount is $2,750.00', Math.abs((ex.amt || 0) - 2750) < 0.01, ex.amt);
  t('exception type is Cash on Account', ex.type === 'Cash on Account', ex.type);
  t('exception note is "COA for SO 2104396495" (not the PO)',
    ex.notes === 'COA for SO 2104396495', JSON.stringify(ex.notes));
  t('exception carries PO 4521570557 and SO 2104396495',
    String(ex.po) === '4521570557' && String(ex.so) === '2104396495',
    JSON.stringify({ po: ex.po, so: ex.so }));
  t('exception account is 40017108 (from the aging, deterministic)',
    String(ex.a) === '40017108', ex.a);

  // ── Full tie-out: RES applications + COA == $232,050 ──
  const applied = res.reduce((s, r) => s + (r.pd || 0), 0);
  t('applied $229,300 across matched invoices', Math.abs(applied - 229300) < 0.01, applied);
  t('tie-out: applied + COA == payment ($232,050)',
    Math.abs(applied + (ex.amt || 0) - 232050) < 0.005, applied + (ex.amt || 0));

  // ── Allocation-level agreement with the customer's own workbook ──
  const resByInv = new Map(res.map(r => [String(r.i), r]));
  let allocMatches = 0; const misses = [];
  for (const [acct, inv, amt] of EXPECTED) {
    const r = resByInv.get(inv);
    if (r && Math.abs((r.pd || 0) - amt) < 0.01 && String(r.a) === acct) allocMatches++;
    else misses.push({ inv, want: [acct, amt], got: r ? [r.a, r.pd] : null });
  }
  t('all 37 invoice applications match the customer allocation exactly (account + amount)',
    allocMatches === 37, JSON.stringify(misses).slice(0, 500));
  t('RES contains exactly 37 rows (no over-application)', res.length === 37, res.length);
  t('cross-account matching: applications span 40017108 AND 40016800',
    new Set(res.map(r => String(r.a))).has('40016800') && new Set(res.map(r => String(r.a))).has('40017108'),
    JSON.stringify([...new Set(res.map(r => r.a))]));

  // 5) COA modal — the exact screen from the bug report
  const exIdx = w.eval(`EXC.findIndex(e=>e.s==='Open')`);
  w.eval(`excActionOpen(${exIdx}, 'cash')`);
  await sleep(200);
  const custVal = w.eval(`(document.getElementById('_excA-cust')||{}).value || ''`);
  const invVal = w.eval(`(document.getElementById('_excA-inv')||{}).value || ''`);
  const noteVal = w.eval(`(document.getElementById('_excA-note')||{}).value || ''`);
  const amtVal = w.eval(`(document.getElementById('_excA-amt')||{}).value || ''`);
  t('modal customer shows "40017108 — Applied Materials"',
    custVal === '40017108 — Applied Materials', JSON.stringify(custVal));
  t('modal invoice field is EMPTY (no bank RCVR ID leak)', invVal === '', JSON.stringify(invVal));
  t('modal note is "COA for SO 2104396495"', noteVal === 'COA for SO 2104396495', JSON.stringify(noteVal));
  t('modal amount is 2750.00', amtVal === '2750.00', amtVal);
  w.eval(`closeModal()`);

  done();
  w.close && w.close();
  process.exit(process.exitCode || 0);
})().catch(e => { console.error('SUITE CRASH:', e); process.exit(1); });
