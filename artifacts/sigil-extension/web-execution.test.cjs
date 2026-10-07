const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('../../node_modules/typescript');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const file = `${__dirname}/../sigil/src/components/sigil/SimulationResultView.tsx`;
function load() {
  const exports = {};
  const jsx = (type, props) => ({ type: typeof type === 'function' ? type.name : type, props });
  vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : new Proxy({}, { get: (_, key) => function Icon() {} }) });
  return exports;
}
test('web renders bounded status and rejects legacy safe/effect payloads', () => {
  const api = load();
  const payload = { reportVersion: 'execution-check-v2', network: 'mainnet', assessmentStatus: 'unavailable',
    summary: 'Unavailable.', limitations: ['No signing clearance.'], capabilities: { readOnlyCall: true,
      internalTraces: false, walletBalanceDeltas: false, storageSimulation: false, permissionState: false, historicalArchive: false } };
  assert.equal(api.isExecutionReport(payload), true);
  for (const key of ['riskScore', 'verdict', 'riskLevel', 'assetChanges', 'permissionsGranted']) {
    assert.equal(api.isExecutionReport({ ...payload, [key]: 0 }), false);
  }
  assert.equal(api.isExecutionReport({ verdict: 'safe', assetChanges: [] }), false);
  assert.match(JSON.stringify(api.SimulationResultView({ data: payload })), /Check unavailable/);
  assert.doesNotMatch(JSON.stringify(api.SimulationResultView({ data: { verdict: 'safe', assetChanges: [] } })), /Safe to Sign|No direct asset changes/);
});
function moduleFrom(source, imports, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { exports, require: imports, URLSearchParams, Headers, ...globals });
  return exports;
}
const root = path.resolve(__dirname, '../..');
test('regenerated enum values preserve every existing exported runtime enum', () => {
  const file = 'lib/api-client-react/src/generated/api.schemas.ts';
  const old = moduleFrom(execFileSync('git', ['show', `HEAD:${file}`], { cwd: root, encoding: 'utf8' }), () => ({}));
  const current = moduleFrom(readFileSync(path.join(root, file), 'utf8'), () => ({}));
  for (const key of Object.keys(old)) assert.equal(JSON.stringify(current[key]), JSON.stringify(old[key]), key);
});
test('generated Zod rejects unsupported scores and effects, not merely strips them', () => {
  const zod = require('../../lib/api-zod/node_modules/zod');
  const api = moduleFrom(readFileSync(path.join(root, 'lib/api-zod/src/generated/api.ts'), 'utf8'), () => zod);
  const payload = { reportVersion: 'execution-check-v2', network: 'mainnet', assessmentStatus: 'advisory_only',
    summary: 'Advisory only.', limitations: [], capabilities: { readOnlyCall: true, internalTraces: false,
      walletBalanceDeltas: false, storageSimulation: false, permissionState: false, historicalArchive: false } };
  assert.equal(api.SimulateTransactionV2Response.safeParse(payload).success, true);
  for (const key of ['riskScore', 'verdict', 'riskLevel', 'assetChanges', 'permissionsGranted']) {
    assert.equal(api.SimulateTransactionV2Response.safeParse({ ...payload, [key]: 0 }).success, false, key);
  }
});
test('generated non-simulation history queries retain cache keys and empty-ID guard', () => {
  const api = moduleFrom(readFileSync(path.join(root, 'lib/api-client-react/src/generated/api.ts'), 'utf8'), () => ({}));
  assert.equal(JSON.stringify(api.getGetAnalysisByIdQueryKey('abc')), JSON.stringify(['/api/sigil/history', 'abc']));
  assert.equal(api.getGetAnalysisByIdQueryOptions('').enabled, false);
  assert.equal(api.getGetAnalysisByIdUrl('a/b'), '/api/sigil/history?id=a%2Fb');
});
test('actual generated legacy client propagates HTTP422 and v2 calls the new endpoint', async () => {
  let called;
  const fetchApi = moduleFrom(readFileSync(path.join(root, 'lib/api-client-react/src/custom-fetch.ts'), 'utf8'), () => ({}), {
    Request, Response, URL, fetch: async url => { called = url; return new Response(JSON.stringify({ error: 'execution_analysis_unavailable' }), { status: 422, headers: { 'Content-Type': 'application/json' } }); },
  });
  const api = moduleFrom(readFileSync(path.join(root, 'lib/api-client-react/src/generated/api.ts'), 'utf8'), name => name === '../custom-fetch' ? fetchApi : {});
  await assert.rejects(api.simulateTransaction({ rawData: 'prompt' }));
  assert.equal(called, '/api/sigil/simulate');
  await assert.rejects(api.simulateTransactionV2({ rawData: 'prompt' }));
  assert.equal(called, '/api/sigil/simulate-v2');
});
test('regenerated unrelated request and hook runtime behavior matches the baseline', async () => {
  const file = 'lib/api-client-react/src/generated/api.ts';
  function client(source) {
    let reads = 0;
    const calls = [];
    const api = moduleFrom(source, name => name === '../custom-fetch' ? {
      customFetch: async (url, options) => { calls.push({ url, options }); return {}; },
    } : { useQuery: () => ({ get data() { reads++; return 'data'; } }) });
    return { api, calls, reads: () => reads };
  }
  const old = client(execFileSync('git', ['show', `HEAD:${file}`], { cwd: root, encoding: 'utf8' }));
  const current = client(readFileSync(path.join(root, file), 'utf8'));
  for (const item of [old, current]) {
    item.api.useHealthCheck();
    await item.api.analyzeInput({ input: 'fixture', network: 'mainnet' }, { headers: new Headers({ 'X-Test': 'fixture' }) });
  }
  assert.equal(current.reads(), old.reads());
  assert.equal(JSON.stringify(current.calls), JSON.stringify(old.calls));
});
test('full regenerated non-simulation Zod validation contracts match the baseline', () => {
  const file = 'lib/api-zod/src/generated/api.ts';
  const zod = require('../../lib/api-zod/node_modules/zod');
  const old = moduleFrom(execFileSync('git', ['show', `HEAD:${file}`], { cwd: root, encoding: 'utf8' }), () => zod);
  const current = moduleFrom(readFileSync(path.join(root, file), 'utf8'), () => zod);
  function contract(value, key) {
    if (typeof value === 'function') return ['shape', 'defaultValue'].includes(key) ? contract(value()) : undefined;
    if (value && value._def) return contract(value._def);
    if (Object.prototype.toString.call(value) === '[object RegExp]') return value.toString();
    if (Array.isArray(value)) return value.map(item => contract(item));
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort()
      .filter(name => !['description', 'errorMap'].includes(name)).map(name => [name, contract(value[name], name)]));
    return value;
  }
  for (const key of Object.keys(old).filter(key => !/simulate/i.test(key))) {
    assert.equal(JSON.stringify(contract(current[key])), JSON.stringify(contract(old[key])), key);
  }
});
