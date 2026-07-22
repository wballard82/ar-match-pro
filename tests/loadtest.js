// Load benchmark — synthetic AR population at a given scale.
// Usage: node tests/loadtest.js <numInvoices> <numPayments>
// Fresh process per scale so heap numbers are isolated.
const { boot, importText, sleep } = require('./harness');
const fs = require('fs');

const N_INV = parseInt(process.argv[2] || '10000', 10);
const N_PAY = parseInt(process.argv[3] || '1000', 10);

function money(x){ return (Math.round(x * 100) / 100).toFixed(2); }

function genData(){
  // 25 customers, 1-3 accounts each — realistic mid-market book
  const custs = [];
  for(let c = 0; c < 25; c++){
    const nAcc = 1 + (c % 3);
    const accs = [];
    for(let a = 0; a < nAcc; a++) accs.push(String(40100000 + c * 10 + a));
    custs.push({ name: 'SYN CUSTOMER ' + String(c + 1).padStart(2, '0') + ' INC', accs });
  }
  const invRows = ['Account,Customer Name,Invoice,PO Number,Sales Order,Amount,Currency,Document Type,Document Date,Net Due Date,Document Number,Text'];
  const invs = [];
  let po = 4520000000, so = 2104000000, poLeft = 0, curPO = '', curSO = '';
  for(let i = 0; i < N_INV; i++){
    if(poLeft === 0){ poLeft = 1 + (i % 4); curPO = String(++po); curSO = String(++so); }
    poLeft--;
    const cu = custs[i % custs.length];
    const acct = cu.accs[i % cu.accs.length];
    const amt = money(50 + ((i * 7919) % 2400000) / 100);   // $50 – $24,050, deterministic spread
    const inv = String(9000000000 + i);
    const d = new Date(2026, (i % 6), 1 + (i % 27));
    const dd = d.toISOString().slice(0, 10);
    invs.push({ i: inv, po: curPO, so: curSO, a: acct, c: cu.name, amt: parseFloat(amt) });
    invRows.push([acct, cu.name, inv, curPO, curSO, amt, 'USD', 'RV', dd, dd, String(1000000000 + i), ''].join(','));
  }
  // PO sums for group payments
  const poMap = new Map();
  invs.forEach(v => { if(!poMap.has(v.po)) poMap.set(v.po, []); poMap.get(v.po).push(v); });
  const poList = Array.from(poMap.values()).filter(g => g.length >= 2);

  const payRows = ['Account,Customer Name,Invoice,PO Number,Amount,Payment Date,Method,Transaction ID'];
  let expect = { exact: 0, poGroup: 0, amountOnly: 0, shortPay: 0, noMatch: 0 };
  for(let p = 0; p < N_PAY; p++){
    const roll = p % 100;
    const txId = 'TX-' + String(p + 1).padStart(6, '0');
    if(roll < 60){                                   // exact single-invoice
      const v = invs[(p * 13) % invs.length];
      payRows.push([v.a, v.c, v.i, '', money(v.amt), '2026-06-15', 'ACH', txId].join(','));
      expect.exact++;
    } else if(roll < 75 && poList.length){           // PO-group sum
      const g = poList[(p * 7) % poList.length];
      const tot = g.reduce((s, v) => s + v.amt, 0);
      payRows.push([g[0].a, g[0].c, '', g[0].po, money(tot), '2026-06-15', 'ACH', txId].join(','));
      expect.poGroup++;
    } else if(roll < 85){                            // amount-only
      const v = invs[(p * 31 + 5) % invs.length];
      payRows.push([v.a, v.c, '', '', money(v.amt), '2026-06-15', 'Wire', txId].join(','));
      expect.amountOnly++;
    } else if(roll < 93){                            // short pay
      const v = invs[(p * 17 + 3) % invs.length];
      payRows.push([v.a, v.c, v.i, '', money(v.amt * 0.97), '2026-06-15', 'Check', txId].join(','));
      expect.shortPay++;
    } else {                                         // no match → COA
      const cu = custs[p % custs.length];
      payRows.push([cu.accs[0], cu.name, '', '', money(123.45 + p), '2026-06-15', 'Wire', txId].join(','));
      expect.noMatch++;
    }
  }
  return { invCSV: invRows.join('\n'), payCSV: payRows.join('\n'), expect };
}

function mb(x){ return (x / 1048576).toFixed(0); }

const PROG = '/tmp/loadtest_progress.txt';
function prog(phase, extra){
  const hu = Math.round(process.memoryUsage().heapUsed/1048576);
  const line = `[${new Date().toISOString().slice(11,19)}] ${phase} heap=${hu}MB ${extra||''}`;
  try{ fs.appendFileSync(PROG, line + '\n'); }catch(e){}
}
let PEAK = 0;
setInterval(() => { const h = process.memoryUsage().heapUsed; if(h > PEAK){ PEAK = h; } }, 500).unref();

(async () => {
  const t0 = Date.now();
  try{ fs.writeFileSync(PROG, ''); }catch(e){}
  const { invCSV, payCSV, expect } = genData();
  const R = { scale: { invoices: N_INV, payments: N_PAY }, expect, ms: {}, mem: {}, sizes: {}, counts: {} };

  prog('generated', `inv=${N_INV} pay=${N_PAY}`);
  const { w } = await boot();
  R.mem.afterBoot = mb(process.memoryUsage().heapUsed);
  prog('booted');

  let t = Date.now();
  await importText(w, 'inv', 'synthetic_invoices.csv', invCSV);
  R.ms.importInvoices = Date.now() - t;
  prog('invoices imported', `${R.ms.importInvoices}ms`);
  R.counts.INV = w.eval('INV.length');
  R.mem.afterInvImport = mb(process.memoryUsage().heapUsed);

  t = Date.now();
  w.eval('_invalidateInvIndexes(); _ensureInvIndexes();');
  R.ms.rebuildIndexes = Date.now() - t;

  t = Date.now();
  await importText(w, 'rem', 'synthetic_bank.csv', payCSV);
  R.ms.importPayments = Date.now() - t;
  prog('payments imported', `${R.ms.importPayments}ms`);
  R.counts.PAY = w.eval('PAY.length');

  // Persistence reality check (5MB localStorage quota)
  R.sizes.invJsonMB = (w.eval('JSON.stringify(INV).length') / 1048576).toFixed(1);
  R.sizes.payJsonMB = (w.eval('JSON.stringify(PAY).length') / 1048576).toFixed(1);
  t = Date.now();
  w.eval('saveToStorage()');
  R.ms.saveToStorage = Date.now() - t;
  R.counts.storageSkipped = w.eval('!!window._storageSkipNotified');

  // The match itself
  t = Date.now();
  await w.runMatch();
  R.ms.runMatch = Date.now() - t;
  prog('match complete', `${R.ms.runMatch}ms`);
  R.counts.RES = w.eval('RES.length');
  R.counts.EXC = w.eval('EXC.length');
  R.counts.dollarAppliedPct = w.eval(`(function(){
    var applied = RES.reduce(function(s,r){return s+(r.pd||0);},0);
    var paid = PAY.reduce(function(s,p){return s+(p.amt||0);},0);
    return Math.round(100*applied/Math.max(paid,1));
  })()`);
  R.mem.afterMatch = mb(process.memoryUsage().heapUsed);

  // Render costs (string-build proxy for DOM cost; jsdom has no paint)
  t = Date.now();
  w.eval(`renderPayQueue()`);
  R.ms.renderPayQueue = Date.now() - t;
  R.sizes.payQueueHtmlMB = (w.eval(`((document.getElementById('pq-list')||{}).innerHTML||'').length`) / 1048576).toFixed(1);
  t = Date.now();
  w.eval(`renderFbl5n('ca-open-items-body','','')`);
  R.ms.renderInvGridPage = Date.now() - t;
  t = Date.now();
  w.eval(`try{ renderWsReview(); }catch(e){}`);
  R.ms.renderReview = Date.now() - t;
  R.sizes.reviewHtmlMB = (w.eval(`((document.getElementById('ws-review-list')||{}).innerHTML||'').length`) / 1048576).toFixed(1);

  // OCR text-parser throughput (client-side parse only, no Tesseract)
  const bigOCR = ['Supplier\tDate\tINV No.\tRemarks\tAmount', 'SYN CUSTOMER 01 INC'].concat(
    Array.from({ length: 1000 }, (_, i) =>
      `05/29\t${String(9000000000 + i)}\t1Z9998V6049${String(1000000 + i).slice(1)}\t$ ${money(100 + i)}`)
  ).join('\n');
  t = Date.now();
  const parsed = w.eval(`(function(){ try{ return (armpParseRemittanceOCRText(${JSON.stringify(bigOCR)})||[]).length; }catch(e){ return 'threw '+e.message; } })()`);
  R.ms.ocrTextParse1000Lines = Date.now() - t;
  R.counts.ocrLinesParsed = parsed;

  R.ms.total = Date.now() - t0;
  R.mem.peakSampledMB = Math.round(PEAK/1048576);
  prog('done');
  console.log(JSON.stringify(R, null, 1));
  process.exit(0);
})().catch(e => { console.error('LOADTEST CRASH:', e.message); process.exit(1); });
