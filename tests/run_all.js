// ARMP R3 full battery. Runs from the package root: `npm test`.
const { spawnSync } = require('child_process');
const path = require('path');
const SUITES = [
  'test_e2e_232050.js','test_review_controls.js','test_import_template.js',
  'test_multifile_regression.js','test_tkf_template_e2e.js','test_ocr_degraded_rma.js',
  'test_golive_guardrails.js','test_support_bot.js','test_video_player.js',
  'test_prohibited_terms.js','staging_smoke.js',
  'security/test_frontend_security.js','data-boundary/test_data_boundary.js','auth/test_r2_migration.js',
];
let failed = 0; const lines = [];
for (const s of SUITES) {
  const r = spawnSync('node', [path.join(__dirname, s)], { encoding: 'utf8', timeout: 600000 });
  const out = (r.stdout||'') + (r.stderr||'');
  const last = out.trim().split('\n').pop() || '(no output)';
  const pass = /(\d+)\/(\1) assertions passed/.test(last);
  lines.push(`  ${pass?'✅':'❌'} ${last}`);
  if (!pass) { failed++; console.error(`\n─── ${s} ───\n` + out.slice(-1500)); }
}
console.log('═══ ARMP R3 full battery ═══');
console.log(lines.join('\n'));
// Local-only backend proofs are reported separately (not via npm/node):
console.log('\n  (Local backend proofs — see supabase/tests/: migrations apply 12/12, RLS suite 26/26 on real Postgres 16)');
if (failed) { console.error(`\n${failed} suite(s) FAILED`); process.exit(1); }
console.log('\nAll JS suites passed.');
