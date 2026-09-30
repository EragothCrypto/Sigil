const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('../../../../../node_modules/typescript');
const { test } = require('node:test');

function routesFor(tx, inputType = 'transaction') {
  const handlers = new Map();
  const saved = [];
  let aiCalls = 0;
  let cacheWrites = 0;
  const verdict = { summary: 'Evidence summary', verdict: 'caution', verdictReason: 'Review evidence', riskScore: 40, riskLevel: 'medium', warnings: [], positives: [] };
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
    './ai-analyzer.js': {
      AIAnalysisOutputError: class extends Error {},
      analyzeTransaction: async () => { aiCalls++; return verdict; },
      analyzeTransactionStreaming: async (_tx, _method, _network, _input, emit) => { aiCalls++; emit({ type: 'result', result: verdict }); return verdict; },
      analyzeContractStreaming: async (_contract, _network, emit) => { emit({ type: 'result', result: verdict }); return verdict; },
    },
    './known-entities.js': { lookupEntity: () => null },
    './contract-reputation.js': { calculateContractReputation: async () => ({ tier: 'unproven', trustScore: 0, isExploited: false }) },
    './pattern-detector.js': { detectPatterns: () => [], mergePatterns: () => [] },
    './score-factors.js': { computeScoreFactors: () => [] },
    './analysis-cache.js': { cacheKey: () => 'test', analysisCache: { get() {}, set() { cacheWrites++; } } },
    './analysis-schema.js': { ensureAnalysesSchema: async () => {} },
  };
  const source = ts.transpileModule(readFileSync(`${__dirname}/index.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports: {}, require: name => modules[name] ?? {}, process: { env: {} } });
  return { handlers, saved, get aiCalls() { return aiCalls; }, get cacheWrites() { return cacheWrites; } };
}

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
    assert.equal(details.sourceVerification, 'unknown');
    assert.equal(details.rawData.receiptEvidence.status, 'unavailable');
    assert.equal(details.rawData.historicalExample.name, 'curated example');
    if (path === '/analyze-stream') {
      assert.equal(events.find(event => event.type === 'result').result.details.sourceVerification, 'unknown');
      assert.ok(events.some(event => event.type === 'done'));
    } else assert.equal(response.body.details.sourceVerification, 'unknown');
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
