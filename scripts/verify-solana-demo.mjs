import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { startSolanaDemoPreview } from './solana-demo-preview.mjs';

const {chromium} = createRequire(import.meta.url)('playwright');
const remoteInput = process.env.SIGIL_PREVIEW_URL;
const remote = remoteInput ? new URL(remoteInput) : null;
const cluster = process.argv.includes('--mainnet') ? 'mainnet-beta' : 'devnet';
const testWallet = process.env.SIGIL_TEST_WALLET || 'A1TMhSGzQxMr1TboBKtgixKz1sS6REASMxPo1qsyTSJd';
if (remote) assert.ok(remote.protocol === 'https:' && remote.hostname.endsWith('.vercel.app'), 'remote verification requires an authorized HTTPS Vercel preview');
const output = new URL(cluster === 'mainnet-beta' ? (remote ? '../tmp/colosseum/preview-mainnet/' : '../tmp/colosseum/mainnet/') : (remote ? '../tmp/colosseum/preview/' : '../tmp/colosseum/'), import.meta.url);
await mkdir(output, {recursive: true});
const hash = () => readFile(new URL('../artifacts/sigil/dist/public/index.html', import.meta.url)).then(b => createHash('sha256').update(b).digest('hex'));
const buildHash = await hash();
const preview = remote ? {server: null, url: remote.origin} : await startSolanaDemoPreview();
const {server, url} = preview;
let browser;
const results = [];
const api = '/api/sigil/monitor/v2/solana/scan';
async function capture(page, name) {
  await page.evaluate(() => {if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo({top: 0, behavior: 'instant'});});
  await page.waitForFunction(() => window.scrollY === 0 && document.querySelector('header')?.getBoundingClientRect().top === 0);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const title = await page.getByRole('heading', {name: 'Solana Wallet Check', exact: true}).boundingBox();
  const header = await page.locator('header').first().boundingBox();
  assert.ok(title.y >= header.y + header.height, 'first viewport heading must clear the sticky navigation');
  await page.screenshot({path: fileURLToPath(new URL(name, output)), fullPage: true});
}
try {
  if (!remote) {
    const invalid = await fetch(url + api, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({wallet: 'bad', cluster: 'devnet'})});
    assert.equal(invalid.status, 400);
  }
  browser = await chromium.launch({headless: true, channel: 'chrome'});
  for (const viewport of [{width: 1440, height: 1000}, {width: 390, height: 844}]) {
    const context = await browser.newContext({viewport, reducedMotion: 'reduce'});
    let calls = 0; const errors = [];
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', req => {if (req.url().endsWith(api)) calls++;});
    await context.route('**/*', route => route.request().url().startsWith(url) ? route.continue() : route.abort());
    const target = new URL('/solana', url);
    if (remote) target.search = remote.search;
    const documentResponse = await page.goto(target.href, {waitUntil: 'networkidle'});
    assert.equal(documentResponse.status(), 200, 'preview access must establish the actual application');
    const remoteIndexHash = createHash('sha256').update(await documentResponse.body()).digest('hex');
    await page.getByRole('heading', {name: 'Solana Wallet Check', exact: true}).waitFor();
    assert.equal(calls, 0, 'view must not scan automatically');
    if (remote) {
      const invalid = await page.evaluate(async api => {
        const r = await fetch(api, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({wallet: 'bad', cluster: 'devnet'})});
        return {status: r.status, cache: r.headers.get('cache-control'), type: r.headers.get('content-type'), matched: r.headers.get('x-matched-path'), body: (await r.text()).slice(0, 120)};
      }, api);
      if (invalid.status !== 400) {
        const direct = await context.request.post(url + api, {data: {wallet: 'bad', cluster: 'devnet'}});
        console.log(`Invalid-input diagnostic: browserOrigin=${invalid.status}; withoutOrigin=${direct.status()}`);
      }
      assert.equal(invalid.status, 400, JSON.stringify(invalid));
      calls = 0;
      assert.ok(documentResponse.headers()['content-security-policy']?.includes("object-src 'none'"));
    }
    await page.getByRole('button', {name: 'Check wallet', exact: true}).click();
    await page.getByRole('alert').filter({hasText: 'Enter a complete Solana public address.'}).waitFor();
    assert.equal(calls, 0);
    await page.getByRole('button', {name: 'Review example', exact: true}).click();
    await page.getByRole('heading', {name: 'Delegation needs review'}).waitFor();
    await page.getByText('Example data - not a live scan', {exact: true}).waitFor();
    await page.getByRole('heading', {name: 'Next action', exact: true}).waitFor();
    const permission = page.getByRole('article');
    for (const question of ['What was detected', 'Why it matters', 'Permission capability', 'What could not be verified', 'Synthetic account evidence']) await permission.getByText(question, {exact: true}).waitFor();
    assert.ok((await permission.innerText()).includes('250 raw units'));
    assert.equal(await page.getByRole('navigation', {name: 'Permission evidence'}).count(), 0, 'synthetic addresses must not masquerade as live evidence');
    assert.equal(await page.getByRole('link', {name: 'Wallet evidence', exact: true}).count(), 0);
    assert.equal(calls, 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'example must fit viewport');
    await capture(page, `solana-${viewport.width}-review.png`);
    for (const [button, title, detail] of [
      ['No-delegate example', 'No delegates found in checked scope', 'No delegate change is indicated by this narrow check'],
      ['Incomplete example', 'Some checks could not be completed', 'Coverage is incomplete.'],
      ['Frozen example', 'Delegation needs review', 'The account was frozen'],
      ['Zero-bound example', 'Delegation needs review', 'current ordinary bound zero'],
    ]) {
      await page.getByRole('button', {name: button, exact: true}).click();
      await page.getByRole('heading', {name: title, exact: true}).waitFor();
      assert.ok((await page.getByRole('region', {name: 'Solana check result'}).innerText()).includes(detail));
      assert.equal(await page.getByRole('link', {name: 'Wallet evidence', exact: true}).count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    assert.equal(calls, 0, 'all example outcomes must remain synthetic and local');
    await page.getByRole('button', {name: 'Unavailable example', exact: true}).click();
    await page.getByRole('heading', {name: 'Wallet check unavailable'}).waitFor();
    await page.getByText('No count established').first().waitFor();
    await page.getByRole('button', {name: 'Load Mainnet address', exact: true}).click();
    assert.equal(await page.getByLabel('Public wallet address', {exact: true}).inputValue(), 'HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ');
    assert.equal(await page.getByLabel('Cluster', {exact: true}).inputValue(), 'mainnet-beta');
    assert.equal(await page.getByRole('region', {name: 'Solana check result'}).count(), 0);
    await page.getByRole('button', {name: 'Load Devnet address', exact: true}).click();
    assert.equal(await page.getByLabel('Public wallet address', {exact: true}).inputValue(), 'A1TMhSGzQxMr1TboBKtgixKz1sS6REASMxPo1qsyTSJd');
    assert.equal(calls, 0);
    await page.route('**' + api, route => route.fulfill({status: 200, contentType: 'application/json', body: '{}'}));
    await page.getByRole('button', {name: 'Check wallet', exact: true}).click();
    await page.getByRole('alert').filter({hasText: 'The response could not be validated.'}).waitFor();
    await page.unroute('**' + api);
    if (process.argv.includes('--live')) {
      await page.getByLabel('Public wallet address', {exact: true}).fill(testWallet);
      await page.getByLabel('Cluster', {exact: true}).selectOption(cluster);
      assert.equal(await page.getByRole('region', {name: 'Solana check result'}).count(), 0, 'cluster selection must clear old evidence');
      const apiResponse = page.waitForResponse(r => r.url().endsWith(api) && r.request().method() === 'POST');
      await page.getByRole('button', {name: 'Check wallet', exact: true}).click();
      const actualResponse = await apiResponse;
      assert.equal(actualResponse.status(), 200);
      assert.equal(actualResponse.headers()['cache-control'], 'no-store');
      const actualReport = await actualResponse.json();
      assert.equal(actualReport.cluster, cluster);
      assert.equal(actualReport.wallet, testWallet);
      assert.ok(actualReport.coverage[0].status === 'complete' || actualReport.coverage[0].status === 'partial', 'live legacy acquisition must be established');
      if (process.argv.includes('--require-accounts')) assert.ok(actualReport.accountsChecked > 0, 'nonempty mainnet account fixture must be decoded');
      await page.getByRole('region', {name: 'Solana check result'}).waitFor({timeout: 25000});
      await page.getByText('Live RPC snapshot', {exact: true}).waitFor();
      const responseText = await page.getByRole('region', {name: 'Solana check result'}).innerText();
      assert.ok(responseText.includes('Next action'));
      const walletEvidence = await page.getByRole('link', {name: 'Wallet evidence', exact: true}).getAttribute('href');
      assert.equal(new URL(walletEvidence).hostname, 'explorer.solana.com');
      assert.equal(new URL(walletEvidence).searchParams.get('cluster'), cluster === 'devnet' ? 'devnet' : null);
      assert.ok(!responseText.includes('Wallet check unavailable'), 'live scan did not establish legacy acquisition');
      await capture(page, `solana-${viewport.width}-live.png`);
      results.push({viewport, live: responseText, actualReport, remoteIndexHash});
    } else results.push({viewport, syntheticOnly: true});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    await context.close();
  }
  assert.equal(await hash(), buildHash);
  await writeFile(new URL('browser-report.json', output), JSON.stringify({generatedAt: new Date().toISOString(), cluster, localIndexHash: buildHash, remoteOrigin: remote?.origin, results}, null, 2));
  console.log(`Solana desktop/mobile smoke passed; cluster=${cluster}; live=${process.argv.includes('--live')}; remote=${Boolean(remote)}; localIndex=${buildHash}`);
} catch (error) {
  throw new Error(String(error.message).replace(/_vercel_share=[^&\s"']+/g, '_vercel_share=REDACTED'));
} finally {await browser?.close(); if (server) await new Promise(resolve => server.close(resolve));}
