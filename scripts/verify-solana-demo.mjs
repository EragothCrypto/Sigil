import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { startSolanaDemoPreview } from './solana-demo-preview.mjs';

const {chromium} = createRequire(import.meta.url)('playwright');
const output = new URL('../tmp/colosseum/', import.meta.url);
await mkdir(output, {recursive: true});
const hash = () => readFile(new URL('../artifacts/sigil/dist/public/index.html', import.meta.url)).then(b => createHash('sha256').update(b).digest('hex'));
const buildHash = await hash();
const {server, url} = await startSolanaDemoPreview();
let browser;
const results = [];
const api = '/api/sigil/monitor/v2/solana/scan';
try {
  const invalid = await fetch(url + api, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({wallet: 'bad', cluster: 'devnet'})});
  assert.equal(invalid.status, 400);
  browser = await chromium.launch({headless: true, channel: 'chrome'});
  for (const viewport of [{width: 1440, height: 1000}, {width: 390, height: 844}]) {
    const context = await browser.newContext({viewport, reducedMotion: 'reduce'});
    let calls = 0; const errors = [];
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', req => {if (req.url().endsWith(api)) calls++;});
    await context.route('**/*', route => route.request().url().startsWith(url) ? route.continue() : route.abort());
    await page.goto(url + '/solana', {waitUntil: 'networkidle'});
    await page.getByRole('heading', {name: 'Solana Wallet Check', exact: true}).waitFor();
    assert.equal(calls, 0, 'view must not scan automatically');
    await page.getByRole('button', {name: 'Check wallet', exact: true}).click();
    await page.getByRole('alert').filter({hasText: 'Enter a complete Solana public address.'}).waitFor();
    assert.equal(calls, 0);
    await page.getByRole('button', {name: 'Review example', exact: true}).click();
    await page.getByRole('heading', {name: 'Delegation needs review'}).waitFor();
    await page.getByText('Example data - not a live scan', {exact: true}).waitFor();
    assert.equal(calls, 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'example must fit viewport');
    await page.screenshot({path: fileURLToPath(new URL(`solana-${viewport.width}-review.png`, output)), fullPage: true});
    await page.getByRole('button', {name: 'Unavailable example', exact: true}).click();
    await page.getByRole('heading', {name: 'Wallet check unavailable'}).waitFor();
    await page.getByText('No count established').first().waitFor();
    await page.getByRole('button', {name: 'Load Devnet address', exact: true}).click();
    assert.equal(await page.getByLabel('Public wallet address', {exact: true}).inputValue(), 'A1TMhSGzQxMr1TboBKtgixKz1sS6REASMxPo1qsyTSJd');
    assert.equal(calls, 0);
    await page.route('**' + api, route => route.fulfill({status: 200, contentType: 'application/json', body: '{}'}));
    await page.getByRole('button', {name: 'Check wallet', exact: true}).click();
    await page.getByRole('alert').filter({hasText: 'The response could not be validated.'}).waitFor();
    await page.unroute('**' + api);
    if (process.argv.includes('--live')) {
      await page.getByRole('button', {name: 'Check wallet', exact: true}).click();
      await page.getByRole('region', {name: 'Solana check result'}).waitFor({timeout: 25000});
      await page.getByText('Live RPC snapshot', {exact: true}).waitFor();
      const responseText = await page.getByRole('region', {name: 'Solana check result'}).innerText();
      assert.ok(!responseText.includes('Wallet check unavailable'), 'live scan did not establish legacy acquisition');
      await page.screenshot({path: fileURLToPath(new URL(`solana-${viewport.width}-live.png`, output)), fullPage: true});
      results.push({viewport, live: responseText});
    } else results.push({viewport, syntheticOnly: true});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    await context.close();
  }
  assert.equal(await hash(), buildHash);
  await writeFile(new URL('browser-report.json', output), JSON.stringify({generatedAt: new Date().toISOString(), buildHash, results}, null, 2));
  console.log(`Solana desktop/mobile smoke passed; live=${process.argv.includes('--live')}; index=${buildHash}`);
} finally {await browser?.close(); await new Promise(resolve => server.close(resolve));}
