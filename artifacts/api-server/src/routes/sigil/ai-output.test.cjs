const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');
const vm = require('node:vm');
const { test } = require('node:test');
const {APIConnectionTimeoutError}=require('../../../../../lib/integrations-openai-ai-server/node_modules/openai');
function load(create, model = 'deepseek/deepseek-v4-flash', deadlineMs) {
  const context = vm.createContext({ Buffer, AbortController, AbortSignal, setTimeout: deadlineMs ? (fn,ms)=>setTimeout(fn,Math.min(ms,deadlineMs)) : setTimeout, clearTimeout, lookupIncident: () => undefined, toFunctionSelector: require('../../../node_modules/viem').toFunctionSelector, lookupEntity: () => null, getSigilAiModel: () => model, openai: { chat: { completions: { create } } } });
  context.APIConnectionTimeoutError=APIConnectionTimeoutError;
  for (const file of ['analysis-deadline', 'validated-findings', 'ai-analyzer']) vm.runInContext(stripTypeScriptTypes(readFileSync(`${__dirname}/${file}.ts`, 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '')), context);
  return context;
}
const contract = { address: `0x${'1'.repeat(40)}`, verificationStatus: 'verified' };
const reply = content => ({ choices: [{ message: { content }, finish_reason: 'stop' }] });

test('SDK timeout in either phase produces explicit timeout without fallback',async()=>{
 for(const phase of ['signals','verdict']){
  let calls=0;const events=[];
   const api=load(async request=>{calls++;if(phase==='signals'||request.stream)throw new APIConnectionTimeoutError();return reply('{"findingIds":[]}');});
  await assert.rejects(api.analyzeContractStreaming(contract,'mainnet',e=>events.push(e)),e=>e.code==='analysis_timeout');
  assert.equal(calls,phase==='signals'?1:2);assert.equal(events.some(e=>e.type==='result'),false);
 }
});

test('AI deadline stops uncooperative request or stream without fallback or result',{timeout:2000},async()=>{
 for(const phase of ['signals','verdict']){
  let calls=0;const events=[];const options=[];
  const api=load(async(request,opts)=>{
   calls++;options.push(opts);
   if(phase==='signals')return new Promise(()=>{});
   if(!request.stream)return reply('{"findingIds":[]}');
   return (async function*(){await new Promise(()=>{});})();
  },'deepseek/deepseek-v4-flash',20);
  await assert.rejects(api.analyzeContractStreaming(contract,'mainnet',e=>events.push(e)),e=>e.code==='analysis_timeout');
  assert.equal(calls,phase==='signals'?1:2);assert.equal(events.some(e=>e.type==='result'),false);
  for(const opts of options){assert.equal(opts.signal.aborted,true);assert.equal(opts.maxRetries,0);}
 }
});
test('non-streaming and streaming keep configured completion ceilings', async () => {
  for (const streaming of [false, true]) {
    const requests = [];
    const api = load(async request => {
      requests.push(request);
      if (!request.stream) return reply('{"findingIds":[]}');
      return (async function* () { yield { choices: [{ delta: { content: '{"findingIds":[]}' }, finish_reason: 'stop' }] }; })();
    });
    if (streaming) await api.analyzeContractStreaming(contract, 'mainnet', () => {});
    else await api.analyzeContract(contract, 'mainnet');
    assert.equal(requests[0].max_completion_tokens, 4096);
    assert.equal(requests[1].max_completion_tokens, 12288);
    assert.equal(requests.length, 2);
  }
  const other = load(async () => reply('{"findingIds":[]}'), 'other/model');
  assert.equal(other.completionTokenBudget('signals'), 700);
  assert.equal(other.completionTokenBudget('verdict'), 2048);
});
test('signal truncation stops before a second call and exposes numeric diagnostics only', async () => {
  let calls = 0;
  const api = load(async () => { calls++; return { choices: [{ message: { content: 'private content' }, finish_reason: 'length' }], usage: { completion_tokens: 4096, completion_tokens_details: { reasoning_tokens: 4000 } } }; });
  await assert.rejects(api.analyzeContract(contract, 'mainnet'), error => {
    assert.equal(error.code, 'truncated_ai_output'); assert.equal(error.phase, 'signals');
    assert.equal(error.reasoningTokens, 4000); assert.equal(error.tokenLimit, 4096);
    assert.doesNotMatch(JSON.stringify(error), /private/); return true;
  });
  assert.equal(calls, 1);
});
test('usage-only trailer is captured before verdict truncation rejection', async () => {
  const api = load(async request => request.stream ? (async function* () {
    yield { choices: [{ delta: {}, finish_reason: 'length' }] };
    yield { choices: [], usage: { completion_tokens: 12288, completion_tokens_details: { reasoning_tokens: 12200 } } };
  })() : reply('{"findingIds":[]}'));
  await assert.rejects(api.analyzeContractStreaming(contract, 'mainnet', () => {}), e => e.phase === 'verdict' && e.completionTokens === 12288 && e.reasoningTokens === 12200);
});
test('only nonterminal stream transport failure uses the bounded fallback', async () => {
  for (const reason of [null, 'stop', 'length']) {
    let calls = 0;
    const api = load(async request => {
      calls++;
      if (!request.stream) return reply('{"findingIds":[]}');
      return (async function* () { if (reason) yield { choices: [{ delta: { content: '{"findingIds":[]}' }, finish_reason: reason }] }; throw new Error('trailer unavailable'); })();
    });
    if (reason === 'length') await assert.rejects(api.analyzeContractStreaming(contract, 'mainnet', () => {}), e => e.code === 'truncated_ai_output');
    else await api.analyzeContractStreaming(contract, 'mainnet', () => {});
    assert.equal(calls, reason === null ? 3 : 2);
  }
});
test('missing finish, malformed JSON, prose and old verdict schema are rejected without retry', async () => {
  for (const content of ['', '{}', 'null', '```json\n{"findingIds":[]}\n```', '{"verdict":"safe","riskScore":0}', '{"findingIds":["invented"]}']) {
    let calls = 0;
    const api = load(async () => { calls++; return reply(content); });
    await assert.rejects(api.analyzeContract(contract, 'mainnet'), e => e.code === 'analysis_unreliable');
    assert.equal(calls, 1);
  }
  const api = load(async () => ({ choices: [{ message: { content: '{"findingIds":[]}' } }] }));
  await assert.rejects(api.analyzeContract(contract, 'mainnet'), e => e.code === 'analysis_unreliable');
});
test('oversized streaming output is bounded and never published or retried', async () => {
  let calls = 0;
  const events = [];
  const api = load(async request => {
    calls++;
    if (!request.stream) return reply('{"findingIds":[]}');
    return (async function* () { yield { choices: [{ delta: { content: 'x'.repeat(9000) } }] }; throw new Error('disconnect'); })();
  });
  await assert.rejects(api.analyzeContractStreaming(contract, 'mainnet', e => events.push(e)), e => e.code === 'analysis_unreliable');
  assert.equal(calls, 2); assert.equal(events.some(e => e.type === 'result'), false);
});
test('null transaction and invalid input have no model call or fabricated score', async () => {
  const api = load(async () => { throw new Error('unexpected call'); });
  await assert.rejects(api.analyzeTransaction(null, null, 'mainnet', 'hash'), e => e.code === 'analysis_unreliable');
  await assert.rejects(api.analyzeUnknown('invalid', 'mainnet'), e => e.code === 'analysis_unreliable');
});
test('absent or invalid usage remains unknown rather than zero', () => {
  const api = load();
  for (const value of [undefined, null, -1, Infinity, 'raw secret', 1.5]) assert.equal(api.safeTokenCount(value), undefined);
  assert.equal(api.safeTokenCount(0), 0);
});
test('Tornado registry remains historical delisting, not a current blanket sanction', () => {
  const context = vm.createContext({});
  vm.runInContext(stripTypeScriptTypes(readFileSync(`${__dirname}/known-entities.ts`, 'utf8').replace(/export /g, '')), context);
  const entity = context.lookupEntity('0xa160cdab225685da1d56aa342ad8841c3b53f291');
  assert.equal(entity.trustLevel, 'caution'); assert.match(entity.description, /March 21, 2025/);
});
