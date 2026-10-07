const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('../../../../../node_modules/typescript');
const { test } = require('node:test');

function routesFor(tx, inputType = 'transaction', options = {}) {
  const parser = {exports:{}};
  const compile = file => ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(compile(`${__dirname}/../../../../../lib/api-zod/src/validated-report.ts`),{exports:parser.exports,URL,TextEncoder});
  const cacheValidation={exports:{}};
  vm.runInNewContext(compile(`${__dirname}/analysis-cache-validation.ts`),{exports:cacheValidation.exports,require:name=>name.includes('validated-report')?parser.exports:{lookupIncident:()=>undefined}});
  const handlers = new Map();
  const saved = [];
  let aiCalls = 0;
  let cacheWrites = 0;
  let reputationCalls = 0;
  class OutputError extends Error { constructor() { super('Analysis unreliable'); this.code = 'analysis_unreliable'; } }
  function analyze(data) { aiCalls++; if (options.rejectAI) throw new OutputError(); if (data && inputType === 'transaction') assert.equal(data.analysisEvidence?.version, 'adapters-v1'); return verdict; }
  const report = { version: 'findings-v2', scorePolicy: 'dual-floor-v2', findings: [{ id: 'f:traces_missing', code: 'traces_missing', category: 'limitation', text: 'Traces not collected.', evidenceRefs: ['e:traces_missing'] }] };
  const verdict = { summary: 'Evidence summary', verdict: 'caution', verdictReason: 'Review evidence', riskScore: 40, riskLevel: 'medium', warnings: [], positives: [], validatedReport: report };
  const modules = {
    express: { Router: () => ({ get() {}, post: (path, handler) => handlers.set(path, handler) }) },
    'node:crypto': require('node:crypto'),
    '@workspace/db': { db: { insert: () => ({ values: value => ({ returning: async () => { saved.push(value); return [{ ...value, createdAt: new Date() }]; } }) }) } },
    '@workspace/db/schema': { analysesTable: {} },
    '@workspace/api-zod': { AnalyzeInputBody: { safeParse: data => ({ success: true, data }) } },
    './ethereum.js': {
      detectInputType: () => inputType, isSupportedNetwork: network => network === 'mainnet',
      fetchContract: async () => ({ address: 'address', isVerified: false, verificationStatus: 'unknown' }), verifiedEvidence: () => undefined,
      fetchTransaction: async () => tx, decodeMethodId: () => null, decodeApprovalCalldata: () => null,
      transactionEvidenceDetails: data => ({ sourceVerification: data?.destinationVerification ?? 'unknown', transferCoverage: 'partial' }),
    },
    './analysis-adapters.js': { collectAnalysisEvidence: async () => ({ version: 'adapters-v1', coverage: 'partial' }) },
    './ai-analyzer.js': {
      AIAnalysisOutputError: OutputError,
      analyzeTransaction: async data => analyze(data),
      analyzeContract: async () => analyze(),
      analyzeTransactionStreaming: async (_tx, _method, _network, _input, emit) => { const result = analyze(_tx); emit({ type: 'result', result }); return result; },
      analyzeContractStreaming: async (_contract, _network, emit) => { const result = analyze(); emit({ type: 'result', result }); return result; },
    },
    './known-entities.js': { lookupEntity: () => null },
    './contract-reputation.js': { calculateContractReputation: async () => { reputationCalls++; return { tier: 'unproven', trustScore: 0, isExploited: false }; } },
    './pattern-detector.js': { detectPatterns: () => [{ description: 'unsupported inflation', confidence: 'confirmed' }], mergePatterns: patterns => patterns },
    './score-factors.js': { computeScoreFactors: () => [{ label: 'unsupported source credit', delta: -15 }] },
    './analysis-cache.js': { cacheKey: () => 'test', analysisCache: { get() { return options.cached; }, set() { cacheWrites++; } } },
    './analysis-cache-validation.js': cacheValidation.exports,
    './analysis-schema.js': { ensureAnalysesSchema: async () => {} },
  };
  const source = ts.transpileModule(readFileSync(`${__dirname}/index.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports: {}, AbortController, require: name => modules[name] ?? {}, process: { env: {} } });
  return { handlers, saved, get reputationCalls() { return reputationCalls; }, get aiCalls() { return aiCalls; }, get cacheWrites() { return cacheWrites; } };
}

function responseFor(events = []) {
  return { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; }, setHeader() {}, flushHeaders() {}, end() {}, write(line) { events.push(JSON.parse(line.slice(6))); } };
}
test('invalid selections fail closed in JSON and SSE without persistence or cache', async () => {
  for (const type of ['transaction', 'contract']) for (const path of ['/analyze', '/analyze-stream']) {
    const api = routesFor({to: 'target', from: 'sender', input: '0x', value: '0x0'}, type, {rejectAI: true});
    const events = []; const response = responseFor(events);
    await api.handlers.get(path)({body: {input: 'hash', network: 'mainnet', fresh: true}, log: {error() {}}}, response);
    if (path === '/analyze') assert.equal(response.body.error, 'analysis_unreliable', `${type}: ${JSON.stringify(response.body)}`);
    else { assert.equal(events.find(e => e.type === 'error').code, 'analysis_unreliable'); assert.equal(events.some(e => ['result', 'done', 'cached', 'metadata'].includes(e.type)), false); }
    assert.equal(api.saved.length, 0); assert.equal(api.cacheWrites, 0); assert.equal(api.reputationCalls, 0);
  }
});
test('legacy cache cannot bypass new validation; contract routes skip legacy reputation', async () => {
  for (const path of ['/analyze', '/analyze-stream']) {
    const api = routesFor(null, 'contract', {cached: {riskScore: 0, details: {}}});
    const events = []; const response = responseFor(events);
    await api.handlers.get(path)({body: {input: 'address', network: 'mainnet'}, log: {error() {}}}, response);
    assert.equal(api.aiCalls, 1); assert.equal(api.reputationCalls, 0); assert.equal(api.saved.length, 1);
    assert.equal(api.saved[0].details.validatedReport.version, 'findings-v2');
    assert.equal(events.some(e => e.type === 'cached'), false);
  }
});

test('malformed v2 cache marker cannot publish safe zero in JSON or SSE',async()=>{
 for(const path of ['/analyze','/analyze-stream']){
  const api=routesFor(null,'contract',{cached:{input:'address',network:'mainnet',riskScore:0,verdict:'safe',details:{validatedReport:{version:'findings-v2'}}}});
  const events=[];const response=responseFor(events);
  await api.handlers.get(path)({body:{input:'address',network:'mainnet'},log:{error(){}}},response);
  assert.equal(api.aiCalls,1);assert.equal(api.saved.length,1);assert.equal(events.some(e=>e.type==='cached'),false);
 }
});
test('unknown input is rejected before AI or storage in both routes', async () => {
  const api = routesFor(null, 'unknown');
  for (const path of ['/analyze', '/analyze-stream']) {
    const response = responseFor();
    await api.handlers.get(path)({body: {input: 'invalid', network: 'mainnet'}, log: {error() {}}}, response);
    assert.equal(response.code, 400);
  }
  assert.equal(api.aiCalls, 0); assert.equal(api.saved.length, 0); assert.equal(api.cacheWrites, 0);
});

test('missing transaction data stops both routes before AI, persistence, cache or a verdict', async () => {
  const api = routesFor(null);
  for (const path of ['/analyze', '/analyze-stream']) {
    const events = [];
    const response = { code: 200, ended: false, status(code) { this.code = code; return this; }, json(body) { this.body = body; }, setHeader() {}, flushHeaders() {}, end() { this.ended = true; }, write(line) { events.push(JSON.parse(line.slice(6))); } };
    await api.handlers.get(path)({ body: { input: 'hash', network: 'mainnet', fresh: true }, log: { error() {} } }, response);
    if (path === '/analyze') {
      assert.equal(response.code, 503);
      assert.equal(response.body.error, 'transaction_data_unavailable');
      assert.equal(response.body.riskScore, undefined);
    } else {
      assert.equal(events.find(event => event.type === 'error')?.code, 'transaction_data_unavailable');
      assert.equal(events.some(event => ['result', 'metadata', 'done', 'cached'].includes(event.type)), false);
      assert.equal(response.ended, true);
    }
    assert.equal(api.aiCalls, 0);
    assert.equal(api.saved.length, 0);
    assert.equal(api.cacheWrites, 0);
  }
});

test('both analysis routes persist bounded evidence and SSE exposes the same details', async () => {
  const tx = { hash: 'hash', from: 'sender', to: 'target', input: '0x', value: '0x0', blockNumber: '1', destinationVerification: 'unknown', receiptEvidence: { status: 'unavailable', complete: false, transfers: [] }, historicalExample: { name: 'curated example' } };
  const { handlers, saved } = routesFor(tx);
  for (const path of ['/analyze', '/analyze-stream']) {
    const events = [];
    const response = { status() { return this; }, json(body) { this.body = body; }, setHeader() {}, flushHeaders() {}, end() {}, write(line) { events.push(JSON.parse(line.slice(6))); } };
    await handlers.get(path)({ body: { input: 'hash', network: 'mainnet', fresh: true }, log: { error() {} } }, response);
    const details = saved.at(-1).details;
    assert.equal(details.validatedReport?.version, 'findings-v2');
    assert.equal(details.sourceVerification, 'unknown');
    assert.equal(details.rawData.receiptEvidence.status, 'unavailable');
    assert.equal(details.rawData.historicalExample.name, 'curated example');
    if (path === '/analyze-stream') {
      assert.equal(events.find(event => event.type === 'result').result.details.sourceVerification, 'unknown');
      assert.ok(events.some(event => event.type === 'done'));
      assert.equal(events.find(event => event.type === 'result').result.details.validatedReport.version, 'findings-v2');
    } else {
      assert.equal(response.body.details.sourceVerification, 'unknown');
      assert.equal(response.body.patterns, undefined);
      assert.equal(response.body.scoreFactors, undefined);
      assert.equal(response.body.knownEntity, undefined);
    }
  }
});

test('contract SSE includes source evidence before the AI result is emitted', async () => {
  const { handlers } = routesFor(null, 'contract');
  const events = [];
  const response = { status() { return this; }, json() {}, setHeader() {}, flushHeaders() {}, end() {}, write(line) { events.push(JSON.parse(line.slice(6))); } };
  await handlers.get('/analyze-stream')({ body: { input: 'address', network: 'mainnet', fresh: true }, log: { error() {} } }, response);
  assert.equal(events.find(event => event.type === 'result').result.details.sourceVerification, 'unknown');
  assert.ok(events.some(event => event.type === 'done'));
});

test('unsupported network is rejected before schema, lookup or analysis in both routes', async () => {
  const { handlers, saved } = routesFor(null);
  for (const path of ['/analyze', '/analyze-stream']) {
    const response = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    await handlers.get(path)({ body: { input: 'hash', network: 'unsupported' }, log: { error() {} } }, response);
    assert.equal(response.code, 400);
    assert.equal(response.body.error, 'unsupported_network');
  }
  assert.equal(saved.length, 0);
});
