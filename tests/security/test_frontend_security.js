// Suite 10 — Frontend security (R3)
// FAILS if any deployable frontend file contains server secrets, service-role
// references, format-only pilot logic, or localStorage/query-string entitlement
// authorization — and verifies the R3 gate is actually present.
const fs = require('fs'); const path = require('path');
const { makeT } = require('../harness');
const ROOT = path.resolve(__dirname, '..', '..');
const D = fs.existsSync(path.join(ROOT,'deploy')) ? path.join(ROOT,'deploy') : ROOT;
const AUTH_DIR = fs.existsSync(path.join(D,'auth')) ? path.join(D,'auth') : path.join(ROOT,'auth');

const FILES = ['index.html','app.html','admin.html','demo.html','video.html','terms.html','privacy.html','checkout.html','_headers']
  .map(f=>path.join(D,f)).filter(fs.existsSync)
  .concat(fs.existsSync(AUTH_DIR)? fs.readdirSync(AUTH_DIR).map(f=>path.join(AUTH_DIR,f)) : []);

const BANNED = [
  { re: /service_role/gi,                         label: 'service_role reference (backend-only concept)' },
  { re: /sb_secret_[A-Za-z0-9_-]{8,}/g,           label: 'secret API key value' },
  { re: /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']{8,}/g, label: 'service-role key assignment with value' },
  { re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g, label: 'embedded JWT literal' },
  { re: /isValidPilotCode/g,                      label: 'format-only pilot-code validator' },
  { re: /ARMP-PILOT-\[A-Z0-9\]/g,                 label: 'pilot-code format regex' },
  { re: /ARMP-PILOT-[A-Z0-9]{4}-[A-Z0-9]{4}/g,    label: 'literal pilot code' },
  { re: /smtp[_-]?pass/gi,                        label: 'SMTP credential reference' },
  { re: /otpauth:\/\/|totp[_-]?secret\s*[:=]/gi,  label: 'TOTP secret material' },
  { re: /params\.get\(['"]plan['"]\)/g,           label: 'query-string plan entitlement' },
  { re: /GOOGLE_CLIENT_ID/g,                      label: 'legacy Google-domain gate' },
];

(async () => {
  const { t, done } = makeT('Suite 10 — Frontend security (R3)');
  for (const f of FILES) {
    const body = fs.readFileSync(f, 'utf8');
    for (const { re, label } of BANNED) {
      re.lastIndex = 0; const m = body.match(re);
      t(`${path.basename(f)}: no ${label}`, !m, m ? `${m.length}x "${String(m[0]).slice(0,40)}"` : '');
    }
  }
  const app = fs.readFileSync(path.join(D,'app.html'),'utf8');
  t('app.html defines the ARMP_AUTH server-backed gate', /window\.ARMP_AUTH\s*=/.test(app));
  t('app.html calls authorize-pilot-session', /functions\/v1\/authorize-pilot-session/.test(app));
  t('app.html launchApp requires an authorized decision for non-demo plans',
    /plan !== 'demo'/.test(app) && /d\.authorized === true/.test(app));
  t('app.html revalidation upper bound is 300 s', /REVALIDATE_MAX_S = 300/.test(app));
  t('app.html failed auth never falls back to Demo Mode',
    !/demoLogin\(\)\s*;?\s*\/\/\s*fallback/i.test(app) && /no Demo fallback/.test(app));
  t('app.html preserves local workspace data on lockout', /PRESERVED/.test(app));
  const adm = fs.readFileSync(path.join(D,'admin.html'),'utf8');
  t('admin.html gate = Supabase session + AAL2 + internal role (server-verified)',
    /list-operations-dashboard/.test(adm) && /getAuthenticatorAssuranceLevel/.test(adm));
  t('admin.html no longer relies on email-domain checking', !/hd.*armatchpro\.com|ADMIN_ALLOWED_DOMAIN/.test(adm));
  t('admin.html keeps ARMP Operations Console name', /Operations Console/.test(adm));
  const pubKeyCount = FILES.map(f=>fs.readFileSync(f,'utf8')).join('').match(/sb_publishable_[A-Za-z0-9_-]+/g) || [];
  t('only the staging publishable key appears (public by design)',
    pubKeyCount.every(k=>k.startsWith('sb_publishable_PPfyGFk')), `${pubKeyCount.length} refs`);
  const urls = FILES.map(f=>fs.readFileSync(f,'utf8')).join('').match(/https:\/\/[a-z]{20}\.supabase\.co/g) || [];
  t('only the staging project URL appears', urls.every(u=>u.includes('vjxdqmujxnmlfvnksvpy')), `${urls.length} refs`);
  done();
})();
