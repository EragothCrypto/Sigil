const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');
const vm = require('node:vm');
const { test } = require('node:test');
const api = vm.createContext({ URL, TextEncoder });
vm.runInContext(stripTypeScriptTypes(readFileSync(`${__dirname}/../../lib/api-zod/src/validated-report.ts`, 'utf8').replace(/export /g, '')), api);
const address = `0x${'1'.repeat(40)}`;
function v2() {
  return { version: 'findings-v2', scorePolicy: 'dual-floor-v2', evidenceRiskScore: null, uncertaintyScore: 35, decisionScore: 35, coverage: 'partial',
    capabilities: { sourceVerification: true, receiptEvents: false, incidentLookup: true, inputDecoding: false, reportedTokenState: false, reportedPermissionState: false, internalTraces: false, isolatedBalanceDeltas: false },
    findings: [{ id: 'f:input_decoded', code: 'input_decoded', category: 'observation', text: 'Decoded intent only.', evidenceRefs: ['e:input_decoded'] }],
    evidence: [{ id: 'e:input_decoded', kind: 'input_decoded', subject: `mainnet:${address}`, value: 'attempted' }] };
}
test('v2 accepts dual floors and each supported coverage status', () => {
  for (const coverage of ['partial', 'unavailable', 'complete_for_supported_checks']) assert.ok(api.parseValidatedReport({ validatedReport: { ...v2(), coverage } }));
  const report = v2(); report.evidenceRiskScore = 80; report.decisionScore = 80;
  assert.ok(api.parseValidatedReport({ validatedReport: report }));
});
test('v2 rejects malformed policy, floors, capabilities and unknown fields', () => {
  for (const changes of [{scorePolicy: 'max-floor-v1'}, {evidenceRiskScore: undefined}, {evidenceRiskScore: NaN}, {uncertaintyScore: -1}, {decisionScore: 101}, {decisionScore: 35.5}, {decisionScore: 5}, {coverage: 'complete'}, {capabilities: {}}, {capabilities: {...v2().capabilities, internalTraces: true}}, {capabilities: {...v2().capabilities, extra: true}}, {assessment: 'safe'}]) {
    assert.equal(api.parseValidatedReport({ validatedReport: {...v2(), ...changes} }), null, JSON.stringify(changes));
  }
});
function richEvidence() {
  return { ...v2().evidence[0],
    input: {status: 'partial', source: 'abi', provenance: {network: 'mainnet', address, blockTag: '0x123', scope: 'current_only', proxyResolved: false}, historicalCertainty: false, reason: 'current_abi_only', signature: 'approve(address,uint256)', arguments: [{name: 'spender', type: 'address', value: address}]},
    tokenStates: [{address, status: 'available', blockTag: '0x123', authority: 'contract_reported_interface', decimals: 18, balanceRaw: '123'}],
    permissionStates: [{token: address, owner: address, spender: address, blockTag: '0x123', kind: 'erc20_allowance', rawValue: '456', authority: 'contract_reported_interface'}],
    incident: {name: 'Reviewed incident', network: 'mainnet', hash: `0x${'2'.repeat(64)}`, role: 'exploit_execution', date: '2023-03-13', reviewedAt: '2026-09-30', sources: [{url: 'https://example.com/evidence', title: 'Primary source', claim: 'Exact transaction reference.'}]} };
}
test('v2 validates typed decoded intent, reported state and checked sources', () => {
  assert.ok(api.parseValidatedReport({validatedReport: {...v2(), evidence: [richEvidence()]}}));
  for (const url of ['javascript:alert(1)', 'data:text/html,test', '//example.com', 'https://user:pass@example.com', 'https://example.com\\unsafe', 'https://example.com/\nunsafe']) {
    const e = richEvidence(); e.incident.sources[0].url = url;
    assert.equal(api.parseValidatedReport({validatedReport: {...v2(), evidence: [e]}}), null, url);
  }
  const e = richEvidence(); e.incident.sources[0].url = 'http://example.com/evidence';
  assert.ok(api.parseValidatedReport({validatedReport: {...v2(), evidence: [e]}}));
});
test('v2 rejects unbounded and malformed nested evidence', () => {
  const mutations = [e => e.input.arguments[0].value = 'x'.repeat(1025), e => e.input.arguments = Array(33).fill(e.input.arguments[0]), e => e.input.subcalls = Array(17).fill(e.input), e => e.input.historicalCertainty = true, e => e.tokenStates[0].decimals = 37, e => e.tokenStates = Array(9).fill(e.tokenStates[0]), e => e.permissionStates[0].rawValue = 'unsafe', e => e.permissionStates[0].authority = 'effective_permission', e => e.incident.sources = Array(5).fill(e.incident.sources[0]), e => e.input.rawData = {unsafe: true}, e => e.unsafe = {}];
  for (const mutate of mutations) { const e = richEvidence(); mutate(e); assert.equal(api.parseValidatedReport({validatedReport: {...v2(), evidence: [e]}}), null); }
});
test('v2 rejects unknown transfer properties and incomplete decoded records', () => {
  for (const mutate of [e => e.transfers = [{kind: 'erc20-shaped', token: address, from: address, to: address, amountRaw: '1', unsafe: true}], e => delete e.input.signature, e => delete e.input.arguments, e => e.input.provenance.extra = true]) {
    const e = richEvidence(); mutate(e); assert.equal(api.parseValidatedReport({validatedReport: {...v2(), evidence: [e]}}), null);
  }
});
test('v2 keeps NFT token IDs optional and accepts bounded nested intent values', () => {
  const e = richEvidence();
  e.permissionStates = [{token: address, owner: address, blockTag: '0x123', kind: 'erc721_approval', rawValue: address, authority: 'contract_reported_interface'}];
  e.input.arguments[0].value = {nested: ['123', true, null]};
  assert.ok(api.parseValidatedReport({validatedReport: {...v2(), evidence: [e]}}));
});
test('decoded strings preserve bounded contract text for escaped display', () => {
  const e = richEvidence(); e.input.arguments[0].value = 'First line\nSecond line\u0000';
  assert.ok(api.parseValidatedReport({validatedReport: {...v2(), evidence: [e]}}));
});
test('unavailable decoded and token state cannot carry successful observations', () => {
  for (const mutate of [e => e.input.status = 'unavailable', e => e.tokenStates[0].status = 'unavailable']) {
    const e = richEvidence(); mutate(e); assert.equal(api.parseValidatedReport({validatedReport: {...v2(), evidence: [e]}}), null);
  }
});
test('v2 supports caller-only NFT observations and current implementation ABI address', () => {
  const e = richEvidence();
  e.permissionStates = [{token: address, caller: address, blockTag: '0x123', kind: 'erc721_approval', rawValue: address, tokenIdRaw: '123', authority: 'contract_reported_interface'}];
  e.input.provenance.abiAddress = address;
  assert.ok(api.parseValidatedReport({validatedReport: {...v2(), evidence: [e]}}));
  for (const mutate of [e => e.permissionStates[0].caller = 'bad', e => e.input.provenance.abiAddress = 'bad', e => e.permissionStates[0].unexpected = 'bad', e => delete e.permissionStates[0].owner]) {
    const malformed = richEvidence(); mutate(malformed); assert.equal(api.parseValidatedReport({validatedReport: {...v2(), evidence: [malformed]}}), null);
  }
});
test('client distinguishes validated reports from malformed or legacy details', () => {
  const api = vm.createContext({});
  vm.runInContext(stripTypeScriptTypes(readFileSync(`${__dirname}/../../lib/api-zod/src/validated-report.ts`, 'utf8').replace(/export /g, '')), api);
  const report = { version: 'findings-v1', scorePolicy: 'max-floor-v1', findings: [{ id: 'f:traces_missing', code: 'traces_missing', category: 'limitation', text: 'Traces were not collected.', evidenceRefs: ['e:traces_missing'] }], evidence: [{id: 'e:traces_missing', kind: 'traces_missing', subject: 'mainnet:0x0000000000000000000000000000000000000001', value: 'not collected'}] };
  assert.ok(api.parseValidatedReport({ validatedReport: report }));
  assert.equal(api.parseValidatedReport({validatedReport: {...report, evidence: []}}), null);
  assert.equal(api.parseValidatedReport({validatedReport: {...report, evidence: [report.evidence[0], report.evidence[0]]}}), null);
  assert.equal(api.parseValidatedReport({validatedReport: {...report, evidence: [{...report.evidence[0], transfers: [{kind: 'erc20', token: 'bad', from: 'bad', to: 'bad'}]}]}}), null);
  for (const details of [{}, null, { validatedReport: {} }, { validatedReport: { ...report, findings: [{ ...report.findings[0], category: 'trust' }] } }, { validatedReport: { ...report, findings: Array(33).fill(report.findings[0]) } }, { validatedReport: { ...report, findings: [report.findings[0], report.findings[0]] } }]) assert.equal(api.parseValidatedReport(details), null);
});
test('web report separates limits, avoids unconditional clearance and labels legacy results', () => {
  const source = readFileSync(`${__dirname}/src/components/sigil/AnalysisResultView.tsx`, 'utf8');
  assert.doesNotMatch(source, /label: 'Safe to Sign'/);
  assert.match(source, /Analysis Limits/);
  assert.match(source, /Legacy report/);
  assert.match(source, /parseValidatedReport/);
  assert.match(source, /'validatedReport' in data.details && !validatedReport/);
  assert.match(source, /!validatedReport && data.inputType === 'contract'/);
  assert.match(source, /validatedReport.evidence.find/);
  assert.match(source, /Raw amount:/);
  const streaming = readFileSync(`${__dirname}/src/components/sigil/StreamingAnalysisView.tsx`, 'utf8');
  const home = readFileSync(`${__dirname}/src/pages/home.tsx`, 'utf8');
  assert.doesNotMatch(streaming + home, /estimatedScore|phase\.summaryText|ScoreRing/);
  assert.match(home, /type === 'metadata' \|\| type === 'token'\) return/);
  assert.match(home, /if \(!terminalEvent\) setPhase/);
});
