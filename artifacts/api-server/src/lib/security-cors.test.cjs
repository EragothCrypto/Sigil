const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {stripTypeScriptTypes} = require('node:module');
const vm = require('node:vm');

function options(env) {
  const source = readFileSync(`${__dirname}/security.ts`, 'utf8').replace(/^import .*logger.*;\r?\n/m, '');
  const js = stripTypeScriptTypes(source).replaceAll('export function ', 'function ');
  const context = {process: {env}, logger: {warn() {}}, Map, Set, Date};
  vm.runInNewContext(`${js}\nthis.options = createCorsOptions();`, context);
  return context.options;
}
function accepts(cors, origin) {let accepted; cors.origin(origin, error => {accepted = !error;}); return accepted;}

test('Vercel preview permits only exact server-configured deployment and branch origins', () => {
  const cors = options({VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_URL: 'sigil-build-team.vercel.app', VERCEL_BRANCH_URL: 'sigil-git-demo-team.vercel.app'});
  assert.equal(accepts(cors, 'https://sigil-build-team.vercel.app'), true);
  assert.equal(accepts(cors, 'https://sigil-git-demo-team.vercel.app'), true);
  for (const origin of ['https://attacker.vercel.app', 'https://sigil-build-team.vercel.app.evil.invalid', 'http://sigil-build-team.vercel.app']) assert.equal(accepts(cors, origin), false);
});

test('non-preview and malformed environment hosts do not widen CORS', () => {
  for (const env of [{VERCEL_URL: 'sigil-build-team.vercel.app'}, {VERCEL: '1', VERCEL_ENV: 'production', VERCEL_URL: 'sigil-build-team.vercel.app'}, {VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_URL: 'attacker.invalid/path', VERCEL_BRANCH_URL: 'sigil.vercel.app@attacker.invalid'}]) {
    const cors = options(env);
    assert.equal(accepts(cors, 'https://sigil-build-team.vercel.app'), false);
    assert.equal(accepts(cors, 'https://attacker.invalid'), false);
    assert.equal(accepts(cors, 'https://sigil.s3ntrylabs.com'), true);
    assert.equal(accepts(cors, undefined), true);
  }
});
