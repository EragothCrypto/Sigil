import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';

process.env.DATABASE_URL = 'postgresql://demo:demo@127.0.0.1:1/demo';
process.env.AI_INTEGRATIONS_OPENAI_API_KEY = 'demo-placeholder';
process.env.AI_INTEGRATIONS_OPENAI_BASE_URL = 'http://127.0.0.1:1';
const originalFetch = globalThis.fetch;
let blockedCalls = 0;
globalThis.fetch = (input, options) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.hostname === '127.0.0.1') return originalFetch(input, options);
  blockedCalls++;
  throw new Error('External requests disabled in API failure smoke');
};
const {default: app} = await import('../artifacts/api-server/dist/app.mjs');
const handlers = [{name: 'mounted Express', handler: app}];
for (const file of ['../api/[...path].js', '../artifacts/sigil/api/[...path].js']) handlers.push({name: file, handler: (await import(file)).default});
for (const file of ['../api/index.js', '../artifacts/sigil/api/index.js']) handlers.push({name: file, handler: (await import(file)).default});
for (const {name, handler} of handlers) {
  const server = createServer(handler).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const paths = name === 'mounted Express' ? ['/api/sigil/monitor/v2/solana/scan'] : name.endsWith('/index.js') ? ['/api?solanaWalletCheck=1', '/api/sigil/monitor/v2/solana/scan'] : ['/api/sigil/monitor/v2/solana/scan', '/sigil/monitor/v2/solana/scan'];
    for (const path of paths) {
      const post = body => fetch(base + path, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
      assert.equal((await post({wallet: 'bad', cluster: 'devnet'})).status, 400);
      assert.equal((await post({wallet: '11111111111111111111111111111111', cluster: 'http://attacker.invalid'})).status, 400);
      const response = await post({wallet: '11111111111111111111111111111111', cluster: 'devnet'});
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const report = await response.json();
      assert.equal(report.status, 'unavailable');
      assert.equal(report.wallet, '11111111111111111111111111111111');
      assert.equal(report.cluster, 'devnet');
      assert.equal(report.slotRange, null);
      assert.equal(report.accountsChecked, 0);
      assert.ok(report.coverage.every(c => c.status === 'unavailable' && c.accountCount === null));
    }
    console.log(`${name}: Solana POST dispatch, invalid400 and unavailable200 passed`);
  } finally {await new Promise(resolve => server.close(resolve));}
}
assert.equal(blockedCalls, 9);
globalThis.fetch = originalFetch;
process.exit(0);
