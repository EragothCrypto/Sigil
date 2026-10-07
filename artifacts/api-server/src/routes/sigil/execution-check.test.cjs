const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');
const vm = require('node:vm');
const { test } = require('node:test');
function load() {
  if (!existsSync(`${__dirname}/execution-check.ts`)) return {};
  const ctx = vm.createContext({ Buffer });
  vm.runInContext(stripTypeScriptTypes(readFileSync(`${__dirname}/execution-check.ts`, 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, ''), { mode: 'transform' }), ctx);
  return ctx;
}
const address = `0x${'11'.repeat(20)}`;
const forbidden = ['verdict', 'riskScore', 'riskLevel', 'assetChanges', 'permissionsGranted'];
function honest(result) { for (const key of forbidden) assert.equal(key in result, false, key); }
test('strict bounded input rejects unknown request/transaction keys and malformed values', () => {
  const api = load();
  assert.equal(typeof api.parseExecutionInput, 'function');
  for (const body of [null, {}, { rawData: 'x', endpoint: 'https://evil' }, { rawData: 'x', network: 'evil' },
    { rawData: JSON.stringify({ to: address, method: 'eth_sendTransaction' }) },
    { rawData: JSON.stringify({ to: address, endpoint: 'https://evil' }) },
    { rawData: JSON.stringify({ to: '0x1' }) }, { rawData: JSON.stringify({ to: address, gas: '0x00' }) },
    { rawData: JSON.stringify({ to: address, data: '0x1' }) }, { rawData: '{invalid' },
    { rawData: 'x'.repeat(70000) }, { rawData: JSON.stringify({ data: `0x${'aa'.repeat(32769)}` }) }]) {
    assert.equal(api.parseExecutionInput(body), null, JSON.stringify(body).slice(0, 80));
  }
  assert.ok(api.parseExecutionInput({ rawData: JSON.stringify({ to: address, data: `0x${'aa'.repeat(32768)}` }) }));
});
test('prose and calldata without a destination are advisory only and make no calls', async () => {
  const api = load();
  assert.equal(typeof api.checkExecution, 'function');
  for (const rawData of ['Wallet wants a signature', '0x095ea7b3', JSON.stringify({ data: '0x' })]) {
    const result = await api.checkExecution(api.parseExecutionInput({ rawData }), { call() { assert.fail('RPC'); } });
    assert.equal(result.assessmentStatus, 'advisory_only');
    assert.ok(result.limitations.length); honest(result);
  }
});
test('only blockNumber then eth_call are issued at the exact pinned block', async () => {
  const api = load();
  assert.equal(typeof api.checkExecution, 'function');
  const calls = [];
  const tx = { to: address, from: address, data: '0x', value: '0x0', gas: '0x5208' };
  const rpc = { async call(method, params, accept) {
    calls.push([method, params]); const value = method === 'eth_blockNumber' ? '0x123' : '0x';
    assert.equal(accept(value), true); return value;
  } };
  const result = await api.checkExecution(api.parseExecutionInput({ rawData: JSON.stringify(tx), network: 'base' }), rpc);
  assert.equal(result.assessmentStatus, 'call_check'); assert.equal(result.callCheck.outcome, 'success');
  assert.equal(result.callCheck.blockNumber, '0x123'); assert.equal(result.network, 'base');
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [['eth_blockNumber', []], ['eth_call', [tx, '0x123']]]);
  honest(result);
});
test('missing/malformed RPC and raw upstream errors remain sanitized unavailable', async () => {
  const api = load();
  assert.equal(typeof api.checkExecution, 'function');
  const input = api.parseExecutionInput({ rawData: JSON.stringify({ to: address }) });
  for (const bad of [null, {}, 'latest', '0x00', '0x1']) {
    const result = await api.checkExecution(input, { async call(method) { return method === 'eth_blockNumber' ? (bad === '0x1' ? '0x1' : bad) : bad; } });
    assert.equal(result.assessmentStatus, 'unavailable'); honest(result);
  }
  const failed = await api.checkExecution(input, { async call() { throw new Error('secret payload execution reverted'); } });
  assert.equal(failed.assessmentStatus, 'unavailable'); assert.doesNotMatch(JSON.stringify(failed), /secret|reverted/); honest(failed);
});
