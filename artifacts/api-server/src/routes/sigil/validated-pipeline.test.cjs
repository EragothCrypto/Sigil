const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');
const vm = require('node:vm');
const { test } = require('node:test');
function load(create) {
  const context = vm.createContext({ hexWeiToEth: () => '0 ETH', lookupEntity: () => null, getSigilAiModel: () => 'deepseek/deepseek-v4-flash', openai: { chat: { completions: { create } } } });
  for (const file of ['validated-findings', 'ai-analyzer']) vm.runInContext(stripTypeScriptTypes(readFileSync(`${__dirname}/${file}.ts`, 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '')), context);
  return context;
}
const tx = { to: `0x${'1'.repeat(40)}`, input: '0x', status: '0x1', inclusionStatus: 'mined', destinationHasCode: true, destinationVerification: 'verified', receiptEvidence: { status: 'available', complete: true, transfers: [] } };
test('stream emits only steps and one server-rendered validated result, never raw tokens or model score', async () => {
  const requests = [];
  const api = load(async request => {
    requests.push(request);
    if (!request.stream) return { choices: [{ message: { content: '{"findingIds":[]}' }, finish_reason: 'stop' }] };
    return (async function* () { yield { choices: [{ delta: { content: '{"finding' } }] }; yield { choices: [{ delta: { content: 'Ids":[]}' }, finish_reason: 'stop' }] }; })();
  });
  const events = [];
  const result = await api.analyzeTransactionStreaming(tx, null, 'mainnet', 'hash', event => events.push(event));
  assert.equal(result.validatedReport.version, 'findings-v1');
  assert.equal(events.filter(e => e.type === 'result').length, 1);
  assert.equal(events.some(e => ['token', 'metadata'].includes(e.type)), false);
  assert.equal(requests[0].max_completion_tokens, 4096);
  assert.equal(requests[1].max_completion_tokens, 12288);
  assert.equal(requests[1].stream_options.include_usage, true);
});
test('either stage rejects a forged free-text verdict and never emits a result', async () => {
  for (const badStage of [1, 2]) {
    let calls = 0;
    const events = [];
    const api = load(async request => {
      const content = ++calls === badStage ? '{"findingIds":[],"summary":"well-audited guaranteed safe","riskScore":1}' : '{"findingIds":[]}';
      if (!request.stream) return { choices: [{ message: { content }, finish_reason: 'stop' }] };
      return (async function* () { yield { choices: [{ delta: { content }, finish_reason: 'stop' }] }; })();
    });
    await assert.rejects(api.analyzeTransactionStreaming(tx, null, 'mainnet', 'hash', e => events.push(e)), e => e.code === 'analysis_unreliable');
    assert.equal(calls, badStage);
    assert.equal(events.some(e => e.type === 'result'), false);
  }
});
test('length plus trailing transport error is not retried and retains numeric usage/phase', async () => {
  let calls = 0;
  const api = load(async request => {
    calls++;
    if (!request.stream) return { choices: [{ message: { content: '{"findingIds":[]}' }, finish_reason: 'stop' }] };
    return (async function* () { yield { choices: [{ delta: {}, finish_reason: 'length' }], usage: { completion_tokens: 12288, completion_tokens_details: { reasoning_tokens: 12000 } } }; throw new Error('trailer failure'); })();
  });
  await assert.rejects(api.analyzeTransactionStreaming(tx, null, 'mainnet', 'hash', () => {}), e => e.code === 'truncated_ai_output' && e.phase === 'verdict' && e.reasoningTokens === 12000);
  assert.equal(calls, 2);
});
test('non-streaming contract follows the same validation contract', async () => {
  const api = load(async () => ({ choices: [{ message: { content: '{"findingIds":[]}' }, finish_reason: 'stop' }] }));
  const result = await api.analyzeContract({ address: tx.to, verificationStatus: 'unknown' }, 'mainnet');
  assert.equal(result.validatedReport.version, 'findings-v1');
  assert.equal(result.riskScore, 35);
});
