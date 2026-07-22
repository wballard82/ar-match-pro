// Staging smoke — boots the packaged deployable (deploy/app.html at project root)
// (not the dev working copy) and mirrors the manual go-live smoke test:
// Demo Mode → Auto Match → windowed queue → support bot → zero egress.
const path=require('path'); const fs=require('fs');
const _root=path.resolve(__dirname,'..');
process.env.ARMP_APP_PATH = process.env.ARMP_APP_PATH ||
  (fs.existsSync(path.join(_root,'deploy','app.html')) ? path.join(_root,'deploy','app.html') : path.join(_root,'app.html'));
const { boot, sleep, makeT } = require('./harness');

(async () => {
  const { w, errors } = await boot();
  const { t, done } = makeT('Staging smoke — deployable artifact');

  w.eval(`window._netCalls=[]; window.fetch=function(u){window._netCalls.push(String(u)); return Promise.reject(new Error('blocked'));};`);

  // Demo Mode
  w.eval('loadDemoData();');
  await sleep(200);
  t('Demo Mode: 1,000 invoices + 142 payments', w.eval('INV.length')===1000 && w.eval('PAY.length')===142);

  await w.runMatch();
  await sleep(800);
  const pct = w.eval(`(function(){ var ap=RES.reduce((s,r)=>s+(r.pd||0),0); var pd=PAY.reduce((s,p)=>s+(p.amt||0),0); return Math.round(100*ap/pd); })()`);
  t('Auto Match applies ≥90% of demo dollars', pct>=90, pct+'%');
  t('exceptions present for the Needs Attention story', w.eval(`EXC.filter(e=>e.s==='Open').length`)>=3);

  // Windowed queue behaves
  w.eval('renderPayQueue()');
  t('payment queue windowed', w.eval(`document.querySelectorAll('#pq-list .pq-item').length`)<=100);

  // Row-limit guardrail present in the deployed code
  t('2,500-row payment ceiling present', w.eval(`typeof armpShowImportLimit==='function'`));

  // Support bot runbooks live
  w.eval(`var o=document.getElementById('contact-modal-overlay'); if(o) o.style.display='flex';`);
  w.eval(`(function(){ var inp=document.getElementById('contact-chat-inp'); inp.value='my file was rejected, too large'; sendContactMsg(); })()`);
  t('support bot answers the row-limit runbook',
    /2,500 rows per file/.test(w.eval(`document.getElementById('contact-chat-msgs').innerHTML`)));

  // Zero egress across everything above
  t('ZERO outbound network calls', w.eval('window._netCalls.length')===0, w.eval('JSON.stringify(window._netCalls)'));
  t('no jsdom errors', errors.length===0, errors[0]);

  done();
  process.exit(process.exitCode || 0);
})().catch(e => { console.error('SMOKE CRASH:', e); process.exit(1); });
