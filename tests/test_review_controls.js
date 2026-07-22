// Suite 2 — Review controls: Approve All ↔ Unselect All toggle; Clear all scoped to Review
const { boot, importFile, importMappedInvoice, importBankImage, makeT, sleep, UPLOADS } = require('./harness');
const path = require('path');

(async () => {
  const { w, d, errors } = await boot();
  const { t, done } = makeT('Suite 2 — Review controls');

  // Real pipeline to populate Review
  await importMappedInvoice(w, path.join(UPLOADS, 'Applied_Materials_Aging_Detail_FBL5N_06_01_2026.XLSX'),
    'Applied_Materials_ARMP_Template.xlsx', { customerName: 'Applied Materials', currency: 'USD' });
  for (let i = 0; i < 100 && w.eval('INV.length') < 2226; i++) await sleep(100);
  await importFile(w, 'rem', path.join(UPLOADS, 'ERS_Selfbilling_LineDetails.XLS'));
  await importFile(w, 'rem', path.join(UPLOADS, 'VMI_Selfbilling_LineDetails.XLS'));
  await importBankImage(w);
  await sleep(300);
  await w.runMatch();
  for (let i = 0; i < 100 && !w.eval('autoMatchHasRun'); i++) await sleep(100);
  await sleep(500);

  t('boot/import: no jsdom errors', errors.length === 0, errors[0]);
  const resN = w.eval('RES.length');
  t('review populated from real match (37 rows)', resN === 37, resN);

  w.eval(`renderWsReview()`);
  await sleep(100);

  // ── Initial state: tie-out scenario matches arrive approved (fromAlloc = Ready for Export) ──
  const approved0 = w.eval(`RES.filter(r=>_armpIsReviewApproved(r)).length`);
  t('scenario matches arrive approved (existing Ready-for-Export design)', approved0 === 37, approved0);
  const btnLabel0 = w.eval(`document.getElementById('review-approve-all-btn').textContent`);
  t('button reflects state: says Unselect All when everything is approved', /Unselect All/.test(btnLabel0), btnLabel0);
  const approvedBadges = w.eval(`document.querySelectorAll('#review-list .badge-g').length`);
  t('UI shows ✓ Approved badges', approvedBadges > 0, approvedBadges);
  const postReady1 = w.eval(`RES.filter(r=>(r.st==='Exact'||r.st==='Subset exact'||r.fromExc||(r.fromAlloc&&r.unapproved!==true))&&!r.exported).length`);
  t('all 37 export-ready while approved', postReady1 === 37, postReady1);

  // ── Click 1: Unselect All ──
  w.eval(`approveAllReviewItems()`);
  await sleep(150);
  const approved2 = w.eval(`RES.filter(r=>_armpIsReviewApproved(r)).length`);
  t('click unselects all (0 approved)', approved2 === 0, approved2);
  const btnLabel2 = w.eval(`document.getElementById('review-approve-all-btn').textContent`);
  t('button flips to Approve All', /Approve All/.test(btnLabel2), btnLabel2);
  const resStill = w.eval('RES.length');
  t('unselect does NOT remove rows from Review', resStill === 37, resStill);
  const excAfterUnselect = w.eval(`EXC.filter(e=>e.s==='Open').length`);
  t('unselect creates no exceptions (unlike Revert)', excAfterUnselect === 1, excAfterUnselect);
  const flagsClean = w.eval(`RES.every(r=>r._preBulk===undefined && _armpIsReviewApproved(r)===false)`);
  t('no stash residue; every row reads unapproved', flagsClean,
    w.eval(`JSON.stringify(RES.filter(r=>r._preBulk!==undefined||_armpIsReviewApproved(r)).slice(0,2))`));

  // ── Click 2: Approve All (toggle is repeatable) ──
  w.eval(`approveAllReviewItems()`);
  await sleep(150);
  t('second click re-approves all 37', w.eval(`RES.filter(r=>_armpIsReviewApproved(r)).length`) === 37);
  t('button says Unselect All again', /Unselect All/.test(w.eval(`document.getElementById('review-approve-all-btn').textContent`)));
  t('re-approve leaves no unapproved markers', w.eval(`RES.every(r=>r.unapproved!==true)`));

  // ── Individual approve interplay: unselect all, approve one group, Approve All completes the rest ──
  w.eval(`approveAllReviewItems()`); // back to none
  await sleep(100);
  w.eval(`approveResultGroup([0])`);
  await sleep(100);
  t('individual approve works after bulk unselect', w.eval(`_armpIsReviewApproved(RES[0])===true`));
  w.eval(`approveAllReviewItems()`);
  await sleep(100);
  t('Approve All completes remaining rows', w.eval(`RES.filter(r=>_armpIsReviewApproved(r)).length`) === 37);

  // ── Clear all (Review-scoped) ──
  const btnHtml = w.eval(`document.querySelector('#ws-review-panel, body').innerHTML.indexOf('clearReviewSection()')>=0`);
  t('Review "Clear all" button wired to clearReviewSection (not armpClearEverything)', btnHtml === true);
  const before = w.eval(`JSON.stringify({inv:INV.length,pay:PAY.length,exc:EXC.length,ers:ERS_LINES.length,vmi:VMI_LINES.length})`);
  w.eval(`clearReviewSection()`);
  await sleep(150);
  // styled confirm should be up — confirm it
  const confirmUp = w.eval(`!!document.getElementById('armp-styled-confirm')`);
  t('clearReviewSection asks for confirmation', confirmUp);
  w.eval(`(function(){
    var m=document.getElementById('armp-styled-confirm');
    var btns=m?m.querySelectorAll('button'):[];
    for(var i=0;i<btns.length;i++){ if(/Clear Review/i.test(btns[i].textContent)){ btns[i].click(); return; } }
  })()`);
  await sleep(200);
  const after = w.eval(`JSON.stringify({inv:INV.length,pay:PAY.length,exc:EXC.length,ers:ERS_LINES.length,vmi:VMI_LINES.length})`);
  t('RES emptied by Clear Review', w.eval('RES.length') === 0, w.eval('RES.length'));
  t('imports/payments/exceptions untouched by Clear Review', before === after, before + ' vs ' + after);
  const invReopened = w.eval(`INV.filter(v=>v.s).length`);
  t('cleared invoices reopened (no lingering matched status)', invReopened === 0, invReopened);

  // Cancel path: nothing happens
  w.eval(`clearReviewSection()`);
  await sleep(100);
  t('Clear Review on empty review is a no-op with info toast', !w.eval(`!!document.getElementById('armp-styled-confirm')`));

  // ── Exported rows are protected from both toggle and clear ──
  w.eval(`
    RES=[{a:'40017108',c:'X',i:'INV1',oa:100,pd:100,vr:0,st:'Exact',m:'t',exported:true},
         {a:'40017108',c:'X',i:'INV2',oa:50,pd:50,vr:0,st:'Exact',m:'t'}];
    autoMatchHasRun=true;
    renderWsReview();
  `);
  await sleep(100);
  w.eval(`approveAllReviewItems()`);
  await sleep(100);
  t('Approve All skips exported (locked) rows', w.eval(`RES[0].approved!==true && RES[1].approved===true`),
    w.eval(`JSON.stringify(RES.map(r=>({i:r.i,ap:r.approved})))`));
  w.eval(`clearReviewSection()`);
  await sleep(100);
  w.eval(`(function(){
    var m=document.getElementById('armp-styled-confirm');
    var btns=m?m.querySelectorAll('button'):[];
    for(var i=0;i<btns.length;i++){ if(/Clear Review/i.test(btns[i].textContent)){ btns[i].click(); return; } }
  })()`);
  await sleep(100);
  t('Clear Review keeps exported rows, removes the rest',
    w.eval(`RES.length===1 && RES[0].exported===true`), w.eval(`JSON.stringify(RES)`));

  done();
  process.exit(process.exitCode || 0);
})().catch(e => { console.error('SUITE CRASH:', e); process.exit(1); });
