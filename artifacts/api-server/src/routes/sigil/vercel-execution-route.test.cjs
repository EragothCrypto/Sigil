const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '../../../../..');
function handler(layout) {
  const source = readFileSync(path.join(root, layout, 'api/sigil/simulate.js'), 'utf8')
    .replace(/^import app[^\n]*\n/, '')
    .replace('export default function handler', 'function handler');
  const context = { URL, URLSearchParams, app: req => req.url };
  vm.createContext(context);
  vm.runInContext(`${source}\nthis.handler = handler;`, context);
  return context.handler;
}

for (const layout of ['', 'artifacts/sigil']) {
test(`${layout || 'root'}: Vercel routes execution v2 before SPA fallback`, () => {
  const { rewrites } = JSON.parse(readFileSync(path.join(root, layout, 'vercel.json'), 'utf8'));
  const index = rewrites.findIndex(rule => rule.source === '/api/sigil/simulate-v2');
  assert.ok(index >= 0, 'explicit v2 deployment route is required');
  assert.equal(rewrites[index].destination, '/api/sigil/simulate?executionCheckVersion=2');
  assert.ok(index < rewrites.findIndex(rule => rule.source === '/api/:path*'));
});

test(`${layout || 'root'}: rewritten v2 requests reach Express without the routing parameter`, () => {
  assert.equal(handler(layout)({ url: '/api/sigil/simulate?executionCheckVersion=2&test=1' }, {}), '/api/sigil/simulate-v2?test=1');
});

test(`${layout || 'root'}: original v2 URL remains v2`, () => {
  assert.equal(handler(layout)({ url: '/api/sigil/simulate-v2' }, {}), '/api/sigil/simulate-v2');
});

test(`${layout || 'root'}: legacy requests still reach the disabled legacy route`, () => {
  assert.equal(handler(layout)({ url: '/api/sigil/simulate?test=1' }, {}), '/api/sigil/simulate?test=1');
});
}
