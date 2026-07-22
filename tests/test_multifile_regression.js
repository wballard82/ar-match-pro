// Suite 4 — Multi-file drag-drop regression + core smoke
// The filename-race fix: dropping aging + ERS + VMI in ONE selection must give the
// same result as importing them one at a time (previously the chunked invoice
// import could read the NEXT file's name for its customer fallback).
const { boot, mkFile, importBankImage, makeT, sleep, UPLOADS } = require('./harness');
const path = require('path');

(async () => {
  const { w, errors } = await boot();
  const { t, done } = makeT('Suite 4 — Multi-file regression & smoke');

  // ── One drop, three files, through the real handleFiles queue ──
  // The aging file is first mapped into the ARMP template (production requires
  // it); ERS/VMI are remittance files and pass through unchanged.
  const { mapRawSapToArmpTemplate } = require('./harness');
  const mappedAging = mapRawSapToArmpTemplate(
    path.join(UPLOADS, 'Applied_Materials_Aging_Detail_FBL5N_06_01_2026.XLSX'),
    { customerName: 'Applied Materials', currency: 'USD' }).outPath;
  w.eval(`IMP_TYPE='inv'; IMP_BANK_MODE=false;`);
  const files = [
    mkFile(w, mappedAging, 'Applied Materials Aging Detail FBL5N 06.01.2026.xlsx'),
    mkFile(w, path.join(UPLOADS, 'ERS_Selfbilling_LineDetails.XLS')),
    mkFile(w, path.join(UPLOADS, 'VMI_Selfbilling_LineDetails.XLS'))
  ];
  await w.handleFiles({ files, value: 'multi' });
  // wait for chunked aging finalization
  for (let i = 0; i < 200; i++) {
    if (w.eval(`(function(){ try{ return INV.length>0 && _INV_IDX && _INV_IDX.byInv && _INV_IDX.byInv.size>0; }catch(e){ return false; } })()`)) break;
    await sleep(50);
  }
  await sleep(200);

  t('multi-drop: aging imported (2226)', w.eval('INV.length') === 2226, w.eval('INV.length'));
  t('multi-drop: ERS + VMI imported',
    w.eval('ERS_LINES.length') > 0 && w.eval('VMI_LINES.length') > 0,
    w.eval(`JSON.stringify({e:ERS_LINES.length,v:VMI_LINES.length})`));
  t('multi-drop: customer name from the AGING filename, not a later file',
    w.eval(`INV[0].c`) === 'Applied Materials', JSON.stringify(w.eval('INV[0].c')));

  await importBankImage(w);
  await sleep(300);
  await w.runMatch();
  await sleep(500);

  const excOpen = w.eval(`JSON.parse(JSON.stringify(EXC.filter(e=>e.s==='Open')))`);
  const applied = w.eval(`RES.reduce((s,r)=>s+(r.pd||0),0)`);
  t('multi-drop match: exactly ONE exception', excOpen.length === 1,
    JSON.stringify(excOpen.map(e => ({ type: e.type, amt: e.amt, notes: e.notes }))).slice(0, 300));
  t('multi-drop match: COA for SO 2104396495 at $2,750',
    excOpen[0] && Math.abs(excOpen[0].amt - 2750) < 0.01 && excOpen[0].notes === 'COA for SO 2104396495',
    excOpen[0] && excOpen[0].notes);
  t('multi-drop match: full tie-out to $232,050',
    Math.abs(applied + (excOpen[0] ? excOpen[0].amt : 0) - 232050) < 0.005, applied);
  t('multi-drop match: 37 applications', w.eval('RES.length') === 37, w.eval('RES.length'));

  // ── Regression smoke: pre-existing behaviors untouched ──
  t('armpClearEverything still defined for other tabs',
    w.eval(`typeof armpClearEverything==='function'`));
  t('revertResultGroup unchanged (still creates re-triage EXCs)',
    w.eval(`String(revertResultGroup).indexOf('Reopened from Review')>=0`));
  t('exportPostAndLock present and role-gated',
    w.eval(`typeof exportPostAndLock==='function' && String(exportPostAndLock).indexOf('canExport')>=0`));
  t('legacy clearAllExceptions untouched',
    w.eval(`typeof clearAllExceptions==='function'`));
  t('armpAnnotateMatch / confidence pipeline intact',
    w.eval(`typeof armpAnnotateMatch==='function' && RES[0] && typeof RES[0].confidence==='number'`));

  // armpClearEverything still clears the world (full reset unaffected by the review-scoped clear)
  w.eval(`armpClearEverythingCore()`);
  await sleep(150);
  t('armpClearEverythingCore wipes INV/PAY/RES/EXC/ERS/VMI',
    w.eval(`INV.length===0 && PAY.length===0 && RES.length===0 && EXC.length===0 && ERS_LINES.length===0 && VMI_LINES.length===0`),
    w.eval(`JSON.stringify({i:INV.length,p:PAY.length,r:RES.length,e:EXC.length})`));

  // ── Large-session persistence warning (load-test finding) ──
  t('oversized dataset triggers visible auto-save-off warning, once per session',
    w.eval(`(function(){
      var _saveINV = INV; var _saveN = window._storageSkipNotified;
      window._storageSkipNotified = false;
      var toasts = [];
      var _t = window.toast; window.toast = function(msg){ toasts.push(String(msg)); };
      var big = [{ pad: new Array(Math.ceil(5.2*1048576)).join('x') }];
      try { INV = big; saveToStorage(); } finally { INV = _saveINV; }
      var hit = toasts.some(function(m){ return /auto-save is off/i.test(m) && /Export/i.test(m); });
      var n = toasts.length;
      try { INV = big; saveToStorage(); } finally { INV = _saveINV; window.toast = _t; }
      var once = toasts.length === n;
      window._storageSkipNotified = _saveN;
      return hit && once;
    })()`) === true);

  t('no jsdom errors across multi-file flow', errors.length === 0, errors[0]);

  done();
  process.exit(process.exitCode || 0);
})().catch(e => { console.error('SUITE CRASH:', e); process.exit(1); });
