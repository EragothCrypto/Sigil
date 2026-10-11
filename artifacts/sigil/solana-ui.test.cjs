const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync, existsSync} = require('node:fs');
test('Solana view is reachable, explicit read-only scan is context validated, examples visibly separate', () => {
  const file = `${__dirname}/src/pages/solana-monitor.tsx`;
  assert.ok(existsSync(file), 'Solana UI must exist');
  const source = readFileSync(file, 'utf8');
  assert.match(source, /parseSolanaReport\(payload, requestedWallet, requestedCluster\)/);
  assert.match(source, /api\/sigil\/monitor\/v2\/solana\/scan/);
  assert.match(source, /Example data/);
  assert.match(source, /No delegates found in checked scope/);
  assert.doesNotMatch(source, /signTransaction|sendTransaction|window\.solana|setInterval/);
  assert.match(readFileSync(`${__dirname}/src/App.tsx`, 'utf8'), /path="\/solana"/);
  assert.match(readFileSync(`${__dirname}/src/components/layout/Layout.tsx`, 'utf8'), /href: '\/solana'/);
});
