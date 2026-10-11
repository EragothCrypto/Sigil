import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

let target;
try {
  target = new URL(process.env.SIGIL_PREVIEW_URL);
  assert.ok(target.protocol === 'https:' && target.hostname.endsWith('.vercel.app'));
} catch {
  console.error(JSON.stringify({ status: 'failed', code: 'invalid_preview_context' }));
  process.exit(1);
}
const { chromium } = createRequire(import.meta.url)('playwright');
const output = new URL('../tmp/colosseum/evm-preclose/', import.meta.url);
await mkdir(output, { recursive: true });
const controls = [
  { name: 'aave', hash: '0x431294ff0238c1b66a8e85bf08210825606cbf3bde284345ed2a02cf950145ac' },
  { name: 'euler', hash: '0xc310a0affe2169d1f6feec1c63dbc7f7c62a887fa48795d327d4d2da2d6b111d' },
];
const results = [];
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const documentResponse = await page.goto(target.href, { waitUntil: 'networkidle' });
  assert.equal(documentResponse.status(), 200);
  const indexHash = createHash('sha256').update(await documentResponse.body()).digest('hex');
  assert.ok(documentResponse.headers()['content-security-policy']?.includes("object-src 'none'"));
  for (const control of controls) {
    const started = Date.now();
    const actual = await page.evaluate(async hash => {
      const response = await fetch('/api/sigil/analyze-stream', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: hash, network: 'mainnet', fresh: true }),
        signal: AbortSignal.timeout(100000),
      });
      const text = await response.text();
      const events = text.split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6)));
      const done = events.find(event => event.type === 'done');
      if (!done) return { status: response.status, events };
      const saved = await fetch(`/api/sigil/history?id=${encodeURIComponent(done.id)}`);
      return { status: response.status, savedStatus: saved.status, events, record: await saved.json() };
    }, control.hash);
    assert.equal(actual.status, 200);
    assert.ok(!actual.events.some(event => event.type === 'error'), 'fresh analysis must complete, not fail or time out');
    assert.ok(!actual.events.some(event => event.type === 'cached'), 'fresh control cannot use a prior report');
    assert.equal(actual.savedStatus, 200);
    const record = actual.record;
    assert.match(record.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.equal(record.input, control.hash);
    assert.equal(record.network, 'mainnet');
    assert.equal(record.inputType, 'transaction');
    const report = record.details.validatedReport;
    assert.equal(report.version, 'findings-v2');
    const evidenceText = JSON.stringify(report);
    if (control.name === 'aave') {
      assert.ok(!report.findings.some(finding => finding.category === 'risk'));
      assert.match(evidenceText, /supplyWithPermit/);
      assert.match(evidenceText, /500000000/);
      assert.match(evidenceText, /current_abi_only/);
    } else {
      assert.ok(report.findings.some(finding => finding.category === 'risk'));
      assert.match(evidenceText, /Euler V1 exploit/);
      assert.match(evidenceText, /exploit_execution/);
      assert.ok(evidenceText.toLowerCase().includes(control.hash));
      assert.equal(record.verdict, 'dangerous');
    }
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.goto(`${target.origin}/analysis/${record.id}`, { waitUntil: 'networkidle' });
      await page.getByText(/^Risk Findings \(\d+\)$/).waitFor();
      await page.getByText(/^Analysis Limits \(\d+\)$/).waitFor();
      await page.getByText('Scores and methodology', { exact: true }).click();
      await page.getByText(/^Observations \(\d+\)$/).click();
      const text = await page.locator('main').innerText();
      assert.match(text, /Coverage: Partial/);
      assert.match(text, /not signing clearance/);
      if (control.name === 'aave') assert.match(text, /Aave V3 Pool/);
      else {
        assert.match(text, /Do Not Sign/);
        assert.match(text, /not evidence of current exploitability/);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
      await page.screenshot({ path: fileURLToPath(new URL(`${control.name}-${viewport.width}.png`, output)), fullPage: true });
    }
    results.push({ name: control.name, input: control.hash, reportId: record.id, version: report.version,
      verdict: record.verdict, score: record.riskScore, createdAt: record.createdAt, elapsedMs: Date.now() - started });
  }
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto(target.origin, { waitUntil: 'networkidle' });
    await page.getByLabel('Transaction hash or contract address', { exact: true }).fill('0x123');
    const invalid = page.waitForResponse(response => response.url().endsWith('/api/sigil/analyze-stream'));
    await page.getByRole('button', { name: 'Analyze', exact: true }).click();
    assert.equal((await invalid).status(), 400);
    await page.getByText('Enter a complete transaction hash or contract address. No risk verdict was produced.', { exact: true }).waitFor();
    await page.getByLabel('Transaction hash or contract address', { exact: true }).fill(controls[0].hash);
    await page.getByRole('button', { name: 'Analyze', exact: true }).click();
    await page.waitForURL('**/analysis/**', { timeout: 100000 });
    await page.getByText(/^Risk Findings \(\d+\)$/).waitFor();
    if (viewport.width === 1440) {
      const savedId = new URL(page.url()).pathname.split('/').at(-1);
      // Open this actually stored report in the existing saved-report view.
      await page.goto(`${target.origin}/analysis/${savedId}?cached=1`, { waitUntil: 'networkidle' });
      const fresh = page.waitForResponse(response => response.url().endsWith('/api/sigil/analyze') && response.request().method() === 'POST', { timeout: 100000 });
      await page.getByRole('button', { name: 'Re-analyze fresh', exact: true }).click();
      const response = await fresh;
      assert.equal(response.request().postDataJSON().fresh, true);
      assert.equal(response.status(), 200);
      const refreshed = await response.json();
      assert.notEqual(refreshed.id, savedId);
      assert.equal(refreshed.input, controls[0].hash);
      assert.equal(refreshed.details.validatedReport.version, 'findings-v2');
      await page.waitForURL(`**/analysis/${refreshed.id}`);
      await page.getByText(/^Risk Findings \(\d+\)$/).waitFor();
    }
    const navigation = page.getByRole('navigation', { name: 'Main navigation', exact: true });
    await navigation.getByRole('link', { name: 'Wallet permissions', exact: true }).focus();
    await navigation.getByRole('link', { name: 'Wallet permissions', exact: true }).click();
    await page.getByRole('heading', { name: 'Check wallet permissions', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Review example', exact: true }).click();
    await page.getByRole('heading', { name: 'Delegation needs review', exact: true }).waitFor();
    await page.getByText('Example data - not a live scan', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await navigation.getByRole('link', { name: 'Transaction check', exact: true }).focus();
    await navigation.getByRole('link', { name: 'Transaction check', exact: true }).click();
    await page.getByLabel('Transaction hash or contract address', { exact: true }).waitFor();
  }
  assert.deepEqual(errors, []);
  const report = { status: 'pass', origin: target.origin, indexHash, results,
    scope: 'fresh_live_evm_stream_saved_report_desktop_mobile', journey: 'invalid400_scanner_report_fresh_reanalysis_solana_example_scanner', limitations: ['not_current_incident_exposure', 'not_signing_clearance', 'not_production_deployment'] };
  await writeFile(new URL('report.json', output), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} catch (error) {
  // Access capabilities are never persisted in diagnostic output.
  let message = String(error.message);
  for (const value of [target.href, target.search, ...target.searchParams.values()]) {
    if (value) message = message.split(value).join('[access omitted]');
  }
  console.error(JSON.stringify({ status: 'failed', message: message.slice(0, 1500) }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
