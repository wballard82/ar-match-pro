// Suite 6 — OCR-degraded RMA line: tracking mangled, delivery number intact.
// This reproduces the real-Tesseract path: '1Z243E646656266640 / 'RMA' often
// comes back garbled, but the delivery number in the INV No. column survives.
// PASS 1b must still resolve Delivery 7105659040 → SO 2104446473 and the
// exception must carry the full recommendation.
const { boot, importFile, mkFile, sleep, UPLOADS } = require('./harness');
const path = require('path');

// Only the RMA line + two healthy control lines; tracking token deliberately mangled.
const REMIT_OCR = [
  'Supplier\tDate\tINV DATE\tINV No.\tRemarks\tAmount',
  'HORIBA Instruments, Inc.',
  "05/29\t4/15\t5105196930\t1Z9X41750493565923\t$ 18,480.00",
  "05/29\t4/11\t7105659040\t12243E64665b2GGb40 / 'RMA\t$ 640.00",
  "05/29\t4/15\t5105196944\t1Z243E640454292848\t$ 2,840.00",
  'Total\t$ 21,960.00'
].join('\n');

(async () => {
  const { w, errors } = await boot();
  const { t, done } = require('./harness').makeT('Suite 6 — OCR-degraded RMA recommendation');

  await importFile(w, 'inv', path.join(UPLOADS, 'TK-Fujikin_Invoices_ARMP_Template.xlsx'),
    'TK-Fujikin_Invoices_ARMP_Template.xlsx');
  await importFile(w, 'del', path.join(UPLOADS, 'TK-Fujikin_Delivery_Report_01_01_2026-07_08_2026.xlsx'));
  await sleep(300);

  w.eval(`
    IMP_TYPE='remdetail'; IMP_BANK_MODE=false;
    _OCR.recognize = function(){ return Promise.resolve(${JSON.stringify(REMIT_OCR)}); };
  `);
  {
    const f = mkFile(w, path.join(UPLOADS, 'TK-Fujikin_Remittance__2_305_295.png'), 'rma_degraded.png', 'image/png');
    await w.handleFile({ files: [f], value: f.name, name: f.name });
  }
  await sleep(400);
  t('3 remittance lines parsed despite mangled tracking', w.eval('REM_DETAIL.length') === 3, w.eval('REM_DETAIL.length'));

  await w.runMatch();
  await sleep(600);

  const excOpen = w.eval(`JSON.parse(JSON.stringify(EXC.filter(e=>e.s==='Open')))`);
  const res = w.eval(`JSON.parse(JSON.stringify(RES))`);
  t('two healthy lines applied', res.length === 2 &&
      res.every(r => ['5105196930','5105196944'].includes(String(r.i))),
    JSON.stringify(res.map(r => r.i)));
  t('exactly one exception ($640)', excOpen.length === 1 && Math.abs(excOpen[0].amt - 640) < 0.01,
    JSON.stringify(excOpen.map(e => ({ amt: e.amt, type: e.type }))));
  const ex = excOpen[0] || {};
  t('chain survived the mangled tracking: delRef 7105659040 + soRef 2104446473',
    String(ex.delRef).indexOf('7105659040') >= 0 && String(ex.soRef).indexOf('2104446473') >= 0,
    JSON.stringify({ delRef: ex.delRef, soRef: ex.soRef, detail: ex.detail }));
  t('recommendation present: action names COA + note',
    /Cash on Account/i.test(ex.action || '') && /COA for SO 2104446473/.test(ex.action || ''), ex.action);
  t('type is Cash on Account (not bare Unmatched)', ex.type === 'Cash on Account', ex.type);
  // No bank payment in this suite → cash unconfirmed → OCR cap must REMAIN
  t('without bank corroboration the OCR cap stays (all applied rows ≤ 75)',
    w.eval(`RES.every(r => (r.confidence||0) <= 75)`),
    w.eval(`JSON.stringify(RES.map(r=>({i:r.i,conf:r.confidence})))`));
  t('unconfirmed-cash note present on applied rows',
    w.eval(`RES.every(r => /cash unconfirmed/.test(r.n||''))`),
    w.eval(`JSON.stringify(RES.map(r=>r.n))`));

  t('no jsdom errors', errors.length === 0, errors[0]);

  done();
  process.exit(process.exitCode || 0);
})().catch(e => { console.error('SUITE CRASH:', e); process.exit(1); });
