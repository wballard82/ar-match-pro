// Suite 11 — Data boundary (network-instrumented)
// Boots the packaged app with fetch + XHR + sendBeacon + WebSocket instrumented,
// runs import → match → export on a real customer-derived fixture, and PROVES
// no financial content leaves the browser. Control-plane (Supabase auth/functions)
// endpoints are the only permitted network destinations, and none may carry
// file rows. LOCAL TEST: proves the frontend's behavior; the staging data-boundary
// run repeats this against the live staging site.
const path = require('path');
const { boot, importMappedInvoice, importBankImage, sleep, UPLOADS, makeT } = require('./harness');

(async () => {
  const { t, done } = makeT('Suite 11 — Data boundary (network-instrumented)');
  const { w } = await boot({ preEval: `
    window.__NET = [];
    (function(){
      var rec = function(kind, url, body){ try{ window.__NET.push({kind:kind, url:String(url||''), body: body==null?'':String(body).slice(0,20000)}); }catch(e){} };
      var _f = window.fetch;
      window.fetch = function(url, opts){ rec('fetch', url, opts && opts.body); return _f ? _f.apply(this, arguments) : Promise.reject(new Error('no network')); };
      var _o = window.XMLHttpRequest && window.XMLHttpRequest.prototype.open;
      var _s = window.XMLHttpRequest && window.XMLHttpRequest.prototype.send;
      if(_o){ window.XMLHttpRequest.prototype.open = function(m,u){ this.__u=u; return _o.apply(this,arguments); };
              window.XMLHttpRequest.prototype.send = function(b){ rec('xhr', this.__u, b); return _s.apply(this,arguments); }; }
      if(window.navigator) window.navigator.sendBeacon = function(u,b){ rec('beacon',u,b); return true; };
      window.WebSocket = function(u){ rec('ws',u,''); throw new Error('ws blocked in test'); };
    })();
  `});

  // Import a REAL customer-derived invoice fixture through the template adapter
  await importMappedInvoice(w, path.join(UPLOADS, 'Applied_Materials_Aging_Detail_FBL5N_06_01_2026.XLSX'), 'invoices.xlsx');
  await sleep(400);
  for (let i = 0; i < 100 && w.eval('INV.length') < 2226; i++) await sleep(100);
  const invCount = w.eval('INV.length');
  t('invoice import loaded rows locally', invCount > 100, `rows=${invCount}`);

  // Bank import (OCR image path) + match + export
  await importBankImage(w);
  await sleep(600);
  const matches = w.eval('PAY.length');
  t('bank payment created locally', matches === 1, `payments=${matches}`);
  try { w.eval('typeof exportCSV==="function" && exportCSV()'); } catch(e){}
  await sleep(300);

  const net = w.eval('JSON.stringify(window.__NET||[])');
  const calls = JSON.parse(net);
  // Sample sensitive values from the fixture that must never appear in any request
  const inv = w.eval('JSON.stringify(INV.slice(0,8).map(function(r){return [r.i, r.po, r.so, r.a, r.c];}))');
  const sensitive = JSON.parse(inv).flat().filter(x => x != null && String(x).length >= 4).map(String);
  t('captured sensitive sample values for scanning', sensitive.length >= 5, `${sensitive.length} values`);

  const financialLeaks = calls.filter(c => sensitive.some(v => c.body.includes(v) || c.url.includes(encodeURIComponent(v))));
  t('NO network call carries invoice numbers, amounts, or customer names', financialLeaks.length === 0,
    financialLeaks.length ? `${financialLeaks.length} leaks e.g. ${financialLeaks[0].url}` : '');
  const nonControlPlane = calls.filter(c => c.url && !/supabase\.co\/(auth|functions)\//.test(c.url) && !/^data:|^blob:/.test(c.url));
  t('only control-plane (supabase auth/functions) destinations were attempted', nonControlPlane.length === 0,
    nonControlPlane.length ? `e.g. ${nonControlPlane[0].kind} ${nonControlPlane[0].url.slice(0,80)}` : '');
  const bodies = calls.map(c=>c.body).join(' ');
  t('no spreadsheet/base64 file payload in any request body', !/UEsDB|base64,|\$[0-9]{1,3},[0-9]{3}\./.test(bodies));
  t('no WebSocket connections attempted', calls.filter(c=>c.kind==='ws').length === 0);
  t('export stayed local (no upload after export)', calls.filter(c=>c.body && c.body.length > 5000).length === 0);
  done();
})();
