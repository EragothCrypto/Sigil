const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');
const { EventEmitter } = require('node:events');
const vm = require('node:vm');
const { test } = require('node:test');
function load(rpc) {
  const routes = {};
  const ctx = vm.createContext({ Buffer, AbortController, isSupportedNetwork: n => ['mainnet', 'base'].includes(n),
    SimulateTransactionBody: { safeParse: () => ({ success: false }) },
    createEvidenceRpc: (_network, signal) => rpc(signal), Router: () => ({ post(path, fn) { routes[path] = fn; } }) });
  for (const file of ['execution-check', 'simulate']) {
    let source;
    try { source = readFileSync(`${__dirname}/${file}.ts`, 'utf8'); } catch { continue; }
    source = source.replace(/^import .*;\r?\n/gm, '').replace(/^export default .*;\r?$/gm, '').replace(/export /g, '');
    vm.runInContext(stripTypeScriptTypes(source, { mode: 'transform' }), ctx);
  }
  return routes;
}
function request(body) {
  const req = Object.assign(new EventEmitter(), { body, log: { error() { assert.fail('raw log'); }, warn() { assert.fail('raw log'); } } });
  const res = Object.assign(new EventEmitter(), { statusCode: 200, writableEnded: false,
    status(n) { this.statusCode = n; return this; }, json(data) { this.data = data; this.writableEnded = true; } });
  return { req, res };
}
test('legacy route always returns 422 without AI or RPC', async () => {
  const routes = load(() => { assert.fail('RPC'); }); const { req, res } = request({});
  await routes['/simulate'](req, res);
  assert.equal(res.statusCode, 422); assert.equal(res.data.error, 'execution_analysis_unavailable');
});
test('v2 validates before RPC and serves advisory with no score/effects', async () => {
  const routes = load(() => { assert.fail('RPC'); }); assert.equal(typeof routes['/simulate-v2'], 'function');
  const invalid = request({ rawData: 'x', network: 'invalid' }); await routes['/simulate-v2'](invalid.req, invalid.res);
  assert.equal(invalid.res.statusCode, 400);
  const prose = request({ rawData: 'wallet prompt' }); await routes['/simulate-v2'](prose.req, prose.res);
  assert.equal(prose.res.data.assessmentStatus, 'advisory_only'); assert.equal('riskScore' in prose.res.data, false);
});
test('disconnect aborts acquisition, skips response, and removes listeners', async () => {
  let signal, finish;
  const routes = load(s => { signal = s; return { call: () => new Promise(resolve => { finish = resolve; }) }; });
  assert.equal(typeof routes['/simulate-v2'], 'function');
  const { req, res } = request({ rawData: JSON.stringify({ to: `0x${'11'.repeat(20)}` }) });
  const pending = routes['/simulate-v2'](req, res); req.emit('aborted'); assert.equal(signal.aborted, true);
  finish(null); await pending; assert.equal(res.data, undefined); assert.equal(req.listenerCount('aborted'), 0);
  assert.equal(res.listenerCount('close'), 0);
});
test('normal response close does not abort completed work', async () => {
  let signal; const routes = load(s => { signal = s; return { call: async m => m === 'eth_blockNumber' ? '0x1' : '0x' }; });
  assert.equal(typeof routes['/simulate-v2'], 'function');
  const { req, res } = request({ rawData: JSON.stringify({ to: `0x${'11'.repeat(20)}` }) });
  await routes['/simulate-v2'](req, res); res.emit('close'); assert.equal(signal.aborted, false);
});
test('RPC factory failures are sanitized unavailable reports, not route failures', async () => {
  const routes = load(() => { throw new Error('secret endpoint'); });
  const { req, res } = request({ rawData: JSON.stringify({ to: `0x${'11'.repeat(20)}` }) });
  await routes['/simulate-v2'](req, res);
  assert.equal(res.data.assessmentStatus, 'unavailable');
  assert.doesNotMatch(JSON.stringify(res.data), /secret/);
  assert.equal('riskScore' in res.data, false);
  assert.equal(req.listenerCount('aborted'), 0);
});
