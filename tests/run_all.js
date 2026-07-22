// ARMP R3 full battery runner. `npm test` from the package root.
const { spawnSync } = require('child_process');
const path = require('path');
const SUITES = [
  'test_e2e_232050.js','test_review_controls.js','test_import_template.js',
  'test_multifile_regression.js','test_tkf_template_e2e.js','test_ocr_degraded_rma.js',
  'test_golive_guardrails.js','test_support_bot.js','test_video_player.js',
  'test_prohibited_terms.js','staging_smoke.js',
  'test_frontend_security.js','test_data_boundary.js','test_r2_migration.js',
];
let failed = 0; const lines = [];
for (const s of SUITES) {
  const r = spawnSync('node', [path.join(__dirname, s)], { encoding: 'utf8', timeout: 600000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const last = out.trim().split('\n').pop() || '(no output)';
  const pass = /(\d+)\/(\1) assertions passed/.test(last);
  lines.push(`  ${pass ? '✅' : '❌'} ${last}`);
  if (!pass) { failed++; console.error(out.slice(-2500)); }
}
console.log('═══ ARMP R3 full battery ═══');
console.log(lines.join('\n'));
if (failed) { console.error(`\n${failed} suite(s) FAILED`); process.exit(1); }
console.log('\nAll suites passed.');
