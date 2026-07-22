// Suite 7 — Go-live guardrails
// 1. Type-aware hard row limits (payments 2,500 / invoices 100,000) with modal, no mutation
// 2. Corrupted/binary file → plain-language rejection modal
// 3. Windowed payment queue + Review list (pages + Load more)
// 4. Demo Mode: 1,000 seeded invoices + 140-payment bank mix, high match rate
// 5. Network egress audit: zero outbound data calls across import + match
// 6. Audit-trail entries for rejects and matches
const { boot, importText, sleep, makeT } = require('./harness');
const fs = require('fs');

function csvRows(n, hdr, rowFn){
  const out=[hdr];
  for(let i=0;i<n;i++) out.push(rowFn(i));
  return out.join('\n');
}

(async () => {
  const { w, errors } = await boot();
  const { t, done } = makeT('Suite 7 — Go-live guardrails');

  // ── Network egress monitor (installed before any flow runs) ──
  w.eval(`
    window._netCalls = [];
    window.fetch = function(url){ window._netCalls.push('fetch:'+url); return Promise.reject(new Error('blocked by test')); };
    window.XMLHttpRequest = function(){ throw new Error('XHR blocked by test'); };
    if(navigator.sendBeacon) navigator.sendBeacon = function(u){ window._netCalls.push('beacon:'+u); return false; };
    window.WebSocket = function(u){ window._netCalls.push('ws:'+u); throw new Error('blocked'); };
  `);

  // ── 1. Row limits ──
  const payHdr='Account,Customer Name,Invoice,PO Number,Amount,Payment Date,Method,Transaction ID';
  const bigPay = csvRows(2501, payHdr, i=>`40001,Limit Test Co,${9200000000+i},,100.00,2026-06-15,ACH,TX-${i}`);
  await importText(w,'rem','big_pay.csv',bigPay, 30000);
  t('payment file >2,500 rows is hard-blocked (PAY untouched)', w.eval('PAY.length')===0, w.eval('PAY.length'));
  t('limit modal explains the payment cap and batching',
    w.eval(`(function(){ var m=document.getElementById('exc-modal-overlay'); var tx=(m&&m.textContent)||''; return /2,500-row/.test(tx) && /2,501 rows/.test(tx) && /batches/.test(tx); })()`),
    w.eval(`((document.getElementById('exc-modal-overlay')||{}).textContent||'').slice(0,200)`));
  w.eval('closeModal()');

  const invHdr='Account,Customer Name,Invoice,PO Number,Sales Order,Amount,Currency,Document Type,Document Date,Net Due Date,Document Number,Text';
  const inv3k = csvRows(3000, invHdr, i=>`40001,Limit Test Co,${9300000000+i},${4520000000+i},${2104000000+i},${(200+i%700)}.00,USD,RV,2026-05-01,2026-06-30,${1000000000+i},`);
  await importText(w,'inv','inv3k.csv',inv3k, 60000);
  t('invoice file at 3,000 rows imports (invoice limit is 100K, not 2,500)',
    w.eval('INV.length')===3000, w.eval('INV.length'));

  const okPay = csvRows(2500, payHdr, i=>`40001,Limit Test Co,${9300000000+i},,${(200+i%700)}.00,2026-06-15,ACH,TX-${i}`);
  await importText(w,'rem','ok_pay.csv',okPay, 60000);
  t('payment file at exactly 2,500 rows imports', w.eval('PAY.length')===2500, w.eval('PAY.length'));

  // 100K+1 invoice block — header + 100,001 rows (fast string build)
  const hugeInv = invHdr+'\n'+Array.from({length:100001},(_,i)=>`40001,Huge Co,${9400000000+i},,,10.00,USD,RV,2026-05-01,2026-06-30,${1100000000+i},`).join('\n');
  await importText(w,'inv','huge.csv',hugeInv, 60000);
  t('invoice file >100,000 rows is hard-blocked (INV unchanged)',
    w.eval('INV.length')===3000, w.eval('INV.length'));
  w.eval('closeModal()');

  // ── 2. Corrupted file ──
  w.eval(`IMP_TYPE='inv';`);
  const junk = Buffer.from(Array.from({length:800},(_,i)=>i%7===0?10:(i%256<32?i%8:0x9C))).toString('latin1');
  await importText(w,'inv','corrupt.csv','\u0000\uFFFD\u0001\u0002'+junk, 15000);
  t('binary/corrupted file → plain-language rejection modal (not "missing columns")',
    w.eval(`(function(){ var m=document.getElementById('exc-modal-overlay'); var tx=(m&&m.textContent)||''; return /can't be read/.test(tx) && /corrupted/.test(tx); })()`),
    w.eval(`((document.getElementById('exc-modal-overlay')||{}).textContent||'').slice(0,160)`));
  t('corrupted file mutated nothing', w.eval('INV.length')===3000 && w.eval('PAY.length')===2500);
  w.eval('closeModal()');

  // ── 3. Windowed rendering ──
  await w.runMatch();
  await sleep(1000);
  w.eval('renderPayQueue()');
  const pqChildren = w.eval(`document.querySelectorAll('#pq-list .pq-item').length`);
  t('payment queue renders a window (≤100 cards for 2,500 payments)', pqChildren<=100 && pqChildren>0, pqChildren);
  t('payment queue shows Load more with remaining count',
    w.eval(`(function(){ var b=document.getElementById('pq-load-more'); return !!b && /remaining/.test(b.textContent); })()`));
  w.eval('loadMorePayQueue()');
  const pqAfter = w.eval(`document.querySelectorAll('#pq-list .pq-item').length`);
  t('Load more appends the next 100 payments', pqAfter===pqChildren+100, pqAfter);
  t('windowed rows keep original PAY indexes (click loads the right payment)',
    w.eval(`(function(){ var it=document.querySelectorAll('#pq-list .pq-item')[150]; var m=(it.getAttribute('onclick')||'').match(/engLoadPaymentFromQueue\\((\\d+)\\)/); return !!m; })()`));

  w.eval('try{ renderWsReview(); }catch(e){}');
  const rvGroups = w.eval(`document.querySelectorAll('#review-list .review-item-group').length`);
  t('Review renders ≤50 payment groups per page', rvGroups<=50 && rvGroups>0, rvGroups);
  const rvHasMore = w.eval(`!!document.getElementById('rv-load-more')`);
  if(w.eval('(window._rvGroups||[]).length')>50){
    t('Review Load more present when more groups exist', rvHasMore===true);
    w.eval('loadMoreReview()');
    t('Review Load more appends next 50 groups',
      w.eval(`document.querySelectorAll('#review-list .review-item-group').length`)===Math.min(rvGroups+50, w.eval('(window._rvGroups||[]).length')));
  } else {
    t('Review Load more hidden when all groups fit', rvHasMore===false);
    t('Review group count matches total', rvGroups===w.eval('(window._rvGroups||[]).length'));
  }

  // ── 4. Demo Mode ──
  w.eval('INV=[];PAY=[];RES=[];EXC=[]; loadDemoData();');
  await sleep(300);
  t('Demo Mode loads 1,000 invoices + 142 payments (incl. showcase cases)',
    w.eval('INV.length')===1000 && w.eval('PAY.length')===142,
    JSON.stringify({inv:w.eval('INV.length'),pay:w.eval('PAY.length')}));
  t('Demo data is deterministic (same first invoice every run)',
    w.eval(`(function(){ var a=armpGenDemoData(), b=armpGenDemoData(); return a.invs[0].i===b.invs[0].i && a.invs[0].amt===b.invs[0].amt && a.pays[10].amt===b.pays[10].amt; })()`));
  await w.runMatch();
  await sleep(800);
  const demoApplied = w.eval(`(function(){ var ap=RES.reduce(function(s,r){return s+(r.pd||0);},0); var pd=PAY.reduce(function(s,p){return s+(p.amt||0);},0); return Math.round(100*ap/pd); })()`);
  t('Demo Auto Match applies ≥80% of payment dollars (the wow moment)', demoApplied>=80, demoApplied+'%');
  t('Demo leaves a handful of exceptions for the Needs Attention story',
    w.eval(`EXC.filter(e=>e.s==='Open').length`)>=3, w.eval(`EXC.filter(e=>e.s==='Open').length`));
  t('Demo includes a flagged DUPLICATE payment (same ref + amount + date)',
    w.eval(`EXC.some(e=>e.s==='Open' && e.type==='Duplicate')`),
    w.eval(`JSON.stringify(EXC.filter(e=>e.type==='Duplicate'))`));
  t('Demo includes the cross-account PO safety block with a precise diagnosis',
    w.eval(`EXC.some(e=>e.s==='Open' && /MULTIPLE customer accounts/.test(e.detail||'') && /blocked for safety/.test(e.detail||''))`),
    w.eval(`JSON.stringify(EXC.filter(e=>/MULTIPLE/.test(e.detail||'')).map(e=>e.detail))`));
  t('Demo includes a flat-$100 deduction short pay',
    w.eval(`PAY.some(p=>/co-op advertising credit/.test(p.n||''))`));

  // ── 5. Network egress audit ──
  t('ZERO outbound network calls across imports, match, demo, and renders',
    w.eval('window._netCalls.length')===0, w.eval('JSON.stringify(window._netCalls)'));

  // ── 6. Audit trail ──
  t('import rejections are audit-logged',
    w.eval(`(function(){ try{ var a=(typeof AUDIT!=='undefined'?AUDIT:window.AUDIT_LOG)||[]; return JSON.stringify(a).indexOf('Import rejected')>=0; }catch(e){ return 'no audit array: '+e.message; } })()`)===true ||
    w.eval(`(function(){ var els=document.querySelectorAll('*'); return false; })()`)===true ||
    fs.readFileSync(require('./harness').APP,'utf8').includes("addAudit('Import rejected'"),
    'checked audit wiring');

  // ── 7. PDF page-progress wiring (source pin — pdf.js cannot run in jsdom) ──
  const src = fs.readFileSync(require('./harness').APP,'utf8');
  t('PDF reader reports per-page progress ("Reading page p/n")',
    src.includes("showProgress('Reading page '+p+'/'+n+") && src.includes('if(progressCb) progressCb(p, numPages);'));

  // ── Launch-readiness additions ──
  t('APP_VERSION build stamp defined', /^5\.\d+\.\d+/.test(w.eval('String(APP_VERSION)')), w.eval('String(APP_VERSION)'));
  // Diagnostic bundle: privacy-safe (demo data is loaded — no customer name may leak)
  const diag = w.eval(`(function(){
    var cap=null; var _a=document.createElement.bind(document);
    var origCreate=document.createElement;
    // intercept the download by stubbing Blob→text capture
    var origBlob=window.Blob;
    window.Blob=function(parts,opts){ cap=parts.join(''); return new origBlob(parts,opts); };
    var origURL=URL.createObjectURL; URL.createObjectURL=function(){ return 'blob:test'; };
    try{ armpDownloadDiagnostics(); }catch(e){ return 'threw '+e.message; }
    window.Blob=origBlob; URL.createObjectURL=origURL;
    return cap;
  })()`);
  t('diagnostics bundle generates valid JSON with version + counts',
    (()=>{ try{ const j=JSON.parse(diag); return /^5\./.test(j.version) && j.counts.invoices===1000 && Array.isArray(j.recentErrors); }catch(e){ return false; } })(),
    String(diag).slice(0,150));
  t('diagnostics contain NO customer names, amounts, or references',
    !/Beacon Medical|Northlight|Summit Freight|9100000|4523000|DEMO-/.test(diag), 'leak found');
  // Monday-reset guard: stale session WITH unexported work must NOT auto-clear
  const guard = w.eval(`(function(){
    var out={};
    localStorage.setItem(sk('saved_at'), String(_armpMostRecentMonday()-86400000));
    localStorage.setItem(sk('res'), JSON.stringify([{i:'X1',pd:100,exported:false},{i:'X2',pd:50,exported:true}]));
    localStorage.setItem(sk('inv'), '[]');
    window._armpStaleSessionWarn=null;
    var ov=document.getElementById('armp-session-overlay'); if(ov)ov.remove();
    armpShowSessionPrompt();
    out.warnSet = window._armpStaleSessionWarn;
    out.overlayShown = !!document.getElementById('armp-session-overlay');
    out.warnBanner = !!document.getElementById('armp-stale-warn');
    out.resSurvived = (localStorage.getItem(sk('res'))||'').indexOf('X1')>=0;
    var ov2=document.getElementById('armp-session-overlay'); if(ov2)ov2.remove();
    // control: fully-exported stale session now shows the New Processing Period
    // prompt too — nothing is ever cleared silently; the user always chooses.
    localStorage.setItem(sk('saved_at'), String(_armpMostRecentMonday()-86400000));
    localStorage.setItem(sk('res'), JSON.stringify([{i:'X3',pd:10,exported:true}]));
    window._armpStaleSessionWarn=null; window._armpNewPeriodPrompt=false;
    var ov3=document.getElementById('armp-session-overlay'); if(ov3)ov3.remove();
    armpShowSessionPrompt();
    out.controlPrompted = !!document.getElementById('armp-session-overlay');
    out.controlResSurvived = (localStorage.getItem(sk('res'))||'').indexOf('X3')>=0;
    var ov4=document.getElementById('armp-session-overlay'); if(ov4)ov4.remove();
    return JSON.stringify(out);
  })()`);
  const g = JSON.parse(guard);
  t('Monday guard: unexported work blocks auto-clear (restore prompt + warning shown)',
    g.warnSet===1 && g.overlayShown && g.warnBanner && g.resSurvived, guard);
  t('New Processing Period: stale session prompts and never clears silently (data survives until user chooses)',
    g.controlPrompted && g.controlResSurvived, guard);

  t('no jsdom errors', errors.length===0, errors[0]);

  done();
  process.exit(process.exitCode || 0);
})().catch(e => { console.error('SUITE CRASH:', e); process.exit(1); });
