const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const core = require('./core.js');
const address = `0x${'11'.repeat(20)}`;
function report(status) {
  return { reportVersion: 'execution-check-v2', assessmentStatus: status, network: 'mainnet',
    summary: 'Bounded read-only check.', limitations: ['No signing clearance or confirmed effects.'],
    capabilities: { readOnlyCall: true, internalTraces: false, walletBalanceDeltas: false,
      storageSimulation: false, permissionState: false, historicalArchive: false },
    ...(status === 'call_check' ? { callCheck: { outcome: 'success', blockNumber: '0x123', to: address, from: address } } : {}) };
}
async function scan(response, kind = 'simulation') {
  const listeners = new Map();
  const nodes = new Map();
  const calls = [];
  const stored = {};
  const renders = [];
  let providerAccesses = 0;
  const shadow = { innerHTML: '', getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, { classList: { add() {}, remove() {} },
      addEventListener() {}, set innerHTML(value) { if (id === 'content') renders.push(value); } });
    return nodes.get(id);
  } };
  const storage = { get(defaults, cb) { cb({ ...defaults, ...stored }); }, set(value, cb) { Object.assign(stored, value); cb(); } };
  const window = { location: { href: 'https://example.test/app' }, SigilExtensionCore: {
    ...core, getAnalysisInput: kind === 'simulation' ? core.getAnalysisInput : () => ({ kind: 'hash', value: `0x${'ab'.repeat(32)}` }),
  }, addEventListener(name, callback) { listeners.set(name, callback); } };
  Object.defineProperty(window, 'ethereum', { get() { providerAccesses++; throw new Error('Provider must not be touched'); } });
  vm.runInNewContext(readFileSync(`${__dirname}/content.js`, 'utf8'), {
    window, document: { createElement: () => ({ style: {}, attachShadow: () => shadow, remove() {} }), documentElement: { appendChild() {} } },
    chrome: { storage: { local: storage, sync: storage } }, URL, Date, Math,
    setTimeout() { return 1; }, clearTimeout() {},
    fetch: async (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return response; },
  });
  listeners.get('sigil:observation')({ detail: { version: 1, observationId: '00000000-0000-4000-8000-000000000001',
    method: 'eth_sendTransaction', observedAt: Date.now(), target: { type: 'transaction', data: { to: address, from: address, data: '0x12345678' } } } });
  for (let i = 0; i < 4; i++) await new Promise(resolve => setImmediate(resolve));
  return { calls, stored, renders, html: renders.at(-1), providerAccesses, listeners };
}
test('content calls v2 and discriminates without inherited local verdict or zero-risk', async () => {
  for (const status of ['call_check', 'advisory_only', 'unavailable']) {
    const output = await scan({ ok: true, json: async () => report(status) });
    assert.match(output.calls[0].url, /\/api\/sigil\/simulate-v2$/);
    assert.equal(JSON.parse(output.calls[0].body.rawData).to, address);
    assert.doesNotMatch(output.html, /Risk \d+\/100|class="score"|body safe|Permission granted|You will receive/);
    assert.match(output.html, /No signing clearance/);
    if (status === 'call_check') assert.match(output.html, /0x123/);
    const entry = output.stored.history[0];
    assert.equal(entry.riskScore, null);
    assert.equal(entry.verdict, 'review');
    assert.equal(entry.assessmentStatus, status);
    assert.equal(entry.evidenceSource, 'remote_bounded_check');
    assert.equal(output.providerAccesses, 0);
    assert.equal(output.listeners.has('sigil:decision'), false);
  }
});
test('HTTP422, malformed and legacy safe responses display only local advisory', async () => {
  for (const response of [
    { ok: false, status: 422, json: async () => ({ error: 'execution_analysis_unavailable' }) },
    { ok: true, json: async () => ({ verdict: 'safe', riskScore: 0, assetChanges: [] }) },
    { ok: true, json: async () => ({ ...report('call_check'), riskScore: 0 }) },
    { ok: true, json: async () => ({ ...report('call_check'), callCheck: { outcome: 'success' } }) },
    { ok: true, json: async () => { throw new Error('secret upstream'); } },
  ]) {
    const output = await scan(response);
    assert.match(output.html, /Local advisory only/);
    assert.doesNotMatch(output.html, /Risk \d+\/100|body safe|class="score"|secret upstream/);
    assert.equal(output.stored.history[0].riskScore, null);
    assert.equal(output.stored.history[0].evidenceSource, 'local_advisory');
    assert.equal(output.providerAccesses, 0);
  }
});
test('ordinary analysis still uses analyze and its established score renderer', async () => {
  const output = await scan({ ok: true, json: async () => ({ id: 'fixture', verdict: 'caution', riskScore: 40, riskLevel: 'medium', summary: 'Analysis fixture.' }) }, 'hash');
  assert.match(output.calls[0].url, /\/api\/sigil\/analyze$/);
  assert.match(output.html, /Risk 40\/100/);
  assert.equal(output.providerAccesses, 0);
});
