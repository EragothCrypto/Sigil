const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');
const vm = require('node:vm');
const { test } = require('node:test');

function load(clipboard) {
  const calls = [];
  const context = vm.createContext({ navigator: { clipboard }, toast: value => calls.push(value) });
  const source = readFileSync(`${__dirname}/src/components/sigil/AnalysisResultView.tsx`, 'utf8');
  const handler = source.match(/const handleCopy = [\s\S]+?\n  };/)?.[0];
  assert.ok(handler, 'Actual copy handler must be exercised');
  vm.runInContext(stripTypeScriptTypes(handler), context);
  return { copy: vm.runInContext('handleCopy', context), calls };
}

test('copy success is reported only after the actual clipboard promise completes', async () => {
  let complete;
  const writes = [];
  const pending = new Promise(resolve => { complete = resolve; });
  const { copy, calls } = load({ writeText: text => { writes.push(text); return pending; } });
  const operation = copy('synthetic-input');
  assert.deepEqual(writes, ['synthetic-input']);
  assert.deepEqual(calls, []);
  complete();
  await operation;
  assert.equal(calls.length, 1);
  assert.equal(calls[0].title, 'Copied');
  assert.equal(calls[0].description, 'Input copied to clipboard.');
});

for (const [name, clipboard] of [
  ['rejected promise', { writeText: () => {
    const rejected = Promise.reject(new Error('synthetic clipboard denied'));
    rejected.catch(() => {});
    return rejected;
  } }],
  ['synchronous failure', { writeText: () => { throw new Error('synthetic clipboard failure'); } }],
  ['missing clipboard API', undefined],
]) {
  test(`copy ${name} produces bounded failure feedback without claiming success`, async () => {
    const { copy, calls } = load(clipboard);
    await assert.doesNotReject(async () => { await copy('private-value-marker'); });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].title, 'Copy failed');
    assert.equal(calls[0].variant, 'destructive');
    assert.equal(calls[0].description, 'Clipboard access is unavailable. Nothing was copied.');
    assert.doesNotMatch(JSON.stringify(calls), /private-value-marker|synthetic clipboard/);
  });
}
