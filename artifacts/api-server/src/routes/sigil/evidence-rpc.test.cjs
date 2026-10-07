const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {stripTypeScriptTypes} = require('node:module');
function load(fetcher, endpoints = ['https://one.invalid', 'https://two.invalid'], abortApi = AbortSignal) {
  const context = vm.createContext({fetch: fetcher, AbortSignal: abortApi, TextDecoder, TextEncoder, Date, getEvidenceEndpoints: () => endpoints});
  const path = `${__dirname}/evidence-rpc.ts`;
  if (!fs.existsSync(path)) return {};
  vm.runInContext(stripTypeScriptTypes(fs.readFileSync(path, 'utf8').replace(/^import .*\r?\n/gm, '').replace(/export /g, '')), context);
  return context;
}
const reply = (body) => new Response(JSON.stringify(body), {status: 200});
test('evidence transport retries bounded endpoints and validates RPC identity', async () => {
  let count = 0;
  const api = load(async (_url, options) => { const request = JSON.parse(options.body); count++; return reply({jsonrpc:'2.0', id: count === 1 ? 999 : request.id, result:'0x1'}); });
  assert.equal(typeof api.createEvidenceRpc, 'function');
  const rpc = api.createEvidenceRpc('mainnet');
  assert.equal(await rpc.call('eth_blockNumber', [], value => value === '0x1'), '0x1');
  assert.equal(count, 2);
});
test('shared budget caps all calls and rejects signing without a request', async () => {
  let count = 0;
  const api = load(async (_url, options) => {count++; return reply({jsonrpc:'2.0', id:JSON.parse(options.body).id,result:'0x1'});});
  assert.equal(typeof api.createEvidenceRpc, 'function');
  const rpc = api.createEvidenceRpc('mainnet');
  await assert.rejects(rpc.call('eth_sendTransaction', [{}]));
  assert.equal(count, 0);
  for (let i=0;i<32;i++) await rpc.call('eth_blockNumber', []);
  await assert.rejects(rpc.call('eth_blockNumber', []), /budget/);
  assert.equal(count,32);
});
test('oversized response, missing result and aborted caller never become evidence', async () => {
  const api = load(async () => new Response('x'.repeat(524289)));
  assert.equal(typeof api.createEvidenceRpc, 'function');
  await assert.rejects(api.createEvidenceRpc('mainnet').call('eth_getCode', ['0x'+'1'.repeat(40), 'latest']));
  const missing = load(async (_url, options) => reply({jsonrpc:'2.0',id:JSON.parse(options.body).id}));
  await assert.rejects(missing.createEvidenceRpc('mainnet').call('eth_blockNumber', []));
  const abort = new AbortController(); abort.abort();
  await assert.rejects(missing.createEvidenceRpc('mainnet', abort.signal).call('eth_blockNumber', []));
});
test('RPC input budget measures UTF8 bytes before making a request',async()=>{
 let calls=0;const api=load(async()=>{calls++;return reply({});});
 await assert.rejects(api.createEvidenceRpc('mainnet').call('eth_call',[{data:'界'.repeat(30000)}]),/input exceeds/);assert.equal(calls,0);
});

test('shared deadline stops retries and per-request timeouts stay bounded', async () => {
  const globalDeadline = new AbortController();
  const timeouts = [];
  let requests = 0;
  const abortApi = {
    timeout(ms) { timeouts.push(ms); return ms === 20000 ? globalDeadline.signal : new AbortController().signal; },
    any(signals) { return AbortSignal.any(signals); },
  };
  const api = load(async () => { requests++; globalDeadline.abort(); throw new Error('Timed out'); }, undefined, abortApi);
  const rpc = api.createEvidenceRpc('mainnet');
  await assert.rejects(rpc.call('eth_blockNumber', []), /budget/);
  await assert.rejects(rpc.call('eth_blockNumber', []), /budget/);
  assert.equal(requests, 1);
  assert.deepEqual(timeouts, [20000, 6000]);
});

test('maximum accepted execution calldata reaches eth_call through the real transport', async () => {
  const execution = vm.createContext({Buffer});
  vm.runInContext(stripTypeScriptTypes(fs.readFileSync(`${__dirname}/execution-check.ts`, 'utf8').replace(/^import .*\r?\n/gm, '').replace(/export /g, '')), execution);
  const requests = [];
  const api = load(async (_url, options) => {
    const request = JSON.parse(options.body); requests.push(request);
    return reply({jsonrpc:'2.0', id:request.id, result:request.method === 'eth_blockNumber' ? '0x1' : '0x'});
  });
  const data = `0x${'aa'.repeat(32768)}`;
  const address = `0x${'11'.repeat(20)}`;
  const input = execution.parseExecutionInput({rawData:JSON.stringify({to:address,from:address,data,value:'0x'+ 'f'.repeat(64),gas:'0x'+ 'f'.repeat(64)})});
  assert.ok(input);
  const result = await execution.checkExecution(input, api.createEvidenceRpc('mainnet'));
  assert.equal(result.assessmentStatus, 'call_check');
  assert.deepEqual(requests.map(r => r.method), ['eth_blockNumber', 'eth_call']);
  assert.equal(requests[1].params[0].data, data);
});
