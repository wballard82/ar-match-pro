// Smoke test — confirm the real engine loaded headlessly and symbols are live.
// Run: jsc test/harness.js test/smoke.js
print('\n=== SMOKE TEST: engine load ===');

var symbols = [
  'runMatch', '_findInvoicesForPayment', 'findSub', '_extractInvoiceRefs',
  'RemittanceParser', 'RM_FIELD_MAPS', 'ConfidenceScorer', '_classifyDocRef',
  '_buildInvIndexes', 'norm', 'SAP_DOC_PARSER_PROFILE', 'MatchScenarioLibrary',
  '_parseRemAmt', '_normLabel', 'detectTracking', 'detectDHLTracking',
];
var missing = [];
symbols.forEach(function (n) {
  var t = typeof globalThis[n];
  if (t === 'undefined') missing.push(n);
  T.ok(t !== 'undefined', n + ' (' + t + ')');
});

T.ok(Array.isArray(INV), 'INV is a live array');
T.ok(Array.isArray(PAY), 'PAY is a live array');
T.ok(typeof RemittanceParser.parse === 'function', 'RemittanceParser.parse callable');
T.ok(typeof ConfidenceScorer.score === 'function', 'ConfidenceScorer.score callable');
T.ok(SAP_DOC_PARSER_PROFILE.docPrefixes['510'] === 'invNo', '510 → invNo classifier wired');
T.ok(SAP_DOC_PARSER_PROFILE.docPrefixes['210'] === 'soNo', '210 → soNo classifier wired');
T.ok(SAP_DOC_PARSER_PROFILE.docPrefixes['710'] === 'delNo', '710 → delNo classifier wired');

// Quick functional sanity: classify a 510 doc and score an invoice match.
var cls = _classifyDocRef('5105001466', SAP_DOC_PARSER_PROFILE.docPrefixes);
T.ok(cls && cls.field === 'invNo', '_classifyDocRef("5105001466") → invNo');
var sc = ConfidenceScorer.score({ invoiceMatch: true, amountMatch: true, customerMatch: true });
T.ok(sc.score >= 60, 'ConfidenceScorer scores invoice+amount+customer (' + sc.score + ')');

var s = T.summary();
print(missing.length === 0 ? '\nSMOKE: PASS — real engine is live headlessly' : '\nSMOKE: FAIL — missing ' + missing.join(', '));
