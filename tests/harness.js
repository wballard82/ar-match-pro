// ARMP jsdom test harness — boots app.html with SheetJS injected and an admin login.
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const XLSXlib = require('xlsx');

// ── Portable path resolution ──────────────────────────────────────────────
// Tests run from the extracted project package with no environment setup:
//   APP     resolves to deploy/app.html at the project root (override: ARMP_APP_PATH)
//   UPLOADS resolves to tests/fixtures/ next to this file (override: ARMP_FIXTURES)
const PROJECT_ROOT = path.resolve(__dirname, '..');
function _firstExisting(cands){ for (const c of cands) { if (c && fs.existsSync(c)) return c; } return cands[cands.length-1]; }
const APP = _firstExisting([
  process.env.ARMP_APP_PATH,
  path.join(PROJECT_ROOT, 'deploy', 'app.html'),
  path.join(PROJECT_ROOT, 'app.html')
]);
const UPLOADS = _firstExisting([
  process.env.ARMP_FIXTURES,
  path.join(__dirname, 'fixtures')
]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Bank detail text exactly as it appears on the MUFG statement screenshot.
const BANK_OCR_TEXT = [
  '05/28/2026\tPREAUTHORIZED ACH CREDIT NONREF\tF\tACC-1401868\tACH\t232,050.00',
  'Credit',
  'ACH TRANSACTION/',
  'ACH TRANSACTION/',
  'R.REF ACC0674791/',
  'RMKS ACH CR:CTX: ENTRY DATE:05282026 02/',
  'NAME:ORIG:APPLIED MAT 0719 EDI PAYMNT',
  'INF:ORIG ID:1000000333 RCVR/',
  ' ID:2226040562/',
  'ACH CR:CTX: ENTRY DATE:05282026',
  '026148000674791/',
  'ORIG ID:1000000333/',
  'RCVR ID:2226040562/'
].join('\n');

async function boot(opts = {}) {
  const html = fs.readFileSync(APP, 'utf8');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => {
    const msg = String((e && e.message) || e);
    if (/resource|Could not load/i.test(msg)) return; // external CDNs can't load in sandbox
    errors.push(msg + (e && e.detail && e.detail.stack ? '\n' + e.detail.stack : ''));
  });
  vc.on('error', (m) => { /* app console.error is allowed; collected only via jsdomError */ });

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://armatchpro.test/',
    virtualConsole: vc,
    beforeParse(window) {
      window.XLSX = XLSXlib; // SheetJS injection (CDN unavailable in sandbox)
      window.matchMedia = window.matchMedia || function () {
        return { matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} };
      };
      window.scrollTo = function () {};
      window.IntersectionObserver = function () { return { observe() {}, disconnect() {}, unobserve() {} }; };
      window.ResizeObserver = function () { return { observe() {}, disconnect() {}, unobserve() {} }; };
      window.indexedDB = window.indexedDB || { open: function () { return { onsuccess: null, onerror: null, onupgradeneeded: null }; } };
      window.HTMLCanvasElement.prototype.getContext = function () { return null; };
      if (window.URL && !window.URL.createObjectURL) window.URL.createObjectURL = () => 'blob:test';
      if (window.URL && !window.URL.revokeObjectURL) window.URL.revokeObjectURL = () => {};
    }
  });

  const w = dom.window;
  if (opts.preEval) { try { w.eval(opts.preEval); } catch(e) { errors.push('preEval: '+e.message); } }
  await sleep(250); // let DOMContentLoaded handlers run

  // Login as master admin via the app's own launch path (skippable for auth-gate suites)
  if (!opts.skipLogin) w.eval(`
    CURRENT_USER='test@armatchpro.com'; IS_DEMO=false;
    window.ARMP_AUTH && (window.ARMP_AUTH.decision = {authorized:true, customer_role:'organization_admin', organization_name:'ARMP QA'});
    launchApp({name:'Test Admin',company:'ARMP QA',avatar:'',plan:'team',isMaster:true});
  `);
  await sleep(300);
  // Dismiss session-restore / setup prompts if present
  w.eval(`
    try{ if(typeof armpSessionStartFresh==='function'){ var m=document.getElementById('armp-session-prompt'); if(m) armpSessionStartFresh(); } }catch(e){}
    try{ var s=document.getElementById('armp-setup-modal'); if(s){ s.classList.remove('open'); s.style.display='none'; } }catch(e){}
  `);
  await sleep(100);

  // Confirm dialogs auto-accept unless a test overrides
  w.confirm = () => true;

  return { dom, w, d: w.document, errors, sleep };
}

// Build a window.File from a real file on disk, with the async methods handleFile needs.
// NOTE: arrayBuffer/text/slice are ALWAYS overridden with node-realm implementations.
// jsdom's native File.arrayBuffer returns a window-realm ArrayBuffer, which fails the
// node-realm SheetJS `instanceof ArrayBuffer` check and silently degrades XLSX.read to
// text parsing. In a real browser there is a single realm — this is purely a harness fix.
function mkFile(w, absPath, name, type) {
  const buf = fs.readFileSync(absPath);
  const bytes = new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const f = new w.File([bytes], name || path.basename(absPath), { type: type || 'application/octet-stream' });
  f.arrayBuffer = async () => bytes.buffer.slice(0);
  f.text = async () => Buffer.from(bytes).toString('utf8');
  f.slice = (a, b) => {
    const sub = bytes.slice(a || 0, b === undefined ? bytes.length : b);
    return {
      text: async () => Buffer.from(sub).toString('utf8'),
      arrayBuffer: async () => sub.buffer.slice(sub.byteOffset, sub.byteOffset + sub.byteLength),
      size: sub.length
    };
  };
  return f;
}

// Import a file through the app's real handleFile path.
// For invoice imports the chunked loop finishes AFTER handleFile resolves, so we
// wait for finalization (setStatus('loaded') sets DATA_STATUS / row count stabilizes).
async function importFile(w, impType, absPath, name, type) {
  w.eval(`IMP_TYPE=${JSON.stringify(impType)}; IMP_BANK_MODE=false;`);
  const f = mkFile(w, absPath, name, type);

  await w.handleFile({ files: [f], value: f.name, name: f.name });
  if (impType === 'inv') {
    // Chunked import finalizes by rebuilding _INV_IDX (then name-fallback runs
    // synchronously right after). Poll for the rebuilt index, then settle.
    for (let i = 0; i < 200; i++) {
      const done = w.eval(`(function(){ try{ return INV.length>0 && _INV_IDX && _INV_IDX.byInv && _INV_IDX.byInv.size>0; }catch(e){ return false; } })()`);
      if (done) break;
      await sleep(50);
    }
    await sleep(150);
  } else {
    await sleep(100);
  }
}

// Inline-text import (load tests): builds the File from a string instead of disk,
// and polls until the chunked import COMPLETES (count stable), with a generous
// ceiling — 100K-row imports legitimately take a while.
async function importText(w, impType, name, text, maxWaitMs) {
  w.eval(`IMP_TYPE=${JSON.stringify(impType)}; IMP_BANK_MODE=false;`);
  const buf = Buffer.from(text, 'utf8');
  const f = new w.File([new w.Blob([buf])], name, { type: 'text/csv' });
  Object.defineProperty(f, 'arrayBuffer', { value: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) });
  Object.defineProperty(f, 'text', { value: async () => text });
  await w.handleFile({ files: [f], value: name, name });
  const arr = impType === 'inv' ? 'INV' : impType === 'del' ? 'DELIV' : 'PAY';
  const deadline = Date.now() + (maxWaitMs || 180000);
  let last = -1, stable = 0;
  while (Date.now() < deadline) {
    const n = w.eval(`${arr}.length`);
    if (n > 0 && n === last) { stable++; if (stable >= 4) break; }
    else stable = 0;
    last = n;
    await sleep(250);
  }
  await sleep(200);
}

// Import the bank screenshot: real image branch with _OCR.recognize stubbed to the
// text Tesseract reads off the statement (everything downstream is production code).
async function importBankImage(w, imageName) {
  w.eval(`
    IMP_TYPE='rem'; IMP_BANK_MODE=true;
    _OCR.recognize = function(){ return Promise.resolve(${JSON.stringify(BANK_OCR_TEXT)}); };
  `);
  const f = mkFile(w, path.join(UPLOADS, 'Screenshot_2026-07-15_at_8_14_12_PM.png'), imageName || 'MUFG_Statement_05_28_2026.png', 'image/png');
  await w.handleFile({ files: [f], value: f.name, name: f.name });
}

// Assertion collector
function makeT(suiteName) {
  const results = [];
  function t(name, cond, detail) {
    results.push({ name, pass: !!cond, detail });
    console.log((cond ? '  ✅ ' : '  ❌ ') + name + (cond ? '' : (detail !== undefined ? '   [' + String(detail).slice(0, 300) + ']' : '')));
  }
  function done() {
    const pass = results.filter(r => r.pass).length;
    console.log(`\n${suiteName}: ${pass}/${results.length} assertions passed`);
    if (pass !== results.length) { process.exitCode = 1; }
    return { pass, total: results.length };
  }
  return { t, done, results };
}

module.exports = { importText, boot, mkFile, importFile, importBankImage, makeT, sleep, UPLOADS, APP, PROJECT_ROOT, BANK_OCR_TEXT };

// ── Raw-SAP → ARMP Template mapping adapter (regression-fixture path) ─────────
// Production requires the 7-field ARMP Invoice Import Template. The real-data
// regression fixtures are raw SAP exports that predate the template, so we map
// them into template schema first — proving BOTH the adapter and the engine.
// Any column the raw file lacks (Customer Name / Currency / Invoice Date / Due
// Date) is synthesized with a documented, deterministic default so validation
// passes without altering the amounts/refs the matching engine is tested on.
const XLSX_ADPT = require('xlsx');
function mapRawSapToArmpTemplate(absPath, opts) {
  opts = opts || {};
  const wb = XLSX_ADPT.readFile(absPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX_ADPT.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
  if (!rows.length) throw new Error('empty raw fixture: ' + absPath);
  const hdr = rows[0].map(h => String(h).trim());
  const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const has = (...aliases) => hdr.some(h => aliases.some(a => norm(h) === norm(a) || norm(h).includes(norm(a))));
  // MINIMAL AUGMENTATION: keep every raw column exactly as-is so the app's own
  // header aliases resolve Invoice/PO/SO/RefKey3/Amount precisely as in production.
  // Only ADD the template-required columns the raw file is missing, so the
  // seven-field validation gate passes. We never remap or rename the raw refs.
  const needName = !has('customername','customer','name','soldtoparty');
  const needCurr = !has('currency','curr','ccy','waers','documentcurrency');
  const needIDt  = !has('invoicedate','documentdate','postingdate','bldat','budat');
  const needDue  = !has('duedate','netduedate','due','zfbdt');
  const add = [];
  if (needName) add.push('Customer Name');
  if (needCurr) add.push('Currency');
  if (needIDt)  add.push('Invoice Date');
  if (needDue)  add.push('Due Date');
  const defaultName = opts.customerName || 'Regression Fixture Co';
  const defaultCurr = opts.currency || 'USD';
  const defaultIDt  = opts.invoiceDate || '2026-01-01';
  const defaultDue  = opts.dueDate || '2026-01-31';
  const out = [hdr.concat(add)];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row.some(c => String(c).trim() !== '')) continue;
    const extra = [];
    if (needName) extra.push(defaultName);
    if (needCurr) extra.push(defaultCurr);
    if (needIDt)  extra.push(defaultIDt);
    if (needDue)  extra.push(defaultDue);
    // pad raw row to full header width, then append synthesized columns
    const padded = hdr.map((_, i) => (row[i] !== undefined ? row[i] : ''));
    out.push(padded.concat(extra));
  }
  const outWb = XLSX_ADPT.utils.book_new();
  XLSX_ADPT.utils.book_append_sheet(outWb, XLSX_ADPT.utils.aoa_to_sheet(out), 'Open Invoices');
  const os = require('os'), pathm = require('path'), fsm = require('fs');
  const outPath = pathm.join(os.tmpdir(), 'armp_mapped_' + Date.now() + '_' + Math.random().toString(36).slice(2) + '.xlsx');
  // Write via buffer (not XLSX.writeFile) — some suites patch writeFile to a no-op.
  fsm.writeFileSync(outPath, XLSX_ADPT.write(outWb, { type: 'buffer', bookType: 'xlsx' }));
  return { outPath, added: add, rowCount: out.length - 1 };
}

// Import a raw-SAP fixture via the adapter (used by regression suites).
async function importMappedInvoice(w, absPath, name, opts) {
  const { outPath } = mapRawSapToArmpTemplate(absPath, opts);
  await importFile(w, 'inv', outPath, name || 'ARMP_Template_Mapped.xlsx');
  return outPath;
}

module.exports.mapRawSapToArmpTemplate = mapRawSapToArmpTemplate;
module.exports.importMappedInvoice = importMappedInvoice;
