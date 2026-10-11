const {test} = require('node:test');
const assert = require('node:assert/strict');
const {existsSync, readFileSync} = require('node:fs');
const {createRequire} = require('node:module');
const ts = require('typescript');
const vm = require('node:vm');
const zodRequire = createRequire(`${__dirname}/../../lib/api-zod/package.json`);
function compile(file, require) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText, {exports, require, Date, Set, BigInt});
  return exports;
}
function load() {
  const file = `${__dirname}/src/lib/solana-report.ts`; assert.ok(existsSync(file), 'client report validator must exist');
  const api = compile(`${__dirname}/../../lib/api-zod/src/generated/api.ts`, zodRequire);
  return compile(file, name => name === '@workspace/api-zod' ? api : zodRequire(name));
}
const wallet = '11111111111111111111111111111111';
const legacy = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const token2022 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
function fixture() {return {reportVersion: 'solana-manual-v1', wallet, cluster: 'devnet', generatedAt: new Date().toISOString(), status: 'no_delegates_found', commitment: 'finalized', slotRange: {min: 100, max: 101}, coverage: [{program: legacy, status: 'complete', reason: 'supported_scope_checked', slot: 100, accountCount: 0}, {program: token2022, status: 'complete', reason: 'no_token2022_accounts_returned', slot: 101, accountCount: 0}], accountsChecked: 0, delegates: [], limitations: ['Read-only scope.']};}
test('generated response validation binds wallet/cluster and rejects malformed or contradictory successful JSON', () => {
  const parse = load().parseSolanaReport;
  assert.ok(parse(fixture(), wallet, 'devnet'));
  assert.equal(parse(fixture(), wallet, 'mainnet-beta'), null);
  assert.equal(parse(fixture(), 'So11111111111111111111111111111111111111112', 'devnet'), null);
  for (const change of [r => delete r.coverage, r => r.coverage[0].slot = -1, r => r.coverage[1].program = legacy, r => r.coverage[0].status = 'unavailable', r => r.slotRange.min = 102, r => r.accountsChecked = 1, r => r.generatedAt = 'invalid', r => r.generatedAt = '2020-01-01T00:00:00.000Z']) {
    const value = fixture(); change(value); assert.equal(parse(value, wallet, 'devnet'), null);
  }
});
test('partial and unavailable are accepted only with consistent coverage; delegates cannot forge spendable units', () => {
  const parse = load().parseSolanaReport;
  const partial = fixture(); partial.status = 'partial'; partial.coverage[1].status = 'unsupported'; partial.coverage[1].accountCount = 1;
  assert.ok(parse(partial, wallet, 'devnet'));
  const unavailable = fixture(); unavailable.status = 'unavailable'; unavailable.slotRange = null; unavailable.coverage.forEach(c => {c.status = 'unavailable'; c.slot = null; c.accountCount = null;});
  assert.ok(parse(unavailable, wallet, 'devnet'));
  const review = fixture(); review.status = 'review'; review.accountsChecked = 1; review.coverage[0].accountCount = 1;
  review.delegates.push({account: wallet, mint: 'So11111111111111111111111111111111111111112', program: legacy, delegate: 'Vote111111111111111111111111111111111111111', balanceRaw: '500', delegatedRaw: '250', spendableRaw: '250', state: 'initialized', slot: 100, reviewReason: 'ordinary_delegate_review'});
  assert.ok(parse(review, wallet, 'devnet'));
  review.delegates[0].spendableRaw = '500'; assert.equal(parse(review, wallet, 'devnet'), null);
});
