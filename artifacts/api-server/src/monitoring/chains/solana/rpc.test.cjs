const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync, existsSync} = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
function load(fetch) {
  assert.ok(existsSync(`${__dirname}/rpc.ts`), 'bounded Solana RPC module must exist');
  const exports = {};
  const output = ts.transpileModule(readFileSync(`${__dirname}/rpc.ts`, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(output, {exports, require: () => ({TOKEN_PROGRAM_ADDRESS: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', TOKEN_2022_PROGRAM: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', validSolanaAddress: value => typeof value === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)}), fetch, AbortSignal, Response, TextDecoder, TextEncoder, URL, Set});
  return exports;
}
test('RPC accepts only read methods and validates response identity and cluster genesis', async () => {
  const calls = [];
  const module = load(async (url, options) => {
    const req = JSON.parse(options.body); calls.push(req);
    return Response.json({jsonrpc: '2.0', id: req.id, result: req.method === 'getGenesisHash' ? 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG' : {context: {slot: 10}, value: []}});
  });
  const rpc = module.createSolanaRpc('devnet');
  await rpc.verifyCluster();
  const result = await rpc.readAccounts('11111111111111111111111111111111', 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  assert.equal(result.slot, 10);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].params[2].encoding, 'base64');
  assert.equal(calls[1].params[2].commitment, 'finalized');
  await assert.rejects(rpc.call('sendTransaction', []));
  assert.equal(calls.length, 2);
});
test('wrong genesis, malformed IDs, provider error and byte overflow fail closed', async () => {
  for (const response of [{jsonrpc: '2.0', id: 1, result: 'wrong'}, {jsonrpc: '2.0', id: 99, result: 'wrong'}, {jsonrpc: '2.0', id: 1, error: {code: 1}}, 'x'.repeat(524289)]) {
    const module = load(async () => typeof response === 'string' ? new Response(response) : Response.json(response));
    await assert.rejects(module.createSolanaRpc('devnet').verifyCluster());
  }
});
test('cluster/address/program input is constrained; cancellation and HTTP429 are unavailable', async () => {
  let calls = 0;
  const module = load(async () => {calls++; return new Response('', {status: 429});});
  assert.throws(() => module.createSolanaRpc('https://attacker.invalid'));
  const rpc = module.createSolanaRpc('devnet');
  await assert.rejects(rpc.readAccounts('bad', 'bad'));
  assert.equal(calls, 0);
  await assert.rejects(rpc.verifyCluster());
  const controller = new AbortController(); controller.abort();
  const aborted = module.createSolanaRpc('devnet', controller.signal);
  await assert.rejects(aborted.verifyCluster());
  assert.equal(calls, 1);
});
