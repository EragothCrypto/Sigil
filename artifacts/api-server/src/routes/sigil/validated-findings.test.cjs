const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');
const vm = require('node:vm');
const { test } = require('node:test');
const viem = require('viem');
function load(registry = () => null) {
  const context = vm.createContext({ lookupEntity: registry, URL, Buffer, ...viem });
  vm.runInContext(stripTypeScriptTypes(readFileSync(`${__dirname}/incident-catalog.ts`, 'utf8').replace(/export /g, '')), context);
  vm.runInContext(stripTypeScriptTypes(readFileSync(`${__dirname}/abi-evidence.ts`, 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '')), context);
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
  assert.match(result.validatedReport.findings.map(f => f.text).join(' '), /transaction-specific allowance.*not proven/i);
  assert.equal(api.renderFindings(api.transactionFindings({ ...tx, destinationHasCode: false, destinationVerification: 'unverified' }, 'mainnet', null, null)).riskScore, 5);
});
test('contract unknown verification is not unverified; no memory-derived audit claims', () => {
  const api = load(() => ({ name: 'Protocol', description: 'well-audited guaranteed safe', trustLevel: 'trusted' }));
  const result = api.renderFindings(api.contractFindings({ address, verificationStatus: 'unknown', isVerified: false }, 'mainnet'));
  assert.equal(result.riskScore, 35);
  assert.doesNotMatch(JSON.stringify(result), /well-audited|guaranteed safe|source is unverified/);
});

test('v2 separates max risk from max uncertainty and retains the decision alias', () => {
  const api = load(() => ({ name: 'Flag', category: 'Exploiter', trustLevel: 'dangerous' }));
  const result = api.renderFindings(api.transactionFindings({ ...tx, destinationVerification: 'unverified' }, 'mainnet', null, null));
  const report = result.validatedReport;
  assert.equal(report.version, 'findings-v2');
  assert.equal(report.scorePolicy, 'dual-floor-v2');
  assert.equal(report.evidenceRiskScore, 90);
  assert.equal(report.uncertaintyScore, 40);
  assert.equal(report.decisionScore, 90);
  assert.equal(result.riskScore, report.decisionScore);
  const neutral = api.renderFindings(api.transactionFindings(tx, 'base', null, null)).validatedReport;
  assert.equal(neutral.evidenceRiskScore, null);
  assert.equal(neutral.uncertaintyScore, 0);
  assert.equal(neutral.decisionScore, 5);
  assert.equal(neutral.coverage, 'partial');
  assert.equal(neutral.capabilities.internalTraces, false);
});

test('exact incident roles preserve mandatory source provenance without present exploit claims', () => {
  const api = load();
  const roles = [
    ['0xc310a0affe2169d1f6feec1c63dbc7f7c62a887fa48795d327d4d2da2d6b111d', 'exploit_execution', 80],
    ['0xbe21a9719a4f89f7dc98419f60b247d69780b569cd8869c0031aae000f98cf17', 'victim', null],
    ['0xb0308ee113c541e7c6f4623e833417524d68fd6267d23f43d9041f583c14343f', 'recovery', null],
  ];
  for (const [hash, role, floor] of roles) {
    const inventory = api.transactionFindings({ ...tx, hash: hash.toUpperCase().replace('0X', '0x') }, 'mainnet', null, null);
    api.validateFindingSelection('{"findingIds":[]}', inventory);
    const result = api.renderFindings(inventory);
    assert.equal(result.validatedReport.evidenceRiskScore, floor);
    const finding = result.validatedReport.findings.find(f => f.code === 'historical_incident');
    assert.equal(finding.category, floor ? 'risk' : 'observation');
    const evidence = result.validatedReport.evidence.find(e => e.id === finding.evidenceRefs[0]);
    assert.equal(evidence.incident.role, role);
    assert.equal(evidence.subject, `mainnet:${hash}`);
    assert.ok(evidence.incident.sources.every(s => s.url.startsWith('https://') && s.claim));
    assert.match(finding.text, /not.*current exploitability/i);
    assert.equal(api.renderFindings(api.transactionFindings({ ...tx, hash }, 'base', null, null)).validatedReport.evidenceRiskScore, null);
  }
});

function adapter(overrides = {}) {
  return { version: 'adapters-v1', network: 'mainnet', subject: address, blockTag: '0x1',
    input: { status: 'partial', source: 'abi', provenance: { network: 'mainnet', address, blockTag: '0x1', scope: 'current_only', proxyResolved: false }, historicalCertainty: false, reason: 'current_abi_only', signature: 'deposit()', arguments: [] },
    tokenStates: [], permissionStates: [], coverage: 'partial', limits: ['internal_traces_unavailable'], attempts: 0,
    capabilities: { inputDecoding: true, reportedTokenState: false, reportedPermissionState: false, internalTraces: false, isolatedBalanceDeltas: false }, ...overrides };
}

test('token-state observation copy distinguishes all-unavailable, mixed and available records',()=>{
 const api=load();const other='0x'+'22'.repeat(20);
 const state={address,blockTag:'0x1',status:'unavailable',authority:'contract_reported_interface',reason:'token_proxy_abi_unavailable'};
 for(const states of [[state],[{...state,status:'available',reason:'current_proxy_abi_only',decimals:6,balanceRaw:'1'}, {...state,address:other}],[{...state,status:'available',reason:undefined,decimals:6,balanceRaw:'1'}]]){
  const some=states.some(s=>s.status==='available');
  const evidence=adapter({tokenStates:states,capabilities:{...adapter().capabilities,reportedTokenState:some}});
  const report=api.renderFindings(api.transactionFindings({...tx,input:'0xd0e30db0',blockNumber:'0x1',receiptEvidence:{...tx.receiptEvidence,transfers:[...tx.receiptEvidence.transfers,{kind:'erc20-shaped',token:other,from:address,to:address,amountRaw:'1'}]},analysisEvidence:evidence},'mainnet',null,null)).validatedReport;
  const finding=report.findings.find(f=>f.code==='reported_token_state');assert.ok(finding);
  if(!some){assert.match(finding.text,/No usable token-state responses/i);assert.doesNotMatch(finding.text,/queries report interface-candidate responses/i);}
  else if(states.some(s=>s.status==='unavailable')) assert.match(finding.text,/Some token-state checks are unavailable/i);
  assert.equal(report.capabilities.reportedTokenState,some);
  assert.equal(report.evidence.find(e=>e.kind==='reported_token_state').tokenStates.length,states.length);
 }
});

test('current ABI intent and reported state are bounded observations, not historical effects or rights', () => {
  const api = load();
  const state = { address, blockTag: '0x1', status: 'available', authority: 'contract_reported_interface', decimals: 6, balanceRaw: '1000000' };
  const permission = { token: address, owner: address, spender: address, blockTag: '0x1', kind: 'erc20_allowance', rawValue: '100', authority: 'contract_reported_interface' };
  const input = `0x095ea7b3${'0'.repeat(24)}${address.slice(2)}${'0'.repeat(63)}1`;
  const evidence = adapter({ input: { ...adapter().input, signature: 'approve(address,uint256)', arguments: [{ name: 'spender', type: 'address', value: address }, { name: 'amount', type: 'uint256', value: '1' }] }, tokenStates: [state], permissionStates: [permission], capabilities: { inputDecoding: true, reportedTokenState: true, reportedPermissionState: true, internalTraces: false, isolatedBalanceDeltas: false } });
  const result = api.renderFindings(api.transactionFindings({ ...tx, input, blockNumber: '0x1', analysisEvidence: evidence }, 'mainnet', 'approve', { isUnlimited: false }));
  const report = result.validatedReport;
  for (const code of ['decoded_intent', 'abi_historical_uncertain', 'reported_token_state', 'reported_permission_state', 'allowance_unknown']) assert.ok(report.findings.some(f => f.code === code));
  assert.equal(report.uncertaintyScore, 40);
  assert.equal(report.evidenceRiskScore, null);
  assert.equal(report.capabilities.reportedPermissionState, true);
  assert.equal(report.evidence.find(e => e.kind === 'decoded_intent').input.historicalCertainty, false);
  assert.match(report.findings.find(f => f.code === 'reported_permission_state').text, /not.*rights|not.*effect/i);
  assert.equal(result.positives.length, 1);
  assert.ok(!report.findings.some(f => f.code === 'method_unknown'));
  assert.doesNotMatch(report.findings.find(f => f.code === 'allowance_unknown').text, /not checked/i);
  assert.doesNotMatch(report.findings.find(f => f.code === 'raw_units_unknown').text, /units.*not established/i);
  assert.match(report.findings.find(f => f.code === 'raw_units_unknown').text, /contract-reported/i);
});

test('spoofed adapter identities, capabilities, state shapes and historical certainty fail closed', () => {
  const api = load();
  const other = `0x${'22'.repeat(20)}`;
  const malformed = [
    adapter({ network: 'base' }), adapter({ subject: other }), adapter({ blockTag: '0x2' }),
    adapter({ version: 'adapters-v2' }), adapter({ coverage: 'complete_for_supported_checks' }),
    adapter({ input: { ...adapter().input, historicalCertainty: true } }),
    adapter({ input: { ...adapter().input, status: 'available', reason: null, historicalCertainty: true, provenance: { ...adapter().input.provenance, scope: 'historical_bound', proxyResolved: true } } }),
    adapter({ input: { ...adapter().input, provenance: { ...adapter().input.provenance, address: other } } }),
    adapter({ capabilities: { ...adapter().capabilities, internalTraces: true } }),
    adapter({ tokenStates: [{ address: other, status: 'available', blockTag: '0x1', authority: 'contract_reported_interface', decimals: 6, balanceRaw: '1' }] }),
    adapter({ tokenStates: [{ address, status: 'available', blockTag: '0x1', authority: 'contract_reported_interface', decimals: 255, balanceRaw: '-1' }] }),
    adapter({ permissionStates: [{ token: address, owner: other, spender: address, blockTag: '0x1', kind: 'erc20_allowance', rawValue: '1', authority: 'contract_reported_interface' }] }),
    adapter({ limits: [], attempts: 33 }), adapter({ input: { ...adapter().input, signature: 'x'.repeat(70000) } }),
  ];
  for (const evidence of malformed) {
    const report = api.renderFindings(api.transactionFindings({ ...tx, input: '0xd0e30db0', blockNumber: '0x1', analysisEvidence: evidence }, 'mainnet', null, null)).validatedReport;
    assert.ok(report.findings.some(f => f.code === 'adapter_evidence_invalid'));
    assert.equal(report.coverage, 'partial');
    assert.equal(report.capabilities.reportedTokenState, false);
    assert.ok(!report.findings.some(f => ['decoded_intent', 'reported_token_state', 'reported_permission_state'].includes(f.code)));
    assert.equal(report.evidenceRiskScore, null);
  }
});

test('valid current-only partial ABI decoding is a capability, even with legacy false adapter flag', () => {
  const api = load();
  for (const flag of [true, false]) {
    const evidence = adapter({ capabilities: { ...adapter().capabilities, inputDecoding: flag } });
    const report = api.renderFindings(api.transactionFindings({ ...tx, input: '0xd0e30db0', blockNumber: '0x1', analysisEvidence: evidence }, 'mainnet', null, null)).validatedReport;
    assert.equal(report.capabilities.inputDecoding, true);
    assert.ok(report.findings.some(f => f.code === 'abi_historical_uncertain'));
    assert.ok(!report.findings.some(f => f.code === 'adapter_evidence_invalid'));
    assert.equal(report.uncertaintyScore, 35);
    assert.ok(!report.findings.some(f => f.code === 'method_unknown'));
  }
});

test('a matching selector cannot substitute spoofed decoded arguments', () => {
  const api = load();
  const input = `0x095ea7b3${'0'.repeat(24)}${address.slice(2)}${'0'.repeat(63)}1`;
  const evidence = adapter({ input: { ...adapter().input, signature: 'approve(address,uint256)', arguments: [{ name: 'spender', type: 'address', value: address }, { name: 'amount', type: 'uint256', value: '999' }] } });
  const report = api.renderFindings(api.transactionFindings({ ...tx, input, blockNumber: '0x1', analysisEvidence: evidence }, 'mainnet', null, null)).validatedReport;
  assert.ok(report.findings.some(f => f.code === 'adapter_evidence_invalid'));
  assert.equal(report.capabilities.inputDecoding, false);
});

test('current proxy ABI address is retained without historical authority', () => {
  const api = load();
  const abiAddress = `0x${'22'.repeat(20)}`;
  const input = { ...adapter().input, provenance: { ...adapter().input.provenance, abiAddress } };
  const report = api.renderFindings(api.transactionFindings({ ...tx, input: '0xd0e30db0', blockNumber: '0x1', analysisEvidence: adapter({ input }) }, 'mainnet', null, null)).validatedReport;
  assert.equal(report.evidence.find(e => e.kind === 'decoded_intent')?.input.provenance.abiAddress, abiAddress);
  assert.ok(report.findings.some(f => f.code === 'abi_historical_uncertain'));
});

test('combined inventory/report UTF-8 bounds fail before model selection or verdict', () => {
  const api = load();
  const transfer = tx.receiptEvidence.transfers[0];
  assert.throws(() => api.transactionFindings({ ...tx, receiptEvidence: { status: 'available', complete: true, transfers: Array.from({ length: 50 }, () => ({ ...transfer, amountRaw: '9'.repeat(1500) })) } }, 'mainnet', null, null), /finding report.*bounds/i);
  const inventory = api.transactionFindings(tx, 'mainnet', null, null);
  inventory.evidence[0].value = 'x'.repeat(2001);
  assert.throws(() => api.validateFindingSelection('{"findingIds":[]}', inventory), /finding report.*bounds/i);
  assert.throws(() => api.renderFindings(inventory), /finding report.*bounds/i);
  const count = api.transactionFindings(tx, 'mainnet', null, null);
  count.findings = Array.from({ length: 33 }, () => count.findings[0]);
  assert.throws(() => api.renderFindings(count), /finding report.*bounds/i);
  const utf8 = api.transactionFindings(tx, 'mainnet', null, null);
  utf8.evidence[0].transfers = Array.from({ length: 50 }, () => ({ ...transfer, amountRaw: '\u20ac'.repeat(500) }));
  assert.ok(JSON.stringify(utf8).length < 65536);
  assert.throws(() => api.renderFindings(utf8), /finding report.*bounds/i);
  const boundary = api.transactionFindings(tx, 'mainnet', null, null);
  const bytes = data => Math.max(Buffer.byteLength(JSON.stringify(data)), Buffer.byteLength(JSON.stringify(api.renderFindings(data).validatedReport)));
  boundary.evidence[0].subject += 'x'.repeat(65536 - bytes(boundary));
  assert.equal(bytes(boundary), 65536);
  assert.doesNotThrow(() => api.renderFindings(boundary));
  boundary.evidence[0].subject += 'x';
  assert.throws(() => api.renderFindings(boundary), /finding report.*bounds/i);
});

test('actual adapter named Uniswap exactInputSingle tuple retains intent and rejects substituted fields', async () => {
  const api = load();
  Object.assign(api, { AbortSignal, TextEncoder });
  vm.runInContext(stripTypeScriptTypes(readFileSync(`${__dirname}/analysis-adapters.ts`, 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '')), api);
  const components = [
    { name: 'tokenIn', type: 'address' }, { name: 'tokenOut', type: 'address' },
    { name: 'fee', type: 'uint24' }, { name: 'recipient', type: 'address' },
    { name: 'deadline', type: 'uint256' }, { name: 'amountIn', type: 'uint256' },
    { name: 'amountOutMinimum', type: 'uint256' }, { name: 'sqrtPriceLimitX96', type: 'uint160' },
  ];
  const abi = [{ type: 'function', name: 'exactInputSingle', stateMutability: 'payable',
    inputs: [{ name: 'params', type: 'tuple', components }], outputs: [{ name: 'amountOut', type: 'uint256' }] }];
  const params = { tokenIn: address, tokenOut: `0x${'22'.repeat(20)}`, fee: 3000,
    recipient: `0x${'33'.repeat(20)}`, deadline: 2000000000n, amountIn: 1000000n, amountOutMinimum: 900000n, sqrtPriceLimitX96: 0n };
  const transaction = { ...tx, blockNumber: '0x1', input: viem.encodeFunctionData({ abi, functionName: 'exactInputSingle', args: [params] }),
    receiptEvidence: { status: 'available', complete: true, transfers: [] } };
  const evidence = await api.collectAnalysisEvidence(transaction, 'mainnet', {
    fetchContract: async () => ({ address, verificationStatus: 'verified', abi: JSON.stringify(abi) }),
    rpc: { attempts: 0, call: async () => { throw new Error('No state query expected'); } },
  });
  assert.equal(evidence.input.reason, 'current_abi_only');
  assert.equal(evidence.input.arguments[0].value.amountIn, '1000000');
  const assess = analysisEvidence => api.renderFindings(api.transactionFindings({ ...transaction, analysisEvidence }, 'mainnet', null, null)).validatedReport;
  const report = assess(evidence);
  assert.equal(report.capabilities.inputDecoding, true);
  assert.ok(report.findings.some(f => f.code === 'decoded_intent'));
  assert.ok(report.findings.some(f => f.code === 'abi_historical_uncertain'));
  assert.ok(!report.findings.some(f => f.code === 'adapter_evidence_invalid' || f.code === 'method_unknown'));
  assert.equal(report.evidence.find(e => e.kind === 'decoded_intent').input.arguments[0].value.recipient, params.recipient);
  for (const change of [
    value => { value.amountIn = '999999'; },
    value => { value.recipient = address; },
    value => { value.extra = '0'; },
    value => { [value.tokenIn, value.tokenOut] = [value.tokenOut, value.tokenIn]; },
    value => { const tokenIn = value.tokenIn; delete value.tokenIn; value.tokenIn = tokenIn; },
  ]) {
    const spoof = JSON.parse(JSON.stringify(evidence));
    change(spoof.input.arguments[0].value);
    const rejected = assess(spoof);
    assert.equal(rejected.capabilities.inputDecoding, false);
    assert.ok(rejected.findings.some(f => f.code === 'adapter_evidence_invalid'));
  }
});
