const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');
const vm = require('node:vm');
const { test } = require('node:test');
const viem = require('viem');

const context = vm.createContext({ URL, Buffer, ...viem });
for (const name of ['known-entities', 'incident-catalog', 'abi-evidence', 'validated-findings']) {
  const source = readFileSync(`${__dirname}/${name}.ts`, 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
  vm.runInContext(stripTypeScriptTypes(source), context);
}
const address = `0x${'11'.repeat(20)}`;
const owner = `0x${'22'.repeat(20)}`;
const spender = `0x${'33'.repeat(20)}`;
const zero = `0x${'0'.repeat(40)}`;
const baseline = { hash: `0x${'aa'.repeat(32)}`, to: address, from: owner, input: '0x', value: '0x0', blockNumber: '0x1',
  inclusionStatus: 'mined', status: '0x1', destinationHasCode: true, destinationVerification: 'verified',
  receiptEvidence: { status: 'available', complete: true, transfers: [], logsExamined: 0 } };
function decoded(name, types, values, destination = address) {
  const abi = [{ type: 'function', name, stateMutability: 'nonpayable', inputs: types.map(type => ({ name: '', type })), outputs: [] }];
  const calldata = viem.encodeFunctionData({ abi, functionName: name, args: values });
  const input = context.decodeInputEvidence(abi, calldata, { network: 'mainnet', address: destination, blockTag: '0x1', scope: 'current_only', proxyResolved: false });
  return { input: calldata, to: destination, analysisEvidence: { version: 'adapters-v1', network: 'mainnet', subject: destination, blockTag: '0x1', input,
    tokenStates: [], permissionStates: [], coverage: 'partial', limits: ['internal_traces_unavailable', 'isolated_balance_deltas_unavailable'], attempts: 0,
    capabilities: { inputDecoding: false, reportedTokenState: false, reportedPermissionState: false, internalTraces: false, isolatedBalanceDeltas: false } } };
}
const approve = decoded('approve', ['address', 'uint256'], [spender, 1n]);
const operator = decoded('setApprovalForAll', ['address', 'bool'], [spender, true]);
function reported(call, state) {
  return { ...call, analysisEvidence: { ...call.analysisEvidence, permissionStates: [state], capabilities: { ...call.analysisEvidence.capabilities, reportedPermissionState: true } } };
}
const permission = { token: address, owner, spender, blockTag: '0x1', authority: 'contract_reported_interface' };
const rawTransfer = { kind: 'erc20-shaped', token: address, from: zero, to: owner, amountRaw: (2n ** 256n - 1n).toString() };
const exploitHash = '0xc310a0affe2169d1f6feec1c63dbc7f7c62a887fa48795d327d4d2da2d6b111d';

// The oracle is independent of implementation: fixtures list rule inputs, not desired scores.
const rules = { source_unverified: 40, source_unknown: 35, method_unknown: 35, receipt_partial: 35, receipt_unavailable: 35,
  execution_incomplete: 35, allowance_unknown: 40, abi_historical_uncertain: 35, abi_unavailable: 35 };
const risks = { registry_danger: 90, historical_incident: 80 };
const baseMandatory = { source_verified: 'supported_indicator', execution_status: 'observation', transfer_observations: 'observation', traces_missing: 'limitation' };
const fixtures = [
  { name: 'WETH deposit/current ABI', patch: decoded('deposit', [], [], '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'), gaps: ['abi_historical_uncertain'], mandatory: { decoded_intent: 'observation', abi_historical_uncertain: 'limitation', registry_identity: 'observation' } },
  { name: 'Aave supply/current ABI', patch: decoded('supply', ['address', 'uint256', 'address', 'uint16'], [address, 100n, owner, 0], '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2'), gaps: ['abi_historical_uncertain'], mandatory: { decoded_intent: 'observation', abi_historical_uncertain: 'limitation' } },
  { name: 'Uniswap swap/current ABI', patch: decoded('swapExactTokensForTokens', ['uint256', 'uint256', 'address[]', 'address', 'uint256'], [1n, 1n, [address, spender], owner, 100n]), gaps: ['abi_historical_uncertain'], mandatory: { decoded_intent: 'observation', abi_historical_uncertain: 'limitation' } },
  { name: 'neutral mint/raw units', patch: { receiptEvidence: { status: 'available', complete: true, transfers: [rawTransfer] } }, mandatory: { raw_units_unknown: 'limitation', mint_burn_shaped: 'observation' } },
  { name: 'neutral burn/raw units', patch: { receiptEvidence: { status: 'available', complete: true, transfers: [{ ...rawTransfer, from: owner, to: zero }] } }, mandatory: { raw_units_unknown: 'limitation', mint_burn_shaped: 'observation' } },
  { name: 'ERC721 raw ID', patch: { receiptEvidence: { status: 'available', complete: true, transfers: [{ kind: 'erc721-shaped', token: address, from: owner, to: spender, tokenIdRaw: '100' }] } }, mandatory: { raw_units_unknown: 'limitation' } },
  { name: 'EOA', patch: { destinationHasCode: false, destinationVerification: 'unverified' }, omit: ['source_verified'], mandatory: { destination_no_code: 'observation' } },
  { name: 'creation unknown destination', patch: { destinationHasCode: undefined, destinationVerification: 'unknown' }, omit: ['source_verified'], gaps: ['source_unknown'], mandatory: { source_unknown: 'limitation' } },
  { name: 'unverified source', patch: { destinationVerification: 'unverified' }, omit: ['source_verified'], gaps: ['source_unverified'], mandatory: { source_unverified: 'limitation' } },
  { name: 'unknown selector', patch: { input: '0xdeadbeef' }, gaps: ['method_unknown'], mandatory: { method_unknown: 'limitation' } },
  { name: 'correlated acquisition gaps', patch: { input: '0xdeadbeef', destinationVerification: 'unverified', status: 'unknown', inclusionStatus: 'unknown', receiptEvidence: { status: 'unavailable', transfers: [] } }, omit: ['source_verified', 'transfer_observations'], gaps: ['method_unknown', 'source_unverified', 'execution_incomplete', 'receipt_unavailable'], mandatory: { source_unverified: 'limitation', method_unknown: 'limitation', execution_incomplete: 'limitation', receipt_unavailable: 'limitation' } },
  { name: 'partial receipt', patch: { receiptEvidence: { ...baseline.receiptEvidence, complete: false } }, gaps: ['receipt_partial'], mandatory: { receipt_partial: 'limitation' } },
  { name: 'pending', patch: { inclusionStatus: 'pending', status: 'unknown' }, gaps: ['execution_incomplete'], mandatory: { execution_incomplete: 'limitation' } },
  { name: 'reverted', patch: { status: '0x0', receiptEvidence: { status: 'unavailable', transfers: [] } }, omit: ['transfer_observations'], gaps: ['execution_incomplete', 'receipt_unavailable'], mandatory: { execution_incomplete: 'limitation', receipt_unavailable: 'limitation' } },
  { name: 'ambiguous approval', patch: approve, approval: {}, gaps: ['abi_historical_uncertain', 'allowance_unknown'], mandatory: { approval_intent: 'observation', allowance_unknown: 'limitation', decoded_intent: 'observation' } },
  { name: 'lying reported allowance', patch: reported(approve, { ...permission, kind: 'erc20_allowance', rawValue: (2n ** 256n - 1n).toString() }), approval: {}, gaps: ['abi_historical_uncertain', 'allowance_unknown'], mandatory: { reported_permission_state: 'observation', allowance_unknown: 'limitation', decoded_intent: 'observation' } },
  { name: 'NFT queried approval', patch: reported(approve, { ...permission, owner: undefined, caller: owner, kind: 'erc721_approval', tokenIdRaw: '1', rawValue: spender }), approval: {}, gaps: ['abi_historical_uncertain', 'allowance_unknown'], mandatory: { reported_permission_state: 'observation', allowance_unknown: 'limitation', decoded_intent: 'observation' } },
  { name: 'NFT queried operator', patch: reported(operator, { ...permission, kind: 'operator_approval', rawValue: '1' }), approval: {}, gaps: ['abi_historical_uncertain', 'allowance_unknown'], mandatory: { reported_permission_state: 'observation', allowance_unknown: 'limitation', decoded_intent: 'observation' } },
  { name: 'wrong network adapter', patch: approve, network: 'base', approval: {}, gaps: ['method_unknown', 'allowance_unknown'], mandatory: { adapter_evidence_invalid: 'limitation', allowance_unknown: 'limitation', method_unknown: 'limitation' } },
  { name: 'unresolved current proxy', patch: { ...approve, analysisEvidence: { ...approve.analysisEvidence, limits: ['current_proxy_implementation_not_historical'] } }, gaps: ['abi_historical_uncertain'], mandatory: { abi_historical_uncertain: 'limitation', decoded_intent: 'observation' } },
  { name: 'exact exploit execution', patch: { hash: exploitHash }, risk: ['historical_incident'], mandatory: { historical_incident: 'risk' } },
  { name: 'exact victim communication', patch: { hash: '0xbe21a9719a4f89f7dc98419f60b247d69780b569cd8869c0031aae000f98cf17' }, mandatory: { historical_incident: 'observation' } },
  { name: 'exact funds recovery', patch: { hash: '0xb0308ee113c541e7c6f4623e833417524d68fd6267d23f43d9041f583c14343f' }, mandatory: { historical_incident: 'observation' } },
  { name: 'incident wrong network', patch: { hash: exploitHash }, network: 'base', absent: ['historical_incident'] },
  { name: 'incident neighboring hash', patch: { hash: `${exploitHash.slice(0, -1)}e` }, absent: ['historical_incident'] },
  { name: 'dangerous registry', patch: { to: '0xb66cd966670d962c227b3eaba30a872dbfb995db' }, risk: ['registry_danger'], mandatory: { registry_danger: 'risk', registry_identity: 'observation' } },
  { name: 'everything unavailable', patch: { destinationVerification: 'unknown', status: 'unknown', inclusionStatus: 'unknown', receiptEvidence: { status: 'unavailable', transfers: [] } }, omit: ['source_verified', 'transfer_observations'], coverage: 'unavailable', gaps: ['source_unknown', 'execution_incomplete', 'receipt_unavailable'], mandatory: { source_unknown: 'limitation', execution_incomplete: 'limitation', receipt_unavailable: 'limitation' } },
  { name: 'unknown multicall child', patch: decoded('multicall', ['bytes[]'], [['0xdeadbeef']]), gaps: ['abi_historical_uncertain'], mandatory: { decoded_intent: 'observation', abi_historical_uncertain: 'limitation' } },
  { name: 'lying token metadata and spoofed mint event', patch: { ...decoded('deposit', [], []), receiptEvidence: { status: 'available', complete: true, transfers: [rawTransfer] }, analysisEvidence: {
    ...decoded('deposit', [], []).analysisEvidence,
    tokenStates: [{ address, blockTag: '0x1', status: 'available', decimals: 0, balanceRaw: '0', authority: 'contract_reported_interface' }],
    capabilities: { ...decoded('deposit', [], []).analysisEvidence.capabilities, reportedTokenState: true },
  } }, gaps: ['abi_historical_uncertain'], mandatory: { decoded_intent: 'observation', reported_token_state: 'observation', raw_units_unknown: 'limitation', mint_burn_shaped: 'observation' } },
  { name: 'ABI acquisition unavailable', patch: { ...approve, analysisEvidence: { ...approve.analysisEvidence, input: { status: 'unavailable', source: 'abi', provenance: approve.analysisEvidence.input.provenance, historicalCertainty: false, reason: 'unknown_selector' } } }, gaps: ['method_unknown', 'abi_unavailable'], mandatory: { method_unknown: 'limitation', abi_unavailable: 'limitation' } },
  { name: 'wrong permission spender', patch: reported(approve, { ...permission, spender: owner, kind: 'erc20_allowance', rawValue: '1' }), approval: {}, gaps: ['method_unknown', 'allowance_unknown'], mandatory: { adapter_evidence_invalid: 'limitation', method_unknown: 'limitation', allowance_unknown: 'limitation' } },
];

for (const fixture of fixtures) test(`fixed-corpus-v1: ${fixture.name}`, () => {
  const tx = { ...baseline, ...fixture.patch };
  const inventory = context.transactionFindings(tx, fixture.network ?? 'mainnet', null, fixture.approval ?? null);
  const before = JSON.stringify(inventory);
  context.validateFindingSelection('{"findingIds":[]}', inventory);
  assert.equal(JSON.stringify(inventory), before, 'selection cannot erase mandatory evidence');
  const result = context.renderFindings(inventory);
  const report = result.validatedReport;
  const risk = fixture.risk?.length ? Math.max(...fixture.risk.map(code => risks[code])) : null;
  const uncertainty = Math.max(0, ...(fixture.gaps ?? []).map(code => rules[code]));
  const decision = Math.max(5, risk ?? 0, uncertainty);
  assert.equal(report.evidenceRiskScore, risk);
  assert.equal(report.uncertaintyScore, uncertainty);
  assert.equal(report.decisionScore, decision);
  assert.equal(result.riskScore, decision);
  assert.equal(inventory.score, decision);
  assert.equal(result.verdict, decision <= 25 ? 'safe' : decision <= 60 ? 'caution' : 'dangerous');
  assert.equal(result.riskLevel, decision <= 25 ? 'low' : decision <= 50 ? 'medium' : decision <= 75 ? 'high' : 'critical');
  assert.equal(report.coverage, fixture.coverage ?? 'partial');
  const mandatory = { ...baseMandatory, ...fixture.mandatory };
  for (const code of fixture.omit ?? []) delete mandatory[code];
  for (const [code, category] of Object.entries(mandatory)) assert.ok(report.findings.some(f => f.id === `f:${code}` && f.category === category), `missing ${code}/${category}`);
  for (const code of fixture.absent ?? []) assert.ok(!report.findings.some(f => f.code === code));
  assert.deepEqual(Array.from(report.findings.filter(f => f.category === 'risk'), f => f.code).sort(), (fixture.risk ?? []).slice().sort());
  assert.ok(report.findings.length <= 32 && report.evidence.length <= 32);
  for (const finding of report.findings) {
    assert.ok(finding.text.length <= 500);
    assert.ok(finding.evidenceRefs.length && finding.evidenceRefs.every(ref => report.evidence.some(e => e.id === ref)));
  }
  for (const evidence of report.evidence) assert.ok(evidence.value.length <= 2000);
  const input = report.evidence.find(e => e.kind === 'decoded_intent')?.input;
  if (input) {
    assert.equal(input.provenance.network, fixture.network ?? 'mainnet');
    assert.equal(input.provenance.address.toLowerCase(), tx.to.toLowerCase());
    assert.equal(input.provenance.blockTag, tx.blockNumber);
    assert.equal(input.historicalCertainty, false);
    assert.equal(report.capabilities.inputDecoding, true);
  }
  for (const evidence of report.evidence.filter(e => e.incident)) {
    assert.equal(evidence.incident.hash, tx.hash.toLowerCase());
    assert.equal(evidence.incident.network, fixture.network ?? 'mainnet');
    assert.ok(evidence.incident.sources.some(s => s.url.startsWith('https://www.euler.finance/') && s.claim));
  }
  assert.doesNotMatch(result.positives.join(' '), /successful execution|spending rights|well.audited|guaranteed|mint|safe to sign/i);
  assert.doesNotMatch(report.findings.map(f => f.text).join(' '), /confirmed loss|permission was granted|attack is currently executable|audited standard token/i);
});

test('corpus has source-backed incident truth and is deterministic, not statistical calibration', () => {
  assert.equal(fixtures.length, 31);
  assert.equal(context.lookupIncident(exploitHash, 'mainnet').role, 'exploit_execution');
  assert.equal(context.lookupIncident(exploitHash, 'mainnet').sources.length, 2);
  for (const fixture of fixtures) {
    const run = () => JSON.stringify(context.renderFindings(context.transactionFindings({ ...baseline, ...fixture.patch }, fixture.network ?? 'mainnet', null, fixture.approval ?? null)));
    assert.equal(run(), run());
  }
});
