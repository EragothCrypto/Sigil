const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');
const vm = require('node:vm');
const { test } = require('node:test');
function load(registry = () => null) {
  const context = vm.createContext({ lookupEntity: registry });
  vm.runInContext(stripTypeScriptTypes(readFileSync(`${__dirname}/validated-findings.ts`, 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '')), context);
  return context;
}
const address = `0x${'11'.repeat(20)}`;
const tx = { hash: `0x${'aa'.repeat(32)}`, to: address, from: address, input: '0x', value: '0x0', inclusionStatus: 'mined', status: '0x1', destinationHasCode: true, destinationVerification: 'verified', receiptEvidence: { status: 'available', complete: true, logsExamined: 2, transfers: [{ from: `0x${'0'.repeat(40)}`, to: address, token: address, amountRaw: '100000000000000000000000000', kind: 'erc20-shaped' }] } };
test('unknown units, mint/burn and success are neutral observations, never economic threats or trust', () => {
  const api = load();
  const inventory = api.transactionFindings(tx, 'mainnet', null, null);
  const result = api.renderFindings(inventory);
  assert.equal(result.riskScore, 5);
  assert.ok(result.warnings.every(text => text.startsWith('Analysis limit:')));
  assert.ok(result.validatedReport.findings.every(f => f.evidenceRefs.every(ref => result.validatedReport.evidence.some(e => e.id === ref))));
  assert.equal(result.validatedReport.evidence.find(e => e.kind === 'transfer_observations').transfers[0].amountRaw, tx.receiptEvidence.transfers[0].amountRaw);
  assert.equal(result.positives.length, 1);
  assert.doesNotMatch(result.positives.join(' '), /successful execution|mint|guaranteed safe|well-audited/i);
  assert.doesNotMatch(result.summary, /DAI|massive|inflation|manipulation|drain/i);
  assert.ok(result.validatedReport.findings.some(f => f.code === 'raw_units_unknown' && f.category === 'limitation'));
});
test('unsupported text, codes, references, properties and duplicate selections reject', () => {
  const api = load();
  const inventory = api.transactionFindings(tx, 'mainnet', null, null);
  for (const bad of ['{}', 'null', '{"findingIds":["invented"]}', '{"findingIds":[],"summary":"a drain"}', '{"findingIds":[],"riskScore":92}', JSON.stringify({ findingIds: [inventory.findings[0].id, inventory.findings[0].id] }), '{"findingIds":[{"id":"fake","evidenceRefs":["other-chain"]}]}']) {
    assert.throws(() => api.validateFindingSelection(bad, inventory), /Unreliable/);
  }
  assert.doesNotThrow(() => api.validateFindingSelection('{"findingIds":[]}', inventory));
});
test('empty AI selection cannot suppress mandatory registry risks or limits', () => {
  const api = load(() => ({ name: 'Registry entry', category: 'Exploiter', trustLevel: 'dangerous', description: 'audit claim ignored' }));
  const inventory = api.transactionFindings(tx, 'mainnet', null, null);
  api.validateFindingSelection('{"findingIds":[]}', inventory);
  assert.equal(api.renderFindings(inventory).riskScore, 90);
  assert.equal(api.renderFindings(inventory).validatedReport.findings.filter(f => f.category === 'risk').length, 1);
  assert.ok(api.renderFindings(inventory).validatedReport.findings.some(f => f.code === 'traces_missing'));
  assert.equal(api.renderFindings(api.transactionFindings(tx, 'base', null, null)).riskScore, 5);
});
test('correlated unknown source and selector never accumulate into critical threats', () => {
  const api = load();
  const result = api.renderFindings(api.transactionFindings({ ...tx, input: '0x863df8af', destinationVerification: 'unverified', receiptEvidence: { status: 'unavailable', complete: false, transfers: [] } }, 'mainnet', null, null));
  assert.equal(result.riskScore, 40);
  assert.ok(result.warnings.every(text => text.startsWith('Analysis limit:')));
  assert.equal(result.verdict, 'caution');
});
test('ambiguous approval never confirms allowance and EOA is not penalized for source', () => {
  const api = load();
  const result = api.renderFindings(api.transactionFindings(tx, 'mainnet', null, { isUnlimited: true }));
  assert.equal(result.riskScore, 40);
  assert.ok(result.warnings.every(text => text.startsWith('Analysis limit:')));
  assert.match(result.validatedReport.findings.map(f => f.text).join(' '), /allowance.*not checked/i);
  assert.equal(api.renderFindings(api.transactionFindings({ ...tx, destinationHasCode: false, destinationVerification: 'unverified' }, 'mainnet', null, null)).riskScore, 5);
});
test('contract unknown verification is not unverified; no memory-derived audit claims', () => {
  const api = load(() => ({ name: 'Protocol', description: 'well-audited guaranteed safe', trustLevel: 'trusted' }));
  const result = api.renderFindings(api.contractFindings({ address, verificationStatus: 'unknown', isVerified: false }, 'mainnet'));
  assert.equal(result.riskScore, 35);
  assert.doesNotMatch(JSON.stringify(result), /well-audited|guaranteed safe|source is unverified/);
});
