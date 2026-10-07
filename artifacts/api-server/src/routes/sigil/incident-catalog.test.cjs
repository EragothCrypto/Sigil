const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');
const { test } = require('node:test');
const vm = require('node:vm');

const file = `${__dirname}/incident-catalog.ts`;
const context = vm.createContext({ URL, fetch() { throw new Error('Catalog must be offline'); } });
if (existsSync(file)) vm.runInContext(stripTypeScriptTypes(
  readFileSync(file, 'utf8').replace(/export /g, ''), { mode: 'transform' }), context);
const exploit = '0xc310a0affe2169d1f6feec1c63dbc7f7c62a887fa48795d327d4d2da2d6b111d';
const victim = '0xbe21a9719a4f89f7dc98419f60b247d69780b569cd8869c0031aae000f98cf17';
const recovery = '0xb0308ee113c541e7c6f4623e833417524d68fd6267d23f43d9041f583c14343f';
function catalog() { return vm.runInContext('INCIDENT_CATALOG', context); }
function copy() { return JSON.parse(JSON.stringify(catalog())); }

test('exports the requested offline lookup and validator', () => {
  assert.equal(typeof context.lookupIncident, 'function');
  assert.equal(typeof context.validateIncidentCatalog, 'function');
});
test('exact reviewed Euler mainnet execution retains source-specific claims', () => {
  const entry = context.lookupIncident(exploit, 'mainnet');
  assert.equal(entry.hash, exploit);
  assert.equal(entry.network, 'mainnet');
  assert.equal(entry.name, 'Euler V1 exploit');
  assert.equal(entry.date, '2023-03-13');
  assert.equal(entry.role, 'exploit_execution');
  assert.equal(entry.reviewedAt, '2026-09-30');
  assert.ok(entry.sources.some(s => s.url.startsWith('https://www.euler.finance/') && /first exploit/.test(s.claim)));
  assert.ok(entry.sources.some(s => s.url === `https://etherscan.io/tx/${exploit}` && /16817996/.test(s.claim)));
});
test('wrong chain, near hash, destination and malformed identities never match', () => {
  for (const chain of ['polygon', 'pulsechain', 'sepolia', 'ethereum', '1', '', null, ' mainnet'])
    assert.equal(context.lookupIncident(exploit, chain), undefined);
  for (const hash of [exploit.slice(0, -1) + 'e', exploit.slice(0, -1), ` ${exploit}`, '', null, {}, '0xebc29199c817dc47ba12e3f86102564d640cbf99'])
    assert.equal(context.lookupIncident(hash, 'mainnet'), undefined);
  assert.equal(context.lookupIncident(exploit.toUpperCase().replace('0X', '0x'), 'mainnet').hash, exploit);
});
test('victim and recovery matches are not execution attributions or scores', () => {
  assert.equal(context.lookupIncident(victim, 'mainnet').role, 'victim');
  assert.equal(context.lookupIncident(victim, 'mainnet').date, '2023-03-15');
  assert.equal(context.lookupIncident(recovery, 'mainnet').role, 'recovery');
  assert.equal(context.lookupIncident(recovery, 'mainnet').date, '2023-03-25');
  for (const entry of catalog()) assert.equal('riskScore' in entry, false);
});
test('reviewed catalog is bounded, valid, unique and deeply immutable', () => {
  const entries = catalog();
  assert.equal(entries.length, 3);
  assert.equal(context.validateIncidentCatalog(entries), true);
  assert.ok(Object.isFrozen(entries));
  for (const entry of entries) {
    assert.ok(Object.isFrozen(entry));
    assert.ok(Object.isFrozen(entry.sources));
    for (const source of entry.sources) assert.ok(Object.isFrozen(source));
  }
  const entry = context.lookupIncident(exploit, 'mainnet');
  Reflect.set(entry, 'role', 'victim');
  Reflect.set(entry.sources[0], 'url', 'javascript:alert(1)');
  assert.equal(context.lookupIncident(exploit, 'mainnet').role, 'exploit_execution');
  assert.equal(context.validateIncidentCatalog(entries), true);
});
test('validation rejects unsafe URLs, unbounded text, invalid metadata and duplicates', () => {
  for (const mutate of [
    e => { e[0].hash = '0x1234'; }, e => { e[0].network = 'pulsechain'; },
    e => { e[0].role = 'unconfirmed'; }, e => { e[0].date = '2023-02-30'; },
    e => { e[0].reviewedAt = 'yesterday'; }, e => { e[0].reviewedAt = '2020-01-01'; },
    e => { e[0].name = ''; }, e => { e[0].name = 'n'.repeat(161); },
    e => { e[0].sources = []; }, e => { e[0].sources.push(...e[0].sources, ...e[0].sources); },
    e => { e[0].sources[0].claim = 'x'.repeat(601); }, e => { e[0].sources[0].title = ''; },
    e => { e[0].riskScore = 80; }, e => { e.push(e[0]); },
    e => { e[0].sources[0].url = 'x'.repeat(2049); },
    ...['javascript:alert(1)', 'data:text/html,test', '/relative', 'https://user:pass@example.com', 'https://example.com/\n'].map(url =>
      e => { e[0].sources[0].url = url; }),
  ]) {
    const entries = copy(); mutate(entries);
    assert.equal(context.validateIncidentCatalog(entries), false);
  }
  for (const input of [null, {}, [null], new Array(4).fill(copy()[0])])
    assert.equal(context.validateIncidentCatalog(input), false);
});
test('validation preserves association and other non-execution roles without upgrading them', () => {
  for (const role of ['victim', 'recovery', 'association']) {
    const entries = copy(); entries[0].role = role;
    assert.equal(context.validateIncidentCatalog(entries), true);
    assert.equal(entries[0].role, role);
  }
});
