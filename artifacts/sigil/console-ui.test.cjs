const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const read = file => readFileSync(`${__dirname}/src/${file}`, 'utf8');

test('console surfaces are opaque graphite without ambient decoration', () => {
  const css = read('index.css');
  const layout = read('components/layout/Layout.tsx');
  assert.match(css, /--color-background: #141618/);
  assert.doesNotMatch(layout, /glow-pulse|blur-\[|backdrop-blur/);
  assert.doesNotMatch(css, /radial-gradient|feTurbulence/);
});

test('task navigation exposes named primary checks and accessible secondary tools', () => {
  const layout = read('components/layout/Layout.tsx');
  assert.match(layout, /label: 'Transaction check'/);
  assert.match(layout, /label: 'Wallet permissions'/);
  assert.match(layout, /<details/);
  assert.match(layout, /<summary/);
  assert.doesNotMatch(layout, /hidden sm:inline/);
});

test('secondary tools stay within short viewports and close on focus departure', () => {
  const layout = read('components/layout/Layout.tsx');
  assert.ok(layout.includes('max-h-[calc(100dvh-10rem)]') && layout.includes('overflow-y-auto'), 'Tool menu must be viewport bounded and scrollable');
  assert.ok(layout.includes('onBlur={event =>') && layout.includes('event.relatedTarget'), 'Tool disclosure must close when focus leaves');
});

test('Solana examples stay labeled and evidence is progressively disclosed', () => {
  const source = read('pages/solana-monitor.tsx');
  assert.match(source, /Example data - not a live scan/);
  assert.match(source, /Synthetic account evidence/);
  assert.match(source, /<details[^>]*className="permission-evidence/);
  assert.match(source, /<summary/);
  assert.match(source, /Coverage is incomplete\. A missing check is not a negative finding\./);
  assert.match(source, /parseSolanaReport\(payload, requestedWallet, requestedCluster\)/);
  assert.doesNotMatch(source, /signTransaction|sendTransaction|setInterval/);
});
