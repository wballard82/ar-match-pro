// Suite 8 — Support bot: troubleshooting runbooks, strict boundaries, escalation.
// Drives the real chat widget (sendContactMsg → DOM) — not just the KB function.
const { boot, sleep, makeT } = require('./harness');

(async () => {
  const { w, errors } = await boot();
  const { t, done } = makeT('Suite 8 — Support bot');

  // Zero-egress stays true with the bot active
  w.eval(`window._netCalls=[]; window.fetch=function(u){window._netCalls.push(String(u)); return Promise.reject(new Error('blocked'));};`);

  // Chat widget lives in the contact modal; open it and talk through the real path
  w.eval(`var o=document.getElementById('contact-modal-overlay'); if(o) o.style.display='flex';`);
  function ask(msg){
    w.eval(`(function(){
      var inp=document.getElementById('contact-chat-inp');
      inp.value=${JSON.stringify(msg)};
      sendContactMsg();
    })()`);
    return w.eval(`(function(){
      var msgs=document.getElementById('contact-chat-msgs');
      var bubbles=msgs.querySelectorAll('div');
      return msgs.innerHTML;
    })()`);
  }

  // ── Runbook 1: rejected file ──
  let r = ask('my payment file upload was rejected, it says file too large');
  t('rejected-file answer states the 2,500-row payment cap and batching',
    /2,500 rows per file/.test(r) && /split/i.test(r), r.slice(-300));
  t('rejected-file answer confirms the 100,000-row invoice ceiling', /100,000 rows/.test(r));

  r = ask("the import says this file can't be read");
  t('corrupted-file answer gives the Excel Save-As-CSV fix', /Save As → CSV/.test(r));

  // ── Runbook 2: freeze / crash ──
  r = ask('the app is frozen and my tab crashed');
  t('crash answer leads with payment volume and gives the session guidance',
    /payment volume/i.test(r) && /2,500 payment rows/.test(r) && /3,000 per session/.test(r));
  t('crash answer gives the recovery steps (export, refresh, batches)',
    /refresh the tab/i.test(r) && /smaller batches/i.test(r));
  t('crash answer clears invoices of blame', /100K invoices run fine/.test(r));

  // ── Runbook 3: OCR slow ──
  r = ask('the OCR is taking forever on my scanned pdf, is it stuck?');
  t('OCR answer reassures, gives 2.4s/page and the honest 4–8 minute range',
    /hasn't crashed/.test(r) && /2\.4 seconds per page/.test(r) && /4–8 minutes/.test(r));
  t('OCR answer points at the page-by-page progress bar', /Reading page X\/Y/.test(r));
  t('OCR answer ties local processing to privacy', /never leaves your machine/.test(r));

  // ── Runbook 4: auto-save off ──
  r = ask('it says auto-save is off, did I lose my work?');
  t('auto-save answer gives the ~13,000-invoice / 5MB cause',
    /13,000 invoices/.test(r) && /5MB/.test(r));
  t('auto-save answer gives the one rule: export before closing',
    /export your posting file before closing/i.test(r));

  // ── Runbook 5: why exceptions ──
  r = ask('why are there unapplied payments in needs attention, it refuses to match them');
  t('exceptions answer explains conservative exact-tie matching',
    /never guess-applies/.test(r) && /exactly/.test(r));
  t('exceptions answer frames 5–10% exceptions as the control working',
    /5–10%/.test(r) && /control working/.test(r));
  t('COA means Cash on Account — never Chart of Accounts',
    /Cash on Account/.test(r) && !/chart of accounts/i.test(r));

  // ── Boundary: never claim direct integration ──
  r = ask('does ARMP integrate directly with SAP via API?');
  t('integration answer uses the import-file framing',
    /import files/i.test(r) && /SAP/.test(r) && /NetSuite/.test(r) && !/F-28/.test(r));
  t('integration answer no longer promises same-day go-live',
    !/live the same day/i.test(r) && /No ERP integration or implementation project required/i.test(r));
  t('integration answer never claims API writes to the ERP',
    /doesn't write to your ERP via API/.test(r));

  // ── Security question ──
  r = ask('where does my bank data go? is it secure?');
  t('security answer states local processing + DevTools verification',
    /entirely inside your browser tab/.test(r) && /DevTools/.test(r));

  // ── Escalation protocol ──
  r = ask('I found a bug — the export shows the wrong amount for one payment');
  t('bug reports escalate to the founder with a pre-filled email',
    /sorted for you immediately/.test(r) && /mailto:info@armatchpro\.com/.test(r));
  t('escalation reassures on data safety', /data is safe/.test(r));

  // ── Fallback still honest ──
  r = ask('what is the airspeed velocity of an unladen swallow');
  t('unknown questions decline to guess and route to a human',
    /rather connect you with a person than guess/.test(r) && /info@armatchpro\.com/.test(r));

  // ── Regression: original how-to entries still answer ──
  r = ask('how do I export a posting file to netsuite');
  t('original how-to KB entries still work', /Posting Export/.test(r));

  // ── Zero egress with the bot in use ──
  t('support bot makes ZERO network calls', w.eval('window._netCalls.length')===0,
    w.eval('JSON.stringify(window._netCalls)'));

  t('no jsdom errors', errors.length===0, errors[0]);

  done();
  process.exit(process.exitCode || 0);
})().catch(e => { console.error('SUITE CRASH:', e); process.exit(1); });
