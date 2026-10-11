const {test} = require('node:test');
const assert = require('node:assert/strict');
const {existsSync, readFileSync} = require('node:fs');
const {EventEmitter} = require('node:events');
const ts = require('typescript');
const vm = require('node:vm');
function load(rpc) {
  const file = `${__dirname}/solana-monitor.ts`; assert.ok(existsSync(file), 'Solana route must exist');
  const exports = {}; const routes = [];
  const output = ts.transpileModule(readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  const wallet = '11111111111111111111111111111111';
  vm.runInNewContext(output, {exports, AbortController, require: name => name === 'express' ? {Router: () => ({post: (path, handler) => routes.push({path, handler})})} : name.includes('rpc') ? {createSolanaRpc: () => rpc} : name.includes('@solana-program') ? {TOKEN_PROGRAM_ADDRESS: 'legacy'} : {validSolanaAddress: value => value === wallet, TOKEN_2022_PROGRAM: 'token2022', evaluateSolanaWallet: (wallet, cluster, reads) => ({wallet, cluster, reads})}});
  return {exports, routes};
}
test('genesis failure establishes no account result and never becomes empty success', async () => {
  let reads = 0;
  const {exports} = load({verifyCluster: async () => {throw Error('secret provider payload');}, readAccounts: async () => {reads++;}});
  const report = await exports.scanSolanaWallet('11111111111111111111111111111111', 'devnet');
  assert.equal(reads, 0);
  assert.equal(report.reads.legacy.reason, 'solana_cluster_unavailable');
  assert.equal(report.reads.token2022.reason, 'solana_cluster_unavailable');
});
test('both token programs queried, individual failure remains scoped unavailable', async () => {
  const programs = [];
  const {exports} = load({verifyCluster: async () => {}, readAccounts: async (_, program) => {programs.push(program); if (program === 'token2022') throw Error(); return {slot: 1, accounts: []};}});
  const report = await exports.scanSolanaWallet('11111111111111111111111111111111', 'devnet');
  assert.deepEqual(programs.sort(), ['legacy', 'token2022']);
  assert.equal(report.reads.legacy.slot, 1);
  assert.equal(report.reads.token2022.reason, 'solana_rpc_unavailable');
});
test('route rejects invalid body before outbound work and sends no-store report for valid context', async () => {
  let reads = 0;
  const {routes} = load({verifyCluster: async () => {reads++;}, readAccounts: async () => ({slot: 1, accounts: []})});
  assert.equal(routes[0].path, '/monitor/v2/solana/scan');
  for (const body of [null, {}, {wallet: 'bad', cluster: 'devnet'}, {wallet: '11111111111111111111111111111111', cluster: 'http://attacker.invalid'}]) {
    const req = Object.assign(new EventEmitter(), {body}); const res = Object.assign(new EventEmitter(), {code: 200, status(code) {this.code = code; return this;}, json(value) {this.payload = value;}});
    await routes[0].handler(req, res); assert.equal(res.code, 400);
  }
  assert.equal(reads, 0);
  const req = Object.assign(new EventEmitter(), {body: {wallet: '11111111111111111111111111111111', cluster: 'devnet'}});
  const res = Object.assign(new EventEmitter(), {set(name, value) {this.header = [name, value]; return this;}, json(value) {this.payload = value;}});
  await routes[0].handler(req, res);
  assert.equal(res.payload.cluster, 'devnet');
  assert.deepEqual(res.header, ['Cache-Control', 'no-store']);
});
