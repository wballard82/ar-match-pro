// ════════════════════════════════════════════════════════════════════════════
// ARMP HEADLESS ENGINE HARNESS  (runs under JavaScriptCore `jsc`)
// ----------------------------------------------------------------------------
// Loads the REAL matching engine out of app.html WITHOUT modifying app.html.
//
// Run as:   jsc test/harness.js test/<some_test>.js
//   - harness.js sets up DOM/window/localStorage shims, extracts every inline
//     <script> block from app.html, concatenates them into test/_appbundle.js,
//     and load()s it so EVERY engine global (INV, PAY, RES, EXC, runMatch,
//     _findInvoicesForPayment, findSub, RemittanceParser, ConfidenceScorer,
//     RM_FIELD_MAPS, SAP_DOC_PARSER_PROFILE, …) is live in the shared scope.
//   - the test file that follows runs in that same scope and asserts behavior.
//
// We DO NOT edit app.html. Everything below is a shim around it.
// ════════════════════════════════════════════════════════════════════════════

// ── console shim (jsc has `print`, not `console`) ──────────────────────────
(function () {
  function out() {
    var parts = [];
    for (var i = 0; i < arguments.length; i++) {
      var a = arguments[i];
      parts.push(typeof a === 'object' && a !== null ? safeStr(a) : String(a));
    }
    print(parts.join(' '));
  }
  function safeStr(o) { try { return JSON.stringify(o); } catch (e) { return String(o); } }
  globalThis.console = { log: out, error: out, warn: out, info: out, debug: out };
})();

// ── Recursive DOM element shim ─────────────────────────────────────────────
function makeChainProxy() {
  var fn = function () { return makeChainProxy(); };
  var store = { __style: {}, __dataset: {} };
  return new Proxy(fn, {
    get: function (t, prop) {
      if (prop === 'style') return store.__style;
      if (prop === 'dataset') return store.__dataset;
      if (prop === 'classList') return { add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return false; } };
      if (prop === 'checked') return true;   // s-inv/s-po/s-so gates stay enabled
      if (prop === 'value') return '';
      if (prop === 'textContent' || prop === 'innerHTML' || prop === 'innerText') return '';
      if (prop === 'length') return 0;
      if (prop === 'children' || prop === 'childNodes') return [];
      if (prop === 'nodeType') return 1;
      if (prop === 'parentNode' || prop === 'parentElement') return makeChainProxy();
      if (prop === 'files' || prop === 'options') return [];
      if (prop === 'selectedIndex') return 0;
      if (prop === Symbol.toPrimitive) return function () { return ''; };
      if (prop === Symbol.iterator) return undefined;
      if (prop === 'then') return undefined;
      return makeChainProxy();
    },
    set: function () { return true; },
    apply: function () { return makeChainProxy(); },
    has: function () { return true; },
  });
}
globalThis.makeChainProxy = makeChainProxy;

// ── localStorage shim ──────────────────────────────────────────────────────
(function () {
  var s = new Map();
  globalThis.localStorage = {
    getItem: function (k) { return s.has(String(k)) ? s.get(String(k)) : null; },
    setItem: function (k, v) { s.set(String(k), String(v)); },
    removeItem: function (k) { s.delete(String(k)); },
    clear: function () { s.clear(); },
    key: function (i) { var a = Array.from(s.keys()); return i < a.length ? a[i] : null; },
    get length() { return s.size; },
  };
})();

// ── document shim ──────────────────────────────────────────────────────────
globalThis.document = new Proxy({}, {
  get: function (t, prop) {
    if (prop === 'getElementById' || prop === 'querySelector' || prop === 'createElement' || prop === 'createTextNode') return function () { return makeChainProxy(); };
    if (prop === 'querySelectorAll' || prop === 'getElementsByClassName' || prop === 'getElementsByTagName') return function () { return []; };
    if (prop === 'addEventListener' || prop === 'removeEventListener') return function () {};
    if (prop === 'dispatchEvent') return function () { return true; };
    if (prop === 'head' || prop === 'body' || prop === 'documentElement') return makeChainProxy();
    if (prop === 'readyState') return 'complete';
    if (prop === 'cookie') return '';
    if (prop === 'location') return { href: 'http://localhost/', search: '', hash: '', pathname: '/' };
    return makeChainProxy();
  },
  set: function () { return true; },
});

// ── window / misc globals ──────────────────────────────────────────────────
globalThis.window = globalThis;
globalThis.self = globalThis;
globalThis.navigator = { userAgent: 'jsc-harness', language: 'en-US', onLine: true };
globalThis.location = { href: 'http://localhost/', search: '', hash: '', pathname: '/' };
globalThis.XLSX = { utils: { sheet_to_json: function () { return []; }, json_to_sheet: function () { return {}; }, book_new: function () { return {}; }, book_append_sheet: function () {}, aoa_to_sheet: function () { return {}; } }, read: function () { return { SheetNames: [], Sheets: {} }; }, write: function () { return ''; } };
globalThis.Stripe = function () { return { redirectToCheckout: function () {} }; };
globalThis.alert = function () {};
globalThis.confirm = function () { return true; };
globalThis.prompt = function () { return null; };
globalThis.fetch = function () { return Promise.reject(new Error('fetch disabled in harness')); };
globalThis.requestAnimationFrame = function (cb) { return setTimeout(function () { cb(Date.now()); }, 0); };
globalThis.cancelAnimationFrame = function () {};
if (typeof globalThis.btoa !== 'function') globalThis.btoa = function (s) { return s; };
if (typeof globalThis.atob !== 'function') globalThis.atob = function (s) { return s; };

// window/event APIs the app wires at top level or inside handlers
globalThis.addEventListener = function () {};
globalThis.removeEventListener = function () {};
globalThis.dispatchEvent = function () { return true; };
globalThis.onerror = null;
globalThis.innerWidth = 1280;
globalThis.innerHeight = 800;
globalThis.history = { pushState: function () {}, replaceState: function () {}, back: function () {}, forward: function () {}, go: function () {}, length: 1, state: null };
globalThis.open = function () { return makeChainProxy(); };
globalThis.matchMedia = function () { return { matches: false, media: '', addEventListener: function () {}, removeEventListener: function () {}, addListener: function () {}, removeListener: function () {} }; };
globalThis.getComputedStyle = function () { return { getPropertyValue: function () { return ''; } }; };
globalThis.scrollTo = function () {}; globalThis.scrollBy = function () {};
globalThis.requestIdleCallback = function (cb) { return setTimeout(function () { cb({ timeRemaining: function () { return 50; }, didTimeout: false }); }, 0); };
globalThis.cancelIdleCallback = function () {};
function _Observer() { return { observe: function () {}, unobserve: function () {}, disconnect: function () {}, takeRecords: function () { return []; } }; }
globalThis.MutationObserver = function () { return _Observer(); };
globalThis.ResizeObserver = function () { return _Observer(); };
globalThis.IntersectionObserver = function () { return _Observer(); };
globalThis.FileReader = function () { return { readAsText: function () {}, readAsDataURL: function () {}, readAsArrayBuffer: function () {}, addEventListener: function () {}, onload: null, onerror: null, result: '' }; };
globalThis.Blob = function () { return { size: 0, type: '' }; };
globalThis.Image = function () { return { addEventListener: function () {}, onload: null, onerror: null }; };
if (typeof globalThis.URL === 'undefined') globalThis.URL = function (u) { return { href: u, searchParams: { get: function () { return null; } } }; };
globalThis.URL.createObjectURL = function () { return 'blob:mock'; };
globalThis.URL.revokeObjectURL = function () {};

// ── Extract inline <script> blocks from app.html and load them ─────────────
(function () {
  var html = readFile('app.html');
  if (!html) { print('FATAL: could not read app.html from ' + (typeof process !== 'undefined' ? '' : 'cwd')); throw new Error('app.html not found — run jsc from project root'); }
  var re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  var m, blocks = [], skipped = 0;
  while ((m = re.exec(html)) !== null) {
    if (/\bsrc\s*=/.test(m[1] || '')) { skipped++; continue; }
    blocks.push(m[2]);
  }
  var bundle = blocks.join('\n;\n');
  writeFile('test/_appbundle.js', bundle);
  globalThis.__ARMP_BUNDLE_INFO = { inlineBlocks: blocks.length, externalSkipped: skipped, bytes: bundle.length };
  try {
    load('test/_appbundle.js');
    globalThis.__ARMP_BUNDLE_INFO.loadError = null;
  } catch (e) {
    globalThis.__ARMP_BUNDLE_INFO.loadError = (e && e.message) || String(e);
    print('[harness] WARNING: bundle top-level threw — engine globals after the throw may be missing:');
    print('          ' + globalThis.__ARMP_BUNDLE_INFO.loadError);
  }
})();

// ── Post-load engine setup ─────────────────────────────────────────────────
try { USER_PLAN = 'pro'; IS_DEMO = false; } catch (e) {}

// ════════════════════════════════════════════════════════════════════════════
// ARMP — test convenience API (thin wrappers over the real engine globals)
// ════════════════════════════════════════════════════════════════════════════
globalThis.ARMP = (function () {
  function reset() {
    INV = []; PAY = []; RES = []; EXC = [];
    try { if (typeof DELIV !== 'undefined') DELIV = []; } catch (e) {}
    try { if (typeof REM_DETAIL !== 'undefined') REM_DETAIL = []; } catch (e) {}
    try { if (typeof REM_ADVICE !== 'undefined') REM_ADVICE = []; } catch (e) {}
    try { if (typeof autoMatchHasRun !== 'undefined') autoMatchHasRun = false; } catch (e) {}
    try { _invalidateInvIndexes(); } catch (e) {}
  }
  // Add an open invoice. Fields mirror app.html's real INV row schema.
  function inv(o) { INV.push(Object.assign({ c: '', a: '', i: '', po: '', so: '', amt: 0, dt: 'RV', dt2: '', due: '', d: '', t: '', dl: '', s: '' }, o)); return INV[INV.length - 1]; }
  // Add a payment. Fields mirror app.html's real PAY row schema.
  function pay(o) { PAY.push(Object.assign({ a: '', c: '', amt: 0, po: '', i: '', so: '', m: 'ACH', txType: 'ACH', txId: '', payDate: '', ccy: 'USD', n: '', bank: '', coa: false }, o)); return PAY[PAY.length - 1]; }
  function snapshot(renderError) {
    return {
      RES: RES.map(function (r) { return Object.assign({}, r); }),
      EXC: EXC.map(function (e) { return Object.assign({}, e); }),
      INV: INV.map(function (v) { return Object.assign({}, v); }),
      _renderError: renderError || null,
    };
  }
  // Run the REAL runMatch() end-to-end. The matching pass fully populates RES/EXC
  // BEFORE the DOM render pass runs; render functions (rAll/rInv/…) are browser-only
  // and harmlessly throw under the headless DOM shim, so we snapshot results
  // whether runMatch resolves or rejects in its render tail.
  function match() {
    return Promise.resolve().then(function () { return runMatch(); }).then(
      function () { return snapshot(null); },
      function (err) { return snapshot((err && err.message) || String(err)); }
    );
  }
  return { reset: reset, inv: inv, pay: pay, match: match,
           info: function () { return globalThis.__ARMP_BUNDLE_INFO; } };
})();

// ── tiny assertion kit (shared by tests) ───────────────────────────────────
globalThis.T = (function () {
  var passed = 0, failed = 0, fails = [];
  function ok(cond, msg) { if (cond) { passed++; print('   ✓ ' + msg); } else { failed++; fails.push(msg); print('   ✗ ' + msg); } return !!cond; }
  function eq(a, b, msg) { return ok(a === b, msg + '  (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')'); }
  function near(a, b, eps, msg) { eps = eps || 0.01; return ok(Math.abs(a - b) <= eps, msg + '  (got ' + a + ', want ' + b + ' ±' + eps + ')'); }
  function summary() { print('\n   ── ' + passed + ' passed, ' + failed + ' failed ──'); return { passed: passed, failed: failed, fails: fails }; }
  return { ok: ok, eq: eq, near: near, summary: summary };
})();

print('[harness] app.html loaded · ' + JSON.stringify(globalThis.__ARMP_BUNDLE_INFO));
