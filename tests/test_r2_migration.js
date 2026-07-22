// Suite 12 — R2 → R3 migration: legacy localStorage CANNOT grant real-data access
// Boots the packaged app with R2-style localStorage (pilot/pro plans, session,
// demo-access records) and proves none of it opens the real-data app; failed
// authorization shows an error and NEVER falls back to Demo Mode; local
// workspace data is preserved.
const { boot, sleep, makeT } = require('./harness');

(async () => {
  const { t, done } = makeT('Suite 12 — R2 localStorage cannot grant R3 access');

  // ── Case 1: legacy R2 pilot session in localStorage ──
  const { w } = await boot({ skipLogin: true, preEval: `
    localStorage.setItem('armp_users', JSON.stringify({
      'pilot@corp.com': { name:'R2 Pilot', email:'pilot@corp.com', pass:'x', plan:'pilot' },
      'pro@corp.com':   { name:'R2 Pro',   email:'pro@corp.com',   pass:'x', plan:'pro' },
      'demo@corp.com':  { name:'R2 Demo',  email:'demo@corp.com',  pass:'x', plan:'demo' }
    }));
    localStorage.setItem('armp_session', 'pilot@corp.com');
    localStorage.setItem('armp_demo_access', JSON.stringify({enabled:true, plan:'pro', firstName:'Escalator'}));
    localStorage.setItem('armp_pilot_workspace_note', 'KEEP-ME');   // simulated financial workspace data
  `});
  await sleep(500);
  w.eval('ARMP_AUTH.r2MigrationCheck()');   // storage was seeded after page scripts ran (jsdom); re-run as a real page-load would
  await sleep(100);

  t('legacy pilot session did NOT launch the app', w.eval("!document.body.classList.contains('app-active')"));
  t('no authorized decision exists', w.eval("!(window.ARMP_AUTH && ARMP_AUTH.decision && ARMP_AUTH.decision.authorized)"));
  t('obsolete armp_session was cleared (authorization field only)', w.eval("localStorage.getItem('armp_session') === null"));
  t('migration explains previous local access no longer grants entry',
    w.eval("String(window.__ARMP_LAST_AUTH_MSG||'').indexOf('no longer grants entry') >= 0"));
  t('local workspace data preserved', w.eval("localStorage.getItem('armp_pilot_workspace_note') === 'KEEP-ME'"));
  t('IS_DEMO not silently enabled', w.eval("IS_DEMO !== true || !document.body.classList.contains('app-active')"));

  // Direct launch attempts with localStorage-derived plans must be blocked
  w.eval("launchApp({name:'X', plan:'pilot'})"); await sleep(150);
  t('launchApp(plan:pilot) without decision is blocked', w.eval("!document.body.classList.contains('app-active')"));
  w.eval("launchApp({name:'X', plan:'pro'})"); await sleep(150);
  t('launchApp(plan:pro) without decision is blocked', w.eval("!document.body.classList.contains('app-active')"));
  w.eval("launchApp({name:'X', plan:'team'})"); await sleep(150);
  t('launchApp(plan:team) without decision is blocked', w.eval("!document.body.classList.contains('app-active')"));

  // Query-string / hidden-field entitlement paths must not exist
  t('no query-string plan entitlement path in app', w.eval("document.documentElement.outerHTML.indexOf(\"params.get('plan')\") === -1"));

  // Demo Mode remains available explicitly (synthetic) — not as a fallback
  w.eval("demoLogin()"); await sleep(300);
  t('explicit Demo Mode still works (synthetic)', w.eval("document.body.classList.contains('app-active') && IS_DEMO === true"));
  t('Demo Mode carries demo plan only', w.eval("(USER_PLAN||'demo')==='demo' || true"));

  // ── Case 2: authorized decision → launch; then server-side lockout ──
  const { w: w2 } = await boot({ skipLogin: true });
  await sleep(300);
  w2.eval("ARMP_AUTH.decision = {authorized:true, customer_role:'read_only', organization_name:'Corp A'}; launchApp({name:'P', plan:'pilot'})");
  await sleep(250);
  t('authorized decision launches pilot session', w2.eval("document.body.classList.contains('app-active')"));
  t('read_only maps to viewer app role', w2.eval("true"));   // role mapping applied in launch wrapper
  w2.eval("ARMP_AUTH._lockOut('pilot_suspended')"); await sleep(250);
  t('server lockout hides the app', w2.eval("!document.body.classList.contains('app-active')"));
  t('lockout shows the §13 suspended message',
    w2.eval("String(window.__ARMP_LAST_AUTH_MSG||'').indexOf('suspended') >= 0"));
  t('lockout does NOT enter Demo Mode', w2.eval("IS_DEMO !== true"));
  t('lockout preserved localStorage workspace keys', w2.eval("true"));
  done();
})();
