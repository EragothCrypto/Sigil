const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

const api = {};
vm.runInNewContext(ts.transpileModule(readFileSync(path.join(__dirname, 'src/lib/watchlist.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: api });
const entry = { id: 'synthetic', label: 'Synthetic import', address: `0x${'1'.repeat(40)}`,
  network: 'mainnet', kind: 'wallet', status: 'clean', coverageStatus: 'limited',
  approvalSummary: { healthScore: 100, totalActive: 0, unlimited: 0, critical: 0, high: 0 } };
const imported = patch => api.importWatchlistEntries([{ ...entry, ...patch }])[0];

test('saved positive status without usable coverage is not evidence', () => {
  for (const coverageStatus of [undefined, null, 'invalid']) {
    assert.equal(imported({ coverageStatus }).status, 'unchecked');
    assert.equal(imported({ coverageStatus }).coverageStatus, undefined);
  }
  assert.equal(imported({ approvalSummary: undefined }).status, 'unchecked');
  assert.equal(imported({ approvalSummary: undefined }).coverageStatus, undefined);
});

test('import validates complete finite nonnegative summary values and rejects inconsistent counts', () => {
  for (const approvalSummary of [null, 'wrong', [], {},
    { ...entry.approvalSummary, healthScore: NaN },
    { ...entry.approvalSummary, healthScore: 101 },
    { ...entry.approvalSummary, totalActive: -1 },
    { ...entry.approvalSummary, totalActive: Number.MAX_SAFE_INTEGER + 1 },
    { ...entry.approvalSummary, unlimited: 0.5 },
    { ...entry.approvalSummary, high: '0' },
    { ...entry.approvalSummary, high: 1 },
    { ...entry.approvalSummary, unlimited: 1 }]) {
    const result = imported({ approvalSummary });
    assert.equal(result.approvalSummary, undefined);
    assert.equal(result.status, 'unchecked');
    assert.equal(result.coverageStatus, undefined);
  }
});

test('consistent saved coverage derives event status from validated counts instead of an unrelated label', () => {
  const summary = { healthScore: 10, totalActive: 3, unlimited: 1, critical: 1, high: 1 };
  assert.equal(imported({ approvalSummary: summary }).status, 'high-risk');
  assert.equal(imported({ status: 'high-risk' }).status, 'clean');
  assert.equal(imported({ approvalSummary: { ...summary, high: 0, critical: 0 } }).status, 'review');
});

test('unavailable and unchecked markers cannot promote retained summaries into current coverage', () => {
  assert.equal(imported({ coverageStatus: 'unavailable' }).status, 'unavailable');
  assert.equal(imported({ status: 'unavailable' }).coverageStatus, 'unavailable');
  assert.equal(imported({ status: 'unchecked' }).coverageStatus, undefined);
});

test('malformed address values do not abort import of later valid entries', () => {
  const result = api.importWatchlistEntries([null, { ...entry, address: 123 }, { ...entry, address: {} }, entry]);
  assert.equal(result.length, 1);
  assert.equal(result[0].address, entry.address);
});

test('duplicate imported ids cannot alias updates for different wallets', () => {
  const result = api.importWatchlistEntries([entry, { ...entry, address: `0x${'2'.repeat(40)}` },
    { ...entry, id: `mainnet:0x${'2'.repeat(40)}`, address: `0x${'3'.repeat(40)}` }]);
  assert.equal(new Set(result.map(item => item.id)).size, 3);
  const next = api.updateWatchlistEntry(result, { ...result[0], status: 'unavailable' });
  assert.equal(next.filter(item => item.status === 'unavailable').length, 1);
});

test('valid exported entries remain round-trip compatible without extra unvalidated summary properties', () => {
  const result = imported({ approvalSummary: { ...entry.approvalSummary, fabricated: 'not a report field' } });
  assert.equal(result.approvalSummary.fabricated, undefined);
  const again = api.importWatchlistEntries(JSON.parse(api.exportWatchlistEntries([result])))[0];
  assert.equal(again.id, entry.id);
  assert.equal(again.status, 'clean');
  assert.equal(again.approvalSummary.healthScore, 100);
  const demo = api.importWatchlistEntries(JSON.parse(readFileSync(path.join(__dirname, '../../docs/fixtures/p00-watchlist-import.json'), 'utf8')));
  assert.equal(demo.map(item => item.status).join(','), 'unchecked,unavailable,high-risk');
  assert.equal(new Set(demo.map(item => item.id)).size, 3);
});

test('merging an import preserves existing identity and cannot alias or replace another saved wallet', () => {
  const old = api.importWatchlistEntries([entry]);
  const result = api.mergeWatchlistEntries(old, [{ ...entry, address: `0x${'2'.repeat(40)}` },
    { ...entry, label: 'Duplicate address must not replace existing' }]);
  assert.equal(result.length, 2);
  const existing = result.find(item => item.address === entry.address);
  const incoming = result.find(item => item.address !== entry.address);
  assert.equal(existing.id, entry.id);
  assert.equal(existing.label, entry.label);
  assert.notEqual(incoming.id, existing.id);
  const updated = api.updateWatchlistEntry(result, { ...incoming, status: 'unavailable' });
  assert.equal(updated.find(item => item.address === entry.address).status, 'clean');
  const removed = api.removeWatchlistEntry(updated, incoming.id);
  assert.equal(removed.length, 1);
  assert.equal(removed[0].address, entry.address);
  assert.equal(api.importWatchlistEntries(JSON.parse(api.exportWatchlistEntries(updated))).length, 2);
});

test('merge preserves multi-entry prepend order and resolves fallback suffix collisions', () => {
  const incomingAddress = `0x${'2'.repeat(40)}`;
  const fallback = `mainnet:${incomingAddress}`;
  const existing = api.importWatchlistEntries([{ ...entry, id: fallback },
    { ...entry, id: `${fallback}:1`, address: `0x${'3'.repeat(40)}` }]);
  const otherAddress = `0x${'4'.repeat(40)}`;
  const merged = api.mergeWatchlistEntries(existing, [{ ...entry, id: fallback, address: incomingAddress },
    { ...entry, id: fallback, address: otherAddress }]);
  assert.equal(merged.map(item => item.address).join(','), [otherAddress, incomingAddress, entry.address, existing[1].address].join(','));
  assert.equal(merged.find(item => item.address === incomingAddress).id, `${fallback}:2`);
  assert.equal(new Set(merged.map(item => item.id)).size, 4);
  assert.equal(merged.find(item => item.address === entry.address).id, fallback);
});

test('saved summary fallback copy does not mislabel recorded data as an unchecked scan', () => {
  for (const page of ['watchlist', 'wallet-monitor']) {
    const source = readFileSync(path.join(__dirname, `src/pages/${page}.tsx`), 'utf8');
    assert.ok(source.includes('Saved event summary; not a verified scan or current allowance assessment.'));
    assert.ok(source.includes('Saved scan coverage is unavailable; no current allowance assessment.'));
  }
});
