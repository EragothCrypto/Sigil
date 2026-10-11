const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

const read = file => readFileSync(path.join(__dirname, 'src', file), 'utf8');

test('approval page labels event evidence, not effective allowances or wallet health', () => {
  const source = read('pages/approvals.tsx');
  for (const text of ['Raw event value', 'Event heuristic', 'Event candidates', 'Large values',
    'Current allowances and token units are not established.', 'No approval-event candidates returned',
    'Approval-event scan unavailable']) assert.ok(source.includes(text), text);
  assert.doesNotMatch(source, />Allowance<|>Wallet health<|>Active<|>Unlimited<|fully clean|unknown spender permissions/);
  assert.match(source, /result\?\.coverage\.status === 'limited'/);
  assert.match(source, /break-all/);
});

test('watchlist and monitor visible claims preserve event-only/manual scope', () => {
  for (const file of ['pages/watchlist.tsx', 'pages/wallet-monitor.tsx']) {
    const source = read(file);
    assert.match(source, /label: ['"]No flags['"]/);
    assert.match(source, /Current allowances are not established/);
    assert.match(source, /manual refresh/i);
    assert.doesNotMatch(source, /label: ['"]Clean['"]|>Clean<|>Active<|>Health<|>Unlimited<|Phase 4 adds|shows existing exposure/);
    assert.match(source, /const hasEventCoverage = entry\.coverageStatus === ['"]limited['"]/);
  }
});

test('API coverage states no current allowance check without conditional exceptions', () => {
  const source = readFileSync(path.join(__dirname, '../api-server/src/routes/sigil/approvals.ts'), 'utf8');
  assert.match(source, /Current allowances and token units were not checked/);
  assert.doesNotMatch(source, /Current allowance state can differ if/);
});

test('local storage copy discloses the manual refresh API and explorer data flow', () => {
  for (const file of ['pages/watchlist.tsx', 'pages/wallet-monitor.tsx']) {
    const source = read(file);
    assert.match(source, /Manual refresh sends the selected address and network to Sigil's API and explorer providers/);
    assert.doesNotMatch(source, /Everything stays in this browser unless you export it/);
  }
});

test('actual monitor checklist does not infer current permissions from event candidates', () => {
  const exports = {};
  const source = ts.transpileModule(read('lib/wallet-monitor.ts'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  vm.runInNewContext(source, { exports });
  const base = { id: 'synthetic', label: 'Synthetic wallet', network: 'mainnet', status: 'clean',
    coverageStatus: 'limited', lastCheckedAt: '2026-10-10T00:00:00Z', approvalSummary: { healthScore: 100, totalActive: 0, unlimited: 0, critical: 0, high: 0 } };
  const clean = exports.buildWalletMonitorReport([base]);
  assert.match(clean.fixFirst[0].description, /No flagged approval-event candidates/);
  assert.match(clean.fixFirst[0].description, /Current allowances are not established/);
  assert.match(clean.fixFirst[0].title, /manual refresh/i);
  const risky = exports.buildWalletMonitorReport([{ ...base, status: 'high-risk',
    approvalSummary: { healthScore: 10, totalActive: 1, unlimited: 1, critical: 1, high: 0 } }]);
  for (const fix of risky.fixFirst) {
    assert.match(fix.description, /event/i);
    assert.match(fix.description, /current allowance/i);
    assert.doesNotMatch(fix.description, /considered healthy|keep token exposure open/);
  }
});

test('monitor excludes unavailable or unchecked summaries and marks aggregate coverage incomplete', () => {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(read('lib/wallet-monitor.ts'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText, { exports });
  const base = { id: 'synthetic', label: 'Synthetic wallet', network: 'mainnet', status: 'high-risk',
    coverageStatus: 'limited', approvalSummary: { healthScore: 10, totalActive: 8, unlimited: 3, critical: 1, high: 2 } };
  for (const status of ['unavailable', 'unchecked']) {
    const report = exports.buildWalletMonitorReport([{ ...base, status, coverageStatus: 'unavailable' }]);
    assert.equal(report.hygieneScore, null);
    assert.equal(report.eventCoverageComplete, false);
    assert.equal(report.activeApprovals, 0);
    assert.equal(report.unlimitedApprovals, 0);
    assert.equal(report.criticalOrHighApprovals, 0);
    assert.equal(report.fixFirst.some(fix => /approvals$/.test(fix.kind)), false);
  }
  const mixed = exports.buildWalletMonitorReport([base, { ...base, id: 'unavailable', status: 'unavailable', coverageStatus: 'unavailable' }]);
  assert.equal(mixed.activeApprovals, 8);
  assert.equal(mixed.eventCoverageComplete, false);
  assert.equal(exports.buildWalletMonitorReport([base]).eventCoverageComplete, true);
  assert.equal(exports.buildWalletMonitorReport([]).eventCoverageComplete, false);
  const page = read('pages/wallet-monitor.tsx');
  assert.match(page, /report\.eventCoverageComplete \? risk\.label : "Coverage incomplete"/);
  assert.match(page, /report\.eventCoverageComplete \? report\.unlimitedApprovals : "--"/);
  assert.match(page, /report\.eventCoverageComplete \? report\.criticalOrHighApprovals : "--"/);
});
