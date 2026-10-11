const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');
const vm = require('node:vm');
const { test } = require('node:test');

const context = vm.createContext({ URL, TextEncoder, window: { location: { origin: 'https://sigil.example' } } });
const validator = readFileSync(`${__dirname}/../../lib/api-zod/src/validated-report.ts`, 'utf8').replace(/export /g, '');
vm.runInContext(stripTypeScriptTypes(validator), context);
const source = readFileSync(`${__dirname}/src/components/sigil/ShareButton.tsx`, 'utf8');
vm.runInContext(stripTypeScriptTypes(source.split('export function ShareButton')[0].replace(/^import .*;\r?\n/gm, '')), context);
function share(data) {
  context.data = data;
  return vm.runInContext('buildTweetText(data)', context);
}
function report(category = 'observation') {
  return { version: 'findings-v2', scorePolicy: 'dual-floor-v2', evidenceRiskScore: category === 'risk' ? 80 : null,
    uncertaintyScore: 35, decisionScore: category === 'risk' ? 80 : 35, coverage: 'partial',
    capabilities: { sourceVerification: true, receiptEvents: false, incidentLookup: false, inputDecoding: false,
      reportedTokenState: false, reportedPermissionState: false, internalTraces: false, isolatedBalanceDeltas: false },
    findings: [{ id: 'f:observed', code: 'observed', category, text: 'Synthetic bounded finding.', evidenceRefs: ['e:observed'] }],
    evidence: [{ id: 'e:observed', kind: 'observed', subject: 'synthetic', value: 'bounded' }] };
}
function data(validatedReport) {
  return { id: 'private-uuid-marker', input: 'private-input-marker', verdict: 'safe', riskScore: 0,
    summary: 'private-summary-marker: verified safe', verdictReason: 'private-reason-marker',
    patterns: [{ type: 'drainer', name: 'private-pattern-marker' }], details: validatedReport ? { validatedReport } : {} };
}

test('every share draft preserves limitations and excludes private or unchecked narrative', () => {
  for (const verdict of ['safe', 'caution', 'dangerous', 'unexpected']) {
    const text = share({ ...data(report()), verdict });
    assert.match(text, /No safety guarantee or signing clearance\./);
    assert.match(text, /Coverage: partial/);
    assert.match(text, /https:\/\/sigil\.example$/);
    assert.doesNotMatch(text, /verified|came back clean|looked normal|risk \d+\/100|private-|drainer/i);
    assert.ok(text.length <= 270);
  }
});
test('current share finding status comes from validated evidence, not legacy verdict', () => {
  assert.match(share(data(report())), /No concrete risk findings in acquired data/);
  assert.match(share(data(report('risk'))), /Attributed risk findings recorded/);
});
test('sharing supported checks never advertises complete execution or safety', () => {
  for (const coverage of ['unavailable', 'complete_for_supported_checks']) {
    const text = share(data({ ...report(), coverage }));
    assert.match(text, coverage === 'unavailable' ? /Coverage: unavailable/ : /Coverage: supported checks only/);
    assert.match(text, /No safety guarantee or signing clearance/);
    assert.doesNotMatch(text, /complete audit|safe to sign|private-/i);
  }
});
test('legacy and malformed reports receive bounded unvalidated copy', () => {
  for (const payload of [undefined, {}, { ...report(), evidence: [] }]) {
    assert.match(share(data(payload)), /legacy or unvalidated report/i);
  }
  const old = report();
  const v1 = { version: 'findings-v1', scorePolicy: 'max-floor-v1', findings: old.findings, evidence: old.evidence };
  assert.match(share(data(v1)), /legacy validated report with narrower coverage/i);
});

test('share presentation is neutral for all verdicts and retains safe window options', () => {
  const control = source.split('export function ShareButton')[1];
  assert.doesNotMatch(control, /data\.verdict|decisionScore|text-(rose|amber|emerald)|w-full/);
  assert.match(control, /Share report on X/);
  assert.match(control, /noopener,noreferrer,width=600,height=500/);
});
