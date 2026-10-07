const assert = require('node:assert/strict');
const { test } = require('node:test');
const core = require('./core.js');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const capabilities = { readOnlyCall: true, internalTraces: false, walletBalanceDeltas: false,
  storageSimulation: false, permissionState: false, historicalArchive: false };
function report(status) {
  return { reportVersion: 'execution-check-v2', assessmentStatus: status, network: 'mainnet',
    summary: 'Bounded check only.', limitations: ['Not signing clearance.'], capabilities };
}
test('execution consumers discriminate and reject legacy or forged outcome reports', () => {
  for (const status of ['advisory_only', 'unavailable', 'call_check']) {
    const payload = report(status);
    if (status === 'call_check') payload.callCheck = { outcome: 'success', blockNumber: '0x1', to: `0x${'11'.repeat(20)}` };
    const accepted = core.readExecutionReport(payload);
    assert.equal(accepted.assessmentStatus, status);
    assert.equal('riskScore' in accepted, false);
    for (const key of ['riskScore', 'verdict', 'riskLevel', 'assetChanges', 'permissionsGranted']) {
      assert.equal(core.readExecutionReport({ ...payload, [key]: key === 'riskScore' ? 0 : [] }), null);
    }
  }
  for (const bad of [{ verdict: 'safe', riskScore: 0 }, report('safe'), { ...report('call_check') },
    { ...report('unavailable'), callCheck: {} }, { ...report('unavailable'), capabilities: { ...capabilities, walletBalanceDeltas: true } }]) {
    assert.equal(core.readExecutionReport(bad), null);
  }
});
test('cached old simulation sessions cannot reappear as safe or zero-risk', () => {
  const summary = core.summarizeSessionEvents([{ inputKind: 'simulation', verdict: 'safe', riskScore: 0, warnings: [] }]);
  assert.equal(summary.highestVerdict, 'review');
  assert.equal(summary.maxRiskScore, null);
});
test('execution history and sessions never turn absent scores into zero-safe', () => {
  const input = { kind: 'simulation', value: 'prompt' };
  for (const result of [report('unavailable'), report('advisory_only'), { summary: 'Local fallback', verdict: 'caution', riskScore: 45 }]) {
    const entry = core.createHistoryEntry({ method: 'personal_sign', url: 'https://example.com', input, result });
    assert.equal(entry.riskScore, null);
    assert.equal(entry.verdict, 'review');
    assert.equal(entry.evidenceSource, result.assessmentStatus ? 'remote_bounded_check' : 'local_advisory');
    const event = core.createSessionEvent({ method: 'personal_sign', url: 'https://example.com', input, result });
    assert.equal(event.riskScore, null);
    const summary = core.summarizeSessionEvents([event]);
    assert.equal(summary.maxRiskScore, null);
    assert.equal(summary.highestVerdict, 'review');
  }
});
function popup(response) {
  function element() {
    return { children: [], listeners: {}, value: '', textContent: '', checked: false, className: '',
      classList: { add() {}, remove() {}, toggle() {} },
      addEventListener(name, handler) { this.listeners[name] = handler; },
      append(...children) { this.children.push(...children); },
      appendChild(child) { this.children.push(child); },
      replaceChildren(...children) { this.children = children; },
      querySelectorAll() { return []; } };
  }
  const elements = new Map();
  const calls = [];
  const ctx = vm.createContext({ window: { SigilExtensionCore: core },
    document: { getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); }, createElement: element },
    chrome: { storage: { local: { get: (defaults, cb) => cb(defaults), set: (_, cb) => cb() },
      sync: { get: (defaults, cb) => cb(defaults), set: (_, cb) => cb(), remove: (_, cb) => cb() } } },
    setTimeout() {},
    fetch: async (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return response; },
  });
  const source = readFileSync(`${__dirname}/popup.js`, 'utf8').replace(/\nload\(\);\s*$/, '\n');
  vm.runInContext(source, ctx);
  function text(node) { return [node.textContent, ...node.children.map(text)].join(' '); }
  return { calls, async scan() {
    await vm.runInContext('load()', ctx);
    elements.get('pasteInput').value = 'wallet prompt';
    await elements.get('pasteAnalyzeBtn').listeners.click();
    return text(elements.get('pasteResult'));
  } };
}
test('actual popup handler integrates v2 statuses through core without zero-safe rendering', async () => {
  for (const status of ['advisory_only', 'unavailable', 'call_check']) {
    const payload = report(status);
    if (status === 'call_check') payload.callCheck = { outcome: 'success', blockNumber: '0x1', to: `0x${'11'.repeat(20)}` };
    const ui = popup({ ok: true, status: 200, json: async () => payload });
    const rendered = await ui.scan();
    assert.equal(ui.calls[0].url, `${core.DEFAULT_API_URL}/api/sigil/simulate-v2`);
    assert.equal(ui.calls[0].body.rawData, 'wallet prompt');
    assert.match(rendered, new RegExp(status));
    assert.doesNotMatch(rendered, /Risk 0\/100|Sigil verdict: safe|Permission granted|You will receive/);
  }
});
test('actual popup HTTP422 and legacy safe payload paths remain local advisory only', async () => {
  for (const response of [
    { ok: false, status: 422, json: async () => ({ error: 'execution_analysis_unavailable' }) },
    { ok: true, status: 200, json: async () => ({ verdict: 'safe', riskScore: 0, assetChanges: [] }) },
  ]) {
    const rendered = await popup(response).scan();
    assert.match(rendered, /Local input classification is advisory only/);
    assert.doesNotMatch(rendered, /Risk 0\/100|Sigil verdict: safe|No direct asset changes/);
  }
});
