// Suite 9 — Prohibited-pattern release gate (R3, expanded).
// Scans deployables + generators + supabase migrations/functions + frontend
// config. FAILS on any prohibited occurrence — NO whitelist for the banned
// set. Per §24 it distinguishes:
//   • a variable NAME (allowed) from an actual secret VALUE (banned)
//   • a secure backend reference (service_role in supabase/functions) from
//     frontend exposure (service_role in deploy/*.html → banned)
//   • a test/gate that SEARCHES for a pattern (this file) from an
//     implementation that USES it
//   • a public-table RLS policy from an unsafe protected-table using(true)
const fs = require('fs'); const path = require('path');
const { makeT } = require('./harness');
const ROOT = path.resolve(__dirname, '..');
const DEPLOY = fs.existsSync(path.join(ROOT,'deploy')) ? path.join(ROOT,'deploy') : ROOT;
const AUTH = fs.existsSync(path.join(DEPLOY,'auth')) ? path.join(DEPLOY,'auth') : path.join(ROOT,'auth');

const listing = (dir, filt) => fs.existsSync(dir) ? fs.readdirSync(dir).filter(filt).map(f=>path.join(dir,f)) : [];

// ── Frontend deployables: strictest set ──
const FRONTEND = ['index.html','app.html','admin.html','demo.html','video.html','terms.html','privacy.html','checkout.html','sitemap.xml','_headers']
  .map(f=>path.join(DEPLOY,f)).filter(fs.existsSync)
  .concat(listing(AUTH, f=>/\.(html|js)$/.test(f)));

const GENERATORS = listing(path.join(ROOT,'generators'), f=>f.endsWith('.py'))
  .concat(['build_golive_docs.py','build_guide.py','build_legal_v2.py'].map(f=>path.join(ROOT,f)).filter(fs.existsSync));

const MIGRATIONS = listing(path.join(ROOT,'supabase','migrations'), f=>f.endsWith('.sql'));
const FUNCTIONS  = fs.existsSync(path.join(ROOT,'supabase','functions'))
  ? require('child_process').execSync(`find ${path.join(ROOT,'supabase','functions')} -name '*.ts'`).toString().trim().split('\n').filter(Boolean)
  : [];

// Universal bans — must not appear in ANY scanned file (frontend, generators, sql, ts)
const UNIVERSAL = [
  { re: /MASTER_ADMIN/g, label: 'MASTER_ADMIN' },
  { re: /VALID_KEYS/g, label: 'VALID_KEYS' },
  { re: /ARMP-PILOT-[A-Z0-9X]{4}-[A-Z0-9X]{4}/g, label: 'literal pilot code' },
  { re: /isValidPilotCode/g, label: 'format-only pilot validator' },
  { re: /rows:\s*Infinity/g, label: 'rows: Infinity' },
  { re: /Free \(7/gi, label: 'Free (7-day)' },
  { re: /7-day demo/gi, label: '7-day demo' },
  { re: /free trial/gi, label: 'free trial' },
  { re: /no IT approval/gi, label: 'no IT approval' },
  { re: /buy\.stripe\.com|js\.stripe\.com|api\.stripe\.com|hooks\.stripe\.com/gi, label: 'Stripe origin' },
  { re: /stripeCustomerId|stripeSubscriptionId/g, label: 'Stripe field' },
  { re: /checkout=success/gi, label: 'checkout-success activation' },
  { re: /pk_live_[0-9A-Za-z]+/g, label: 'live Stripe key' },
  { re: /price_1[A-Za-z0-9]{10,}/g, label: 'Stripe price ID' },
  // Actual secret VALUES (not variable names): a service-role JWT literal, DB password assignment with value
  { re: /sb_secret_[A-Za-z0-9_-]{8,}/g, label: 'secret key value' },
  { re: /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][A-Za-z0-9._-]{20,}["']/g, label: 'service-role key VALUE' },
  { re: /(?:database_password|DB_PASSWORD|SUPABASE_DB_PASSWORD)\s*[:=]\s*["'][^"']{6,}["']/g, label: 'db password VALUE' },
  { re: /JWT_SECRET\s*[:=]\s*["'][^"']{10,}["']/g, label: 'JWT secret VALUE' },
  { re: /eyJhbGciOi[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g, label: 'embedded JWT literal' },
];

// Frontend-only bans (these MAY legitimately appear in supabase/functions backend)
const FRONTEND_ONLY = [
  { re: /service_role/gi, label: 'service_role (backend-only) in frontend' },
  { re: /SUPABASE_SERVICE_ROLE_KEY/g, label: 'service-role key name in frontend' },
  { re: /GOOGLE_CLIENT_ID/g, label: 'legacy Google-domain gate' },
  { re: /params\.get\(['"]plan['"]\)/g, label: 'query-string plan entitlement' },
  { re: /localStorage[^;]{0,40}\.plan\s*=/g, label: 'localStorage plan authorization write' },
];

(async () => {
  const { t, done } = makeT('Suite 9 — Prohibited-pattern release gate (R3)');
  let scanned = 0;

  const scan = (files, rules, tag) => {
    for (const f of files) {
      if (!fs.existsSync(f)) continue;
      scanned++;
      const body = fs.readFileSync(f, 'utf8');
      for (const { re, label } of rules) {
        re.lastIndex = 0; const m = body.match(re);
        t(`${tag}:${path.basename(f)} — no ${label}`, !m, m ? `${m.length}x "${String(m[0]).slice(0,32)}"` : '');
      }
    }
  };

  scan(FRONTEND, UNIVERSAL, 'FE');
  scan(FRONTEND, FRONTEND_ONLY, 'FE');
  scan(GENERATORS, UNIVERSAL, 'GEN');
  scan(MIGRATIONS, UNIVERSAL, 'SQL');
  scan(FUNCTIONS, UNIVERSAL, 'FN');

  // §24 distinction: service_role in backend functions is ALLOWED (necessary);
  // assert it appears ONLY under supabase/functions, never in frontend.
  const feHasServiceRole = FRONTEND.some(f => /service_role/i.test(fs.readFileSync(f,'utf8')));
  t('service_role appears in backend only, never frontend', !feHasServiceRole);

  // Unsafe protected-table RLS: using(true)/with check(true) must NOT exist in
  // our migrations (all protected). A search for the pattern in THIS gate file
  // or in tests is fine — we only scan migrations here.
  for (const f of MIGRATIONS) {
    // Strip SQL line comments: a comment documenting the ban is not a policy.
    const body = fs.readFileSync(f,'utf8').split('\n').map(l => l.replace(/--.*$/, '')).join('\n');
    t(`SQL:${path.basename(f)} — no unsafe using(true) policy`, !/using\s*\(\s*true\s*\)/i.test(body));
    t(`SQL:${path.basename(f)} — no unsafe with check(true) policy`, !/with\s+check\s*\(\s*true\s*\)/i.test(body));
  }

  // Positive R3 assertions
  const app = fs.readFileSync(path.join(DEPLOY,'app.html'),'utf8');
  t('app.html R2 format-only pilot mechanism is fully removed',
    !/isValidPilotCode/.test(app) && !/ARMP-PILOT-\[A-Z0-9\]/.test(app));
  t('app.html uses server-backed authorization (ARMP_AUTH + authorize-pilot-session)',
    /window\.ARMP_AUTH/.test(app) && /authorize-pilot-session/.test(app));
  t('app.html retains documented LIMITS (no unlimited)',
    /invoiceRowsPerImport:\s*100000/.test(app));
  const hdr = fs.readFileSync(path.join(DEPLOY,'_headers'),'utf8');
  t('_headers: no Stripe origins; payment=()', !/stripe/i.test(hdr) && /payment=\(\)/.test(hdr));
  t('_headers: Supabase staging origin allowed in connect-src',
    /connect-src[^;]*vjxdqmujxnmlfvnksvpy\.supabase\.co/.test(hdr));
  t('scanned frontend + generators + migrations + functions', scanned >= 30, `scanned=${scanned}`);
  t('migrations present (12)', MIGRATIONS.length >= 12, `${MIGRATIONS.length}`);
  t('edge functions present (20)', FUNCTIONS.length >= 20, `${FUNCTIONS.length}`);
  done();
})();
