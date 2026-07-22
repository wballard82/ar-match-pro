// Suite 5 — TK-Fujikin $2,305,295 wire, template-format invoices
// Flow: ARMP-template invoices → delivery report → remittance screenshot (OCR)
// → bank wire screenshot (OCR) → Auto Match.
// Offline-verified ground truth:
//   • 40 remittance lines totaling $2,305,295.00 (= wire amount)
//   • shorthand line "5105205708, 09, 5105196931, 32" = 4 invoices = $14,190
//   • $640 (delivery 7105659040, 'RMA) has NO open invoice → the ONE legitimate COA
//   • $1,275 quotes stale invoice 5105208701 (not in aging) — but its tracking's
//     delivery row (PO 202603180139 / SO 2104554120 / $1,275 / billed 4-23) points
//     deterministically at reissued open invoice 5105234524 → bridge applies it
//   • everything else resolves via invoice # or SS/tracking → delivery bridge
//   • aging's own DZ row (-2,305,295 "COA 05-29-2026 waited for details") must be ignored
const { boot, importFile, makeT, mkFile, sleep, UPLOADS } = require('./harness');
const path = require('path');

const WIRE_OCR = [
  '05/29/2026\tINCOMING MONEY TRANSFER\tF\t265T242446JC1YYB\tWIRES\t2,305,295.00',
  'FDT63726001464',
  'Credit',
  'INWARD MONEY TRANSFER/',
  'INWARD REMITTANCE/',
  ' T.REF 2047185149JS/',
  ' AMT USD      2,305,295.00/',
  'TK FUJIKIN CORPORATION            32,',
  'HWAJEONSANDAN 3-RO 46739 B/',
  'RS:HVBKKRSE RSN:WOORI BANK/',
  'PAYMENT FOR GOODS ABA ROUTING',
  'NO.026009632/',
  'ORIGINATOR:TK FUJIKIN CORPORATION/',
  '32, HWAJEONSANDAN 3-RO 46739 BUSAN/',
  'GANGSEO-GU KR/',
  'CHP2026052900256706/'
].join('\n');

const REMIT_ROWS = [
  ['05/29','4/9','SS260409-KB3(TK-F)','1Z9998V60496160145','308,000.00'],
  ['05/29','4/9','SS260409-DS8(TK-F)','1Z9998V60496833534','36,830.00'],
  ['05/29','4/13','SS260413-DS7(TK-F)','1Z9998V60499510396','16,050.00'],
  ['05/29','4/13','SS260413-DS8(TK-F)','1Z9998V60490221492','38,500.00'],
  ['05/29','4/14','SS260414-DS3(TK-F)','1Z9998V60496270491','4,950.00'],
  ['05/29','4/14','SS260414-DS7(TK-F)','1Z9998V60499331277','18,600.00'],
  ['05/29','4/14','SS260414-KB2(TK-F)','1Z9998V60496360447','61,200.00'],
  ['05/29','4/13','SS260413-KB2(TK-F)','1Z9998V60495331604','71,100.00'],
  ['05/29','4/15','SS260415-DS7(TK-F)','1Z9998V60490135782','55,670.00'],
  ['05/29','4/15','SS260415-KB3(TK-F)','1Z9998V60498270595','37,500.00'],
  ['05/29','4/15','5105196930','1Z9X41750493565923','18,480.00'],
  ['05/29','4/15','5105196944','1Z243E640454292848','2,840.00'],
  ['05/29','4/15','5105195735','1Z243E640455196870','188,000.00'],
  ['05/29','4/15','SS260415-KB2(TK-F)','1Z9998V60497595700','92,000.00'],
  ['05/29','4/16','SS260416-DS9(TK-F)','1Z9998V60499360647','9,100.00'],
  ['05/29','4/11','7105659040',"1Z243E646656266640 / 'RMA",'640.00'],
  ['05/29','4/16','SS260416-KB2(TK-F)','1Z9998V60491962412','184,400.00'],
  ['05/29','4/17','SS260417-DS9(TK-F)','1Z9998V60495710892','20,350.00'],
  ['05/29','4/16','SS260416-DS10(TK-F)','1Z9998V60499441854','4,600.00'],
  ['05/29','4/20','SS260420-DS10(TK-F)','1Z9998V60494793626','21,970.00'],
  ['05/29','4/17','SS260417-KB2(TK-F)','1Z9998V60498010053','50,200.00'],
  ['05/29','4/17','SS260417-KB1(TK-F)','1Z9998V60498981460','446,600.00'],
  ['05/29','4/20','5105203257','1Z9X41750496208830','6,250.00'],
  ['05/29','4/20','5105203256','1Z243E640454985368','8,925.00'],
  ['05/29','4/20','5105203261','1Z243E640456532174','82,250.00'],
  ['05/29','4/20','SS260420-KB1(TK-F)','1Z9998V60491910512','76,600.00'],
  ['05/29','4/20','SS260420-DS11(TK-F)','1Z9998V60494772952','113,900.00'],
  ['05/29','4/21','SS260421-KB2(TK-F)','1Z9998V60491196849','30,800.00'],
  ['05/29','4/21','SS260421-DS6(TK-F)','1Z9998V60493657669','6,560.00'],
  ['05/29','4/22','SS260422-DS6(TK-F)','1Z9998V60496045725','37,390.00'],
  ['05/29','4/22','SS260422-KB4(TK-F)','1Z9998V60496885765','37,500.00'],
  ['05/29','4/22','SS260422-DS9(TK-F)','1Z9998V60494174670','61,600.00'],
  ['05/29','4/22','SS260422-KB3(TK-F)','1Z9998V60494824100','92,000.00'],
  ['05/29','4/21','5105205708, 09, 5105196931, 32','1Z243E640456363099','14,190.00'],
  ['05/29','4/23','5105208701','1Z243E640456622326','1,275.00'],
  ['05/29','4/24','SS260424-DS8(TK-F)','1Z9998V60498397824','31,000.00'],
  ['05/29','4/23','SS260423-DS8(TK-F)','1Z9998V60494036944','1,540.00'],
  ['05/29','4/27','SS260427-DS9(TK-F)','1Z9998V60492705760','5,800.00'],
  ['05/29','4/24','SS260424-DS4(TK-F)','1Z9998V60499938256','6,160.00'],
  ['05/29','4/20','SS260420-DS18(TK-F)','2519055280','3,975.00']
];
const REMIT_OCR =
  'Supplier\tDate\tINV DATE\tINV No.\tRemarks\tAmount\n' +
  'HORIBA Instruments, Inc.\n' +
  REMIT_ROWS.map(r => r.join('\t') + '\t$ ' + r[4]).map(r => {
    // keep single amount at end of row: rebuild as Date INVDATE Ref Remarks $amt
    const p = r.split('\t');
    return [p[0], p[1], p[2], p[3], '$ ' + p[4]].join('\t');
  }).join('\n') +
  '\nTotal\t$ 2,305,295.00';

(async () => {
  const { w, errors } = await boot();
  const { t, done } = makeT('Suite 5 — TK-Fujikin $2,305,295 template E2E');

  // 1) ARMP-template invoice file (converted from FBL5N)
  await importFile(w, 'inv', path.join(UPLOADS, 'TK-Fujikin_Invoices_ARMP_Template.xlsx'),
    'TK-Fujikin_Invoices_ARMP_Template.xlsx');
  await sleep(200);
  t('template file passes validation, 541 rows imported', w.eval('INV.length') === 541, w.eval('INV.length'));
  t('customer name from template column (no filename fallback)',
    w.eval(`INV[0].c`) === 'TK-FUJIKIN CORPORATION', w.eval('INV[0].c'));
  t('template maps SO + PO + account', w.eval(
    `INV[0].a==='40044516' && INV[0].so && INV[0].po && Math.abs(INV.reduce((s,v)=>s+v.amt,0)-11430157)<0.01`),
    w.eval(`JSON.stringify({a:INV[0].a,so:INV[0].so,po:INV[0].po,tot:INV.reduce((s,v)=>s+v.amt,0)})`));
  t('dates converted (ISO, not Excel serials)',
    w.eval(`/^\\d{4}-\\d{2}-\\d{2}/.test(String(INV[0].dt2))`), w.eval('String(INV[0].dt2)'));

  // 2) Delivery report
  await importFile(w, 'del', path.join(UPLOADS, 'TK-Fujikin_Delivery_Report_01_01_2026-07_08_2026.xlsx'));
  await sleep(400);
  t('delivery report imported (1642 rows)', w.eval('DELIV.length') === 1642, w.eval('DELIV.length'));

  // 3) Remittance screenshot (real remdetail image path, OCR stubbed)
  w.eval(`
    IMP_TYPE='remdetail'; IMP_BANK_MODE=false;
    _OCR.recognize = function(){ return Promise.resolve(${JSON.stringify(REMIT_OCR)}); };
  `);
  {
    const f = mkFile(w, path.join(UPLOADS, 'TK-Fujikin_Remittance__2_305_295.png'),
      'TK-Fujikin_Remittance__2_305_295.png', 'image/png');
    await w.handleFile({ files: [f], value: f.name, name: f.name });
  }
  await sleep(500);
  const remN = w.eval('REM_DETAIL.length');
  const remTot = w.eval(`REM_DETAIL.reduce((s,l)=>s+(l.amt||0),0)`);
  t('remittance OCR parsed 40 detail lines', remN === 40, remN);
  t('remittance detail total ties to $2,305,295.00', Math.abs(remTot - 2305295) < 0.01, remTot);

  // 4) Bank wire screenshot
  w.eval(`
    IMP_TYPE='rem'; IMP_BANK_MODE=true;
    _OCR.recognize = function(){ return Promise.resolve(${JSON.stringify(WIRE_OCR)}); };
  `);
  {
    const f = mkFile(w, path.join(UPLOADS, 'TK-Fujikin_Payment__2_305_295.png'),
      'TK-Fujikin_Payment__2_305_295.png', 'image/png');
    await w.handleFile({ files: [f], value: f.name, name: f.name });
  }
  await sleep(400);
  t('wire payment created', w.eval('PAY.length') === 1, w.eval('PAY.length'));
  const pay = w.eval(`JSON.parse(JSON.stringify(PAY[0]))`);
  t('payment amount $2,305,295.00', Math.abs(pay.amt - 2305295) < 0.01, pay.amt);
  t('payer resolved to TK-Fujikin', /TK[- ]?FUJIKIN/i.test(pay.c || ''), pay.c);
  t('payment account resolved to 40044516', String(pay.a) === '40044516', pay.a);

  // 5) Auto Match
  await w.runMatch();
  await sleep(800);

  const res = w.eval(`JSON.parse(JSON.stringify(RES))`);
  const excOpen = w.eval(`JSON.parse(JSON.stringify(EXC.filter(e=>e.s==='Open')))`);
  const applied = res.reduce((s, r) => s + (r.pd || 0), 0);
  const excTot = excOpen.reduce((s, e) => s + (e.amt || 0), 0);

  t('FULL TIE-OUT: applied + exceptions == $2,305,295.00',
    Math.abs(applied + excTot - 2305295) < 0.01,
    JSON.stringify({ applied, excTot, sum: applied + excTot }));
  t('applied == $2,304,655 (every line except the $640 RMA)',
    Math.abs(applied - 2304655) < 0.01, applied);
  t('exactly ONE exception', excOpen.length === 1,
    JSON.stringify(excOpen.map(e => ({ type: e.type, amt: e.amt, ref: e.ref, detail: (e.detail || '').slice(0, 80) }))));
  t('the exception is the $640 RMA delivery (7105659040 — no invoice posted)',
    excOpen[0] && Math.abs(excOpen[0].amt - 640) < 0.01 && String(excOpen[0].ref).indexOf('7105659040') >= 0,
    JSON.stringify(excOpen[0]));
  t('both exceptions route to Cash on Account',
    excOpen.every(e => /cash on account/i.test(e.type || '')),
    JSON.stringify(excOpen.map(e => e.type)));

  // shorthand expansion: all four invoices applied
  const invSet = new Set(res.map(r => String(r.i)));
  t('shorthand "5105205708, 09, 5105196931, 32" expanded to 4 applied invoices',
    ['5105205708', '5105205709', '5105196931', '5105196932'].every(i => invSet.has(i)),
    JSON.stringify(['5105205708', '5105205709', '5105196931', '5105196932'].filter(i => !invSet.has(i))));
  // direct invoice lines applied at exact amounts
  const byInv = new Map(res.map(r => [String(r.i), r]));
  const directs = [['5105196930', 18480], ['5105196944', 2840], ['5105195735', 188000],
    ['5105203257', 6250], ['5105203256', 8925], ['5105203261', 82250]];
  t('direct invoice lines applied at exact amounts',
    directs.every(([i, a]) => byInv.has(i) && Math.abs(byInv.get(i).pd - a) < 0.01),
    JSON.stringify(directs.filter(([i, a]) => !byInv.has(i) || Math.abs(byInv.get(i).pd - a) >= 0.01)));
  // stale-invoice recovery: 5105208701 (quoted, not in aging) resolves through the
  // tracking's delivery row to reissued invoice 5105234524 — same PO/SO, exact amount
  t('stale invoice ref recovered via delivery bridge → 5105234524 applied at $1,275',
    byInv.has('5105234524') && Math.abs(byInv.get('5105234524').pd - 1275) < 0.01,
    JSON.stringify(byInv.get('5105234524') || null));
  // the other three $1,275 invoices live on UNRELATED SOs and must be untouched
  t('conservative: same-amount invoices on unrelated SOs NOT touched',
    !['5105260764', '5105274078', '5105280860'].some(i => invSet.has(i)),
    JSON.stringify(['5105260764', '5105274078', '5105280860'].filter(i => invSet.has(i))));
  t('exception posts to the resolved customer account 40044516',
    excOpen[0] && String(excOpen[0].a) === '40044516', excOpen[0] && excOpen[0].a);

  // ── Recommendation quality: the $640 exception must cite its resolved chain ──
  const exc640 = excOpen[0];
  t('$640 exception carries delRef 7105659040 and soRef 2104446473',
    exc640 && String(exc640.delRef).indexOf('7105659040') >= 0 && String(exc640.soRef).indexOf('2104446473') >= 0,
    JSON.stringify({ delRef: exc640 && exc640.delRef, soRef: exc640 && exc640.soRef }));
  t('$640 exception detail names the chain, not a bare "unresolved"',
    exc640 && /7105659040/.test(exc640.detail || '') && /2104446473/.test(exc640.detail || ''),
    exc640 && exc640.detail);
  t('$640 exception action recommends the COA posting with the note',
    exc640 && /Cash on Account/i.test(exc640.action || '') && /COA for SO 2104446473/.test(exc640.action || ''),
    exc640 && exc640.action);
  t('$640 exception note prefilled with "COA for SO 2104446473 (delivery 7105659040)"',
    exc640 && exc640.notes === 'COA for SO 2104446473 (delivery 7105659040)', exc640 && exc640.notes);
  t('suggestion chip cites the chain (armpGetSuggestedResolution)',
    w.eval(`(function(){
      var ex = EXC.filter(function(e){ return e.s==='Open'; })[0];
      var s = armpGetSuggestedResolution(ex);
      return !!(s && /7105659040/.test(s.rationale) && /2104446473/.test(s.rationale) && /COA for SO 2104446473/.test(s.rationale) && s.action==='cash_on_account');
    })()`),
    w.eval(`(function(){ var ex=EXC.filter(function(e){return e.s==='Open';})[0]; return JSON.stringify(armpGetSuggestedResolution(ex)); })()`));
  t('Needs Attention card renders delivery + SO in the exception row',
    w.eval(`(function(){
      try{ renderWsExcPremium(); }catch(e){ return 'render threw: '+e.message; }
      var html = (document.getElementById('ws-exc-list')||{}).innerHTML || '';
      return /7105659040/.test(html) && /2104446473/.test(html);
    })()`) === true,
    w.eval(`((document.getElementById('ws-exc-list')||{}).innerHTML||'').slice(0,300)`));
  // aging's own DZ credit ignored
  t('aging DZ credit (-2,305,295) not consumed by matching',
    res.every(r => (r.pd || 0) > 0), res.filter(r => (r.pd || 0) <= 0).length);

  // ── Confidence restoration: wire tied to remittance total → cap lifted ──
  const confHist = w.eval(`JSON.stringify(Object.entries(RES.reduce((m,r)=>{m[r.confidence]=(m[r.confidence]||0)+1;return m;},{})))`);
  t('confidence is NOT flat-capped at 75 after bank corroboration',
    w.eval(`RES.every(r => r.confidence !== 75 || r.m.indexOf('oldest')>=0) && RES.some(r => r.confidence > 90)`), confHist);
  t('direct invoice lines restored to 99',
    w.eval(`RES.filter(r=>r.m==='Remittance — direct invoice').every(r=>r.confidence===99) && RES.filter(r=>r.m==='Remittance — direct invoice').length>0`),
    w.eval(`JSON.stringify(RES.filter(r=>r.m==='Remittance — direct invoice').map(r=>r.confidence))`));
  t('exact delivery-bridge lines restored to 97',
    w.eval(`RES.filter(r=>r.m==='Delivery bridge — exact invoice amount').every(r=>r.confidence===97)`),
    w.eval(`JSON.stringify(RES.filter(r=>r.m==='Delivery bridge — exact invoice amount').map(r=>r.confidence))`));
  t('restored rows carry the Bank-verified reason + note',
    w.eval(`RES.filter(r=>r.confidence>90).every(r => (r.matchReasons||[]).some(mr=>mr.type==='verify') && /bank-verified/.test(r.n||''))`),
    w.eval(`JSON.stringify((RES.filter(r=>r.confidence>90)[0]||{}).matchReasons)`));
  t('match-reason weight updated to the restored score (auditable breakdown)',
    w.eval(`RES.filter(r=>r._uncappedConfidence>75).every(r => r.matchReasons && r.matchReasons[0].w === r.confidence)`),
    w.eval(`JSON.stringify((RES.filter(r=>r._uncappedConfidence>75)[0]||{}).matchReasons)`));

  t('no jsdom errors', errors.length === 0, errors[0]);

  done();
  process.exit(process.exitCode || 0);
})().catch(e => { console.error('SUITE CRASH:', e); process.exit(1); });
