import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

// Stub browser loading only; execute the verifier's actual configuration boundary.
const source = readFileSync(new URL('./verify-colosseum-evm.mjs', import.meta.url), 'utf8')
  .replace("const { chromium } = createRequire(import.meta.url)('playwright');", 'const chromium = {};');
for (const value of [undefined, 'not-a-url?_vercel_share=synthetic-private-access',
  'https://wrong.example/?_vercel_share=synthetic-private-access']) {
  test('EVM verifier rejects unsafe access context without exposing its value', () => {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
      encoding: 'utf8', timeout: 10000,
      env: value ? { SIGIL_PREVIEW_URL: value } : {},
    });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.doesNotMatch(result.stderr, /synthetic-private-access|_vercel_share|wrong\.example|not-a-url/);
    assert.deepEqual(JSON.parse(result.stderr), { status: 'failed', code: 'invalid_preview_context' });
  });
}
