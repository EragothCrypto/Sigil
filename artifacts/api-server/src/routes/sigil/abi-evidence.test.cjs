const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { Module, stripTypeScriptTypes } = require('node:module');
const { test } = require('node:test');
const vm = require('node:vm');
const file = `${__dirname}/abi-evidence.ts`;
const loaded = new Module(file, module);
loaded.paths = module.paths;
if (existsSync(file)) loaded._compile(stripTypeScriptTypes(readFileSync(file, 'utf8')
  .replace(/^import type .*;\r?\n/gm, '')
  .replace(/^import \{ (.*) \} from 'viem';/m, "const { $1 } = require('viem');")
  .replace(/export /g, ''), { mode: 'transform' })
  + '\nmodule.exports = { decodeInputEvidence, inspectTokenInterface };', file);
const api = loaded.exports;
const address = '0x1111111111111111111111111111111111111111';
const provenance = { network: 'mainnet', address, blockTag: '0x123', scope: 'historical_bound', proxyResolved: true };
const fn = (name, inputs, outputs = []) => ({ type: 'function', name, stateMutability: 'nonpayable', inputs: inputs.map(type => ({ type })), outputs: outputs.map(type => ({ type })) });
const transfer = fn('transfer', ['address', 'uint256'], ['bool']);
const multi = fn('multicall', ['bytes[]'], ['bytes[]']);
function encode(abi, functionName, args) { return require('viem').encodeFunctionData({ abi, functionName, args }); }
function decode(abi, data, p = provenance) {
  assert.equal(typeof api.decodeInputEvidence, 'function', 'decodeInputEvidence export missing');
  return api.decodeInputEvidence(abi, data, p);
}

function reportBoundary(input, calldata) {
  const context = vm.createContext({ lookupEntity: () => null, URL, Buffer, ...require('viem'), ...api });
  for (const name of ['incident-catalog', 'validated-findings']) {
    vm.runInContext(stripTypeScriptTypes(readFileSync(`${__dirname}/${name}.ts`, 'utf8')
      .replace(/^import .*;\r?\n/gm, '').replace(/export /g, '')), context);
  }
  const parserFile = `${__dirname}/../../../../../lib/api-zod/src/validated-report.ts`;
  const parser = new Module(parserFile, module);
  parser._compile(stripTypeScriptTypes(readFileSync(parserFile, 'utf8').replace(/export /g, ''))
    + '\nmodule.exports = { parseValidatedReport };', parserFile);
  const tx = {
    hash: `0x${'aa'.repeat(32)}`, to: address, from: address, input: calldata, value: '0x0',
    blockNumber: provenance.blockTag, inclusionStatus: 'mined', status: '0x1',
    destinationHasCode: true, destinationVerification: 'verified',
    receiptEvidence: { status: 'available', complete: true, transfers: [] },
    analysisEvidence: {
      version: 'adapters-v1', network: 'mainnet', subject: address, blockTag: provenance.blockTag,
      input, tokenStates: [], permissionStates: [], coverage: 'partial',
      limits: ['internal_traces_unavailable'], attempts: 0,
      capabilities: { inputDecoding: input.status !== 'unavailable', reportedTokenState: false,
        reportedPermissionState: false, internalTraces: false, isolatedBalanceDeltas: false },
    },
  };
  const result = context.renderFindings(context.transactionFindings(tx, 'mainnet', null, null));
  const parsed = parser.exports.parseValidatedReport(JSON.parse(JSON.stringify(result)));
  assert.ok(parsed, 'actual decoder -> findings report must survive the shared parser');
  assert.ok(!parsed.findings.some(f => f.code === 'adapter_evidence_invalid'));
  for (const code of ['execution_status', 'source_verified', 'transfer_observations', 'traces_missing']) {
    assert.ok(parsed.findings.some(f => f.code === code), `${code} must be preserved`);
  }
  assert.equal(parsed.capabilities.inputDecoding, input.status !== 'unavailable');
  if (input.status === 'unavailable') {
    assert.equal(parsed.evidence.find(e => e.kind === 'abi_unavailable').value, 'argument_limit');
    assert.ok(!parsed.findings.some(f => f.code === 'decoded_intent'));
  } else {
    assert.deepEqual(parsed.evidence.find(e => e.kind === 'decoded_intent').input, input);
  }
  return parsed;
}

const currentProvenance = { ...provenance, scope: 'current_only', proxyResolved: false };

test('nested global node overflow fails closed without losing the findings report', () => {
  const abi = [fn('values', ['uint256[][]'])];
  for (const lastLength of [23, 24, 32]) {
    // One outer array + eight inner arrays + 224 + lastLength scalars.
    const values = [...Array.from({ length: 7 }, () => Array(32).fill(1n)), Array(lastLength).fill(1n)];
    const data = encode(abi, 'values', [values]);
    const input = decode(abi, data, currentProvenance);
    reportBoundary(input, data);
    assert.deepEqual(decode(abi, data, currentProvenance), input);
    if (lastLength === 23) {
      assert.equal(input.status, 'partial');
      assert.equal(input.reason, 'current_abi_only');
      assert.equal(decode(abi, data).status, 'available');
    } else {
      assert.deepEqual(input, { status: 'unavailable', source: 'abi', provenance: currentProvenance,
        historicalCertainty: false, reason: 'argument_limit' });
      assert.equal(decode(abi, data).reason, 'argument_limit');
    }
  }
});

test('multicall node budget is shared across all arguments and children', () => {
  const large = fn('large', Array(15).fill('uint256'));
  const deadline = fn('multicall', ['uint256', 'bytes[]']);
  for (const item of [multi, deadline]) {
    const deadlineNodes = item === deadline ? 1 : 0;
    const small = fn('small', Array(14 - deadlineNodes).fill('uint256'));
    const next = fn('next', Array(15 - deadlineNodes).fill('uint256'));
    const abi = [item, small, next, large];
    const smallData = encode(abi, 'small', Array(14 - deadlineNodes).fill(1n));
    const nextData = encode(abi, 'next', Array(15 - deadlineNodes).fill(1n));
    const largeData = encode(abi, 'large', Array(15).fill(1n));
    for (const first of [smallData, nextData]) {
      // Root arguments + sixteen byte strings + child scalars = 256/257.
      const children = [first, ...Array(15).fill(largeData)];
      const data = encode(abi, 'multicall', item === deadline ? [1n, children] : [children]);
      const input = decode(abi, data, currentProvenance);
      reportBoundary(input, data);
      assert.deepEqual(decode(abi, data, currentProvenance), input);
      assert.equal(input.status, first === smallData ? 'partial' : 'unavailable');
      if (first === smallData) {
        assert.equal(input.subcalls.length, 16);
        assert.equal(decode(abi, data).status, 'available');
      } else {
        assert.equal(input.reason, 'argument_limit');
        assert.equal(input.arguments, undefined);
        assert.equal(input.subcalls, undefined);
      }
    }
  }
});

test('nested multicall overflow propagates to the root without retaining arguments or subcalls', () => {
  const leaf = fn('leaf', Array(17).fill('uint256'));
  const abi = [multi, leaf];
  const child = encode(abi, 'leaf', Array(17).fill(1n));
  const inner = encode(abi, 'multicall', [Array(7).fill(child)]);
  // Two inner calls + fourteen leaves stay within the sixteen-child limit.
  // Three root nodes + sixteen inner nodes + 238 scalar nodes = 257.
  const data = encode(abi, 'multicall', [[inner, inner]]);
  const input = decode(abi, data, currentProvenance);
  reportBoundary(input, data);
  assert.deepEqual(input, { status: 'unavailable', source: 'abi', provenance: currentProvenance,
    historicalCertainty: false, reason: 'argument_limit' });
  assert.deepEqual(decode(abi, data, currentProvenance), input);
});

test('other argument limits retain qualified partial evidence within the node budget', () => {
  for (const [abi, name, args] of [
    [[fn('values', ['uint256[]'])], 'values', [Array(33).fill(1n)]],
    [[fn('text', ['string'])], 'text', ['x'.repeat(2000)]],
  ]) {
    const data = encode(abi, name, args);
    const input = decode(abi, data, currentProvenance);
    reportBoundary(input, data);
    assert.equal(input.status, 'partial');
    assert.equal(input.reason, 'argument_limit');
    assert.ok(input.arguments);
  }
});

test('exports the two isolated public helpers', () => {
  assert.equal(typeof api.decodeInputEvidence, 'function');
  assert.equal(typeof api.inspectTokenInterface, 'function');
});
test('canonical transfer preserves identity and string-friendly uint256', () => {
  const value = (1n << 256n) - 1n;
  const r = decode([transfer], encode([transfer], 'transfer', [address, value]));
  assert.equal(r.status, 'available');
  assert.equal(r.signature, 'transfer(address,uint256)');
  assert.equal(r.arguments[1].value, value.toString());
  assert.deepEqual(r.provenance, provenance);
  assert.equal(r.source, 'abi');
  assert.equal(r.historicalCertainty, true);
  assert.doesNotThrow(() => JSON.stringify(r));
});
test('unknown selectors and malformed calldata fail closed', () => {
  for (const data of ['0x', '0x123', '0xzzzzzzzz', '0xdeadbeef', '0xa9059cbb']) {
    assert.equal(decode([transfer], data).status, 'unavailable');
  }
});
test('selector collisions are rejected even when one encoding fits', () => {
  const abi = [fn('burn', ['uint256']), fn('collate_propagate_storage', ['bytes16'])];
  assert.equal(decode(abi, encode(abi, 'burn', [1n])).reason, 'ambiguous_selector');
  assert.equal(decode([transfer, transfer], encode([transfer], 'transfer', [address, 1n])).reason, 'ambiguous_selector');
});
test('canonical comparison rejects trailing bytes and malformed dynamic offsets', () => {
  const abi = [fn('submit', ['bytes'])];
  const good = encode(abi, 'submit', ['0x1234']);
  assert.equal(decode(abi, good).status, 'available');
  assert.equal(decode(abi, `${good}00`).status, 'unavailable');
  const bad = `${good.slice(0, 10)}${'0'.repeat(63)}1${good.slice(74)}`;
  assert.equal(decode(abi, bad).status, 'unavailable');
});
test('current ABI and unresolved proxies do not establish historical certainty', () => {
  const data = encode([transfer], 'transfer', [address, 1n]);
  for (const p of [{ ...provenance, scope: 'current_only' }, { ...provenance, proxyResolved: false }]) {
    const r = decode([transfer], data, p);
    assert.equal(r.status, 'partial');
    assert.equal(r.historicalCertainty, false);
  }
});
test('only reviewed multicalls decode children; unknown children retain partial coverage', () => {
  const deadline = fn('multicall', ['uint256', 'bytes[]']);
  const unreviewed = fn('aggregate', ['bytes[]']);
  const abi = [transfer, multi, deadline, unreviewed];
  const child = encode(abi, 'transfer', [address, 1n]);
  for (const [item, args] of [[multi, [[child, '0xdeadbeef']]], [deadline, [123n, [child, '0xdeadbeef']]]]) {
    const r = decode(abi, encode([item], 'multicall', args));
    assert.equal(r.status, 'partial');
    assert.equal(r.subcalls.length, 2);
    assert.equal(r.subcalls[0].signature, 'transfer(address,uint256)');
    assert.equal(r.subcalls[1].status, 'unavailable');
  }
  assert.equal(decode(abi, encode(abi, 'aggregate', [[child]])).subcalls, undefined);
});
test('multicall recursion stops at depth four and total sixteen children', () => {
  const abi = [transfer, multi];
  const child = encode(abi, 'transfer', [address, 1n]);
  const sixteen = decode(abi, encode(abi, 'multicall', [Array(16).fill(child)]));
  assert.equal(sixteen.status, 'available');
  const seventeen = decode(abi, encode(abi, 'multicall', [Array(17).fill(child)]));
  assert.equal(seventeen.status, 'partial');
  assert.equal(seventeen.subcalls.length, 16);
  let nested = child;
  for (let i = 0; i < 5; i++) nested = encode(abi, 'multicall', [[nested]]);
  const r = decode(abi, nested);
  assert.equal(r.status, 'partial');
  let cursor = r;
  let depth = 0;
  while (cursor.subcalls?.length) { cursor = cursor.subcalls[0]; depth++; }
  assert.equal(depth, 4);
});
test('array bounds apply at thirty-two and normalized long values remain bounded', () => {
  const abi = [fn('values', ['uint256[]']), fn('text', ['string'])];
  assert.equal(decode(abi, encode(abi, 'values', [Array(32).fill(1n)])).status, 'available');
  const r = decode(abi, encode(abi, 'values', [Array(33).fill(1n)]));
  assert.equal(r.status, 'partial');
  assert.equal(r.arguments[0].value.length, 32);
  const text = decode(abi, encode(abi, 'text', ['x'.repeat(2000)]));
  assert.equal(text.status, 'partial');
  assert.ok(text.arguments[0].value.length <= 1024);
});
test('calldata and ABI size limits reject inputs without truncating them into success', () => {
  const abi = [fn('bytes', ['bytes'])];
  // Selector + offset + length + payload: exactly 32KiB is not word-aligned.
  for (const bytes of [32736, 32768]) {
    assert.equal(decode(abi, `0x${'00'.repeat(bytes)}`).status, 'unavailable');
  }
  assert.equal(decode(abi, `0x${'00'.repeat(32769)}`).reason, 'calldata_limit');
  const data = encode([transfer], 'transfer', [address, 1n]);
  assert.equal(decode(Array(257).fill(transfer), data).reason, 'abi_limit');
  const base = JSON.stringify([transfer]);
  assert.equal(decode(base.padEnd(262144, ' '), data).status, 'available');
  assert.equal(decode(base.padEnd(262145, ' '), data).reason, 'abi_limit');
  assert.equal(decode(null, data).status, 'unavailable');
  assert.equal(decode('{', data).status, 'unavailable');
});
test('token inspection reports interface candidates, never semantics or safety', () => {
  assert.equal(typeof api.inspectTokenInterface, 'function');
  const abi = [transfer, fn('balanceOf', ['address'], ['uint256']), fn('decimals', [], ['uint8'])];
  for (const type of ['uint8', 'uint256']) {
    const r = api.inspectTokenInterface([transfer, abi[1], fn('decimals', [], [type])]);
    assert.equal(r.erc20Candidate, true);
    assert.equal(r.allowance, false);
    assert.equal(r.semanticsGuaranteed, false);
  }
  assert.equal(api.inspectTokenInterface([...abi, fn('allowance', ['address', 'address'], ['uint256'])]).allowance, true);
  for (const invalid of [[], [transfer, abi[1]], [transfer, abi[1], fn('decimals', [], ['string'])], [transfer, abi[1], abi[2], abi[2]], null]) {
    assert.equal(api.inspectTokenInterface(invalid).erc20Candidate, false);
  }
});
test('transfer candidate is based on input shape, not a guaranteed return convention', () => {
  const abi = [fn('transfer', ['address', 'uint256']), fn('balanceOf', ['address'], ['uint256']), fn('decimals', [], ['uint8'])];
  assert.equal(api.inspectTokenInterface(abi).erc20Candidate, true);
});
test('canonical payloads below and above calldata cap and ABI entry cap', () => {
  const abi = [fn('blob', ['bytes'])];
  const below = encode(abi, 'blob', [`0x${'ab'.repeat(32640)}`]);
  const above = encode(abi, 'blob', [`0x${'ab'.repeat(32704)}`]);
  assert.equal(decode(abi, below).status, 'partial');
  assert.equal(decode(abi, above).reason, 'calldata_limit');
  const boundedAbi = [transfer, ...Array.from({ length: 255 }, (_, i) => fn(`f${i}`, []))];
  const data = encode([transfer], 'transfer', [address, 1n]);
  assert.equal(decode(boundedAbi, data).status, 'available');
  assert.equal(decode([...boundedAbi, fn('over', [])], data).reason, 'abi_limit');
});
test('tuple arguments are normalized without bigint and array depths are bounded', () => {
  const abi = [{ ...fn('tupleCall', []), inputs: [{ name: 'position', type: 'tuple', components: [{ name: 'owner', type: 'address' }, { name: 'amount', type: 'uint256' }] }] }];
  const r = decode(abi, encode(abi, 'tupleCall', [{ owner: address, amount: 9n }]));
  assert.equal(r.status, 'available');
  assert.deepEqual(r.arguments[0].value, { owner: address, amount: '9' });
  assert.doesNotThrow(() => JSON.stringify(r));
  assert.equal(decode([fn('nested', ['uint256[][][][][]'])], '0xdeadbeef').status, 'unavailable');
  const circular = []; circular.push(circular);
  assert.equal(decode(circular, '0xdeadbeef').status, 'unavailable');
});

test('nested node boundaries remain consumable from ABI decode through findings and shared parser', () => {
  const vm = require('node:vm');
  const viem = require('viem');
  const context = vm.createContext({...viem, Buffer, URL, TextEncoder, lookupEntity: () => null});
  for (const path of ['incident-catalog.ts', 'abi-evidence.ts', 'validated-findings.ts', '../../../../../lib/api-zod/src/validated-report.ts']) {
    vm.runInContext(stripTypeScriptTypes(readFileSync(`${__dirname}/${path}`, 'utf8').replace(/^import .*\r?\n/gm, '').replace(/export /g, '')), context);
  }
  const abi = [fn('values', ['uint256[][]'])];
  const p = {...provenance, scope:'current_only', proxyResolved:false};
  for (const lengths of [[32,32,32,32,32,32,32,23], Array(8).fill(32)]) {
    const data = encode(abi, 'values', [lengths.map(length => Array(length).fill(1n))]);
    const input = context.decodeInputEvidence(abi, data, p);
    const over = lengths.every(length => length === 32);
    assert.equal(input.status, over ? 'unavailable' : 'partial');
    if (over) { assert.equal(input.reason, 'argument_limit'); assert.equal(input.arguments, undefined); }
    const evidence = {version:'adapters-v1',network:'mainnet',subject:address,blockTag:p.blockTag,input,
      tokenStates:[],permissionStates:[],coverage:'partial',limits:['internal_traces_unavailable'],attempts:0,
      capabilities:{inputDecoding:!over,reportedTokenState:false,reportedPermissionState:false,internalTraces:false,isolatedBalanceDeltas:false}};
    const tx = {hash:'0x'+'a'.repeat(64),to:address,from:address,input:data,value:'0x0',blockNumber:p.blockTag,
      inclusionStatus:'mined',status:'0x1',destinationHasCode:true,destinationVerification:'verified',analysisEvidence:evidence,
      receiptEvidence:{status:'available',complete:true,transfers:[]}};
    const report = context.renderFindings(context.transactionFindings(tx,'mainnet',null,null)).validatedReport;
    assert.ok(context.parseValidatedReport({validatedReport:report}));
    assert.equal(report.capabilities.inputDecoding, !over);
    assert.ok(report.findings.some(f => f.code === (over ? 'abi_unavailable' : 'decoded_intent')));
  }
});
