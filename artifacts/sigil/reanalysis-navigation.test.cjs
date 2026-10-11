const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { stripTypeScriptTypes } = require('node:module');
const freshId = '12345678-1234-4234-8234-123456789abc';

function lifecycle() {
  const source = readFileSync(path.join(__dirname, 'src/pages/analysis.tsx'), 'utf8').replace(/\r\n/g, '\n');
  const callback = source.match(/onSuccess: ([\s\S]*?),\n    \}/)?.[1];
  assert.ok(callback, 'Actual success callback must be available');
  const setup = source.match(/  const reanalyzeRecordId =[\s\S]*?(?=  const \[, setLocation\])/)?.[0];
  const onMutate = source.match(/onMutate: (.+),\n/)?.[1];
  const update = source.match(/(?:if \(currentRecordId\.current !== id\)[\s\S]*?)?currentRecordId\.current = id;/)?.[0];
  const submit = source.match(/reanalyzeRecordId\.current = id;(?:\n    reanalyzeGeneration\.current = navigationGeneration\.current;)?/)?.[0];
  assert.ok(setup && onMutate && update && submit, 'Actual lifecycle and request-context source must exist');
  const effects = [];
  const locations = [];
  const context = vm.createContext({
    id: 'report-a', useRef: value => ({ current: value }), useEffect: effect => effects.push(effect),
    setLocation: value => locations.push(value),
  });
  vm.runInContext(stripTypeScriptTypes(setup), context);
  assert.equal(effects.length, 1, 'Mount setup/cleanup must be registered');
  const cleanup = effects[0]();
  assert.equal(typeof cleanup, 'function');
  const handler = vm.runInContext(`(${callback})`, context);
  return { handler, locations, cleanup,
    submit: () => vm.runInContext(`${submit}\n(${onMutate})()`, context),
    update: id => { context.id = id; vm.runInContext(update, context); },
  };
}

test('current mounted report navigates to its successful fresh result', () => {
  const { handler, locations, submit } = lifecycle();
  handler({ id: freshId }, {}, submit());
  assert.deepEqual(locations, [`/analysis/${freshId}`]);
});

for (const [name, activeId, mounted, context] of [
  ['another report is active', 'report-b', true, { reportId: 'report-a' }],
  ['page was unmounted', 'report-a', false, { reportId: 'report-a' }],
  ['request context is absent', 'report-a', true, undefined],
  ['request has no submitted report', 'report-a', true, { reportId: null }],
]) {
  test(`late success does not navigate when ${name}`, () => {
    const instance = lifecycle();
    const requestContext = instance.submit();
    instance.update(activeId);
    if (!mounted) instance.cleanup();
    instance.handler({ id: freshId }, {}, context === undefined ? undefined : context.reportId === null ? { reportId: null } : requestContext);
    const { locations } = instance;
    assert.deepEqual(locations, []);
  });
}

for (const [name, response] of [
  ['null body', null], ['missing ID', {}], ['array body', [{ id: freshId }]],
  ['numeric ID', { id: 123 }], ['legacy numeric string', { id: '123' }],
  ['path injection', { id: `${freshId}/../other?cached=1` }],
  ['wrong UUID version', { id: '12345678-1234-1234-8234-123456789abc' }],
  ['old report ID', { id: freshId }],
]) {
  test(`malformed fresh response is rejected without navigation: ${name}`, () => {
    const instance = lifecycle();
    if (name === 'old report ID') instance.update(freshId);
    assert.throws(() => instance.handler(response, {}, instance.submit()), /Fresh analysis response unavailable/);
    assert.deepEqual(instance.locations, []);
  });
}

test('uppercase UUID-v4 response is accepted', () => {
  const instance = lifecycle();
  instance.handler({ id: freshId.toUpperCase() }, {}, instance.submit());
  assert.deepEqual(instance.locations, [`/analysis/${freshId.toUpperCase()}`]);
});

test('obsolete malformed completion is ignored rather than changing another report', () => {
  const instance = lifecycle();
  const submitted = instance.submit();
  instance.update('report-b');
  assert.doesNotThrow(() => instance.handler(null, {}, submitted));
  assert.deepEqual(instance.locations, []);
});

for (const response of [{ id: freshId }, null]) {
  test(`A to B to A keeps original ${response ? 'successful' : 'malformed'} completion obsolete`, () => {
    const instance = lifecycle();
    const submitted = instance.submit();
    instance.update('report-b');
    instance.update('report-a');
    assert.doesNotThrow(() => instance.handler(response, {}, submitted));
    assert.deepEqual(instance.locations, []);
  });
}
