import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseArgs } from "node:util";
import { assertRenderedRoute } from "./rendered-route-guard.mjs";
import { waitForIntercept } from "./bounded-interception.mjs";
import { assertEvidenceReadable, assertSeparatedLabels } from "./evidence-layout-guard.mjs";
import { analysisFixture, nestedFixture, executionFixture, advisoryFixture, unavailableFixture, analysisVariants, approvalEventFixtures, resultId } from "./web-result-fixtures.mjs";
import { producerNestedFixture } from "./web-producer-fixture.mjs";

const { values } = parseArgs({ options: { wcag: { type: "boolean", default: false }, states: { type: "boolean", default: false }, results: { type: "boolean", default: false }, variants: { type: "boolean", default: false }, history: { type: "boolean", default: false }, events: { type: "boolean", default: false } }, allowPositionals: false });
assert.ok([values.states, values.results, values.variants, values.history, values.events].filter(Boolean).length <= 1, "Choose one state, result, variant, history or event audit mode");
const wcagAudit = values.wcag || values.states || values.results || values.variants || values.history || values.events;
const auditName = values.events ? "events" : values.history ? "history" : values.variants ? "variants" : values.results ? "results" : values.states ? "states" : values.wcag ? "wcag" : "contrast";
const runOnly = wcagAudit
  ? { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }
  : { type: "rule", values: ["color-contrast"] };

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = path.join(root, "artifacts/sigil/dist/public");
const buildHash = createHash("sha256").update(await readFile(path.join(dist, "index.html"))).digest("hex");
const output = path.join(root, "tmp/p00");
const axeDirectory = path.join(output, "axe-core-4.14.0/package");
const manifest = JSON.parse(await readFile(path.join(axeDirectory, "package.json"), "utf8"));
assert.equal(manifest.name, "axe-core");
assert.equal(manifest.version, "4.14.0");
const axe = await readFile(path.join(axeDirectory, "axe.min.js"), "utf8");
assert.equal(createHash("sha256").update(axe).digest("hex"), "20c09fe157a8a34a30e241aaa1fcdade657734f08ab379ecfbeb7d45cc46e878");
const { chromium } = createRequire(import.meta.url)(process.env.SIGIL_PLAYWRIGHT_MODULE || "playwright");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".ico": "image/x-icon" };
let syntheticStream;
let streamRequests = 0;
let resultRequests = 0;
let executionRequests = 0;
let historyRequests = 0;
let freshRequests = 0;
let approvalEventRequests = 0;
const event = data => `data: ${JSON.stringify(data)}\n\n`;
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if ((values.results || values.variants) && pathname === "/api/sigil/history") {
      const id = new URL(request.url, "http://localhost").searchParams.get("id");
      const fixture = values.variants ? analysisVariants.find(item => item.fixture.id === id)?.fixture
        : [analysisFixture, nestedFixture, producerNestedFixture].find(item => item.id === id);
      assert.ok(fixture, "Unknown synthetic variant id");
      assert.equal(id, fixture.id);
      resultRequests++;
      response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(fixture));
      return;
    }
    if (values.states && pathname === "/api/sigil/analyze-stream") {
      let body = "";
      for await (const chunk of request) body += chunk;
      assert.deepEqual(JSON.parse(body), { input: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", network: "mainnet" });
      streamRequests++;
      syntheticStream = response;
      response.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
      response.write(event({ type: "step", step: 1, label: "Synthetic evidence check" }));
      return;
    }
    if (pathname.startsWith("/api/")) {
      assert.ok(!(values.results || values.variants || values.history), "unexpected_result_api_request");
      response.writeHead(200, { "Content-Type": "application/json" }).end("[]");
      return;
    }
    let file = path.resolve(dist, `.${pathname}`);
    const relative = path.relative(dist, file);
    if (relative === ".." || relative.startsWith(`..${path.sep}`)) {
      response.writeHead(403).end();
      return;
    }
    if (!(await stat(file).catch(() => null))?.isFile()) {
      if (path.extname(pathname)) { response.writeHead(404).end(); return; }
      file = path.join(dist, "index.html");
    }
    response.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" }).end(await readFile(file));
  } catch {
    response.writeHead(500).end();
  }
});
let browser;
const reports = [];
const commandContrast = [];
const routes = {
  "/": "Check a transaction or contract",
  "/approvals": "Find wallet approvals worth cleaning up.",
  "/monitor": "Recorded approval events, sorted for review.",
  "/watchlist": "Keep important addresses in one calm security view.",
  "/sites": "Check dApp domains before the wallet prompt.",
  "/simulate": "Check Before Signing",
  "/history": "Public Threat Intel",
  "/extension": "Sigil lives inside your wallet",
  "/onboarding": "Understand wallet risk before the next click.",
  "/impressum": "Impressum", "/privacy": "Privacy Policy",
  "/terms": "Terms of Use", "/cookies": "Cookie and Local Storage Notice",
};
async function renderedSnapshot(page, errors = [], assetFailures = []) {
  return {
    headings: (await Promise.all((await page.locator("main h1").all()).map(heading => heading.innerText())))
      .map(text => text.replace(/\s+/g, " ").trim()),
    headingVisible: await page.locator("main h1").first().isVisible(),
    mainCount: await page.locator("main").count(),
    textLength: (await page.locator("body").innerText()).length, errors, assetFailures,
  };
}
try {
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, channel: "chrome" });
  const control = await browser.newPage();
  await control.setContent('<html lang="en"><body style="background:#fff"><p style="color:#ddd">Synthetic insufficient contrast</p></body></html>');
  await control.addScriptTag({ content: axe });
  const negative = await control.evaluate(() => window.axe.run({ runOnly: { type: "rule", values: ["color-contrast"] } }));
  assert.ok(negative.violations.some(rule => rule.id === "color-contrast"), "Contrast engine must detect the negative control");
  if (wcagAudit) {
    await control.setContent('<html lang="en"><body><button><svg aria-hidden="true"></svg></button><input></body></html>');
    await control.addScriptTag({ content: axe });
    const semanticControl = await control.evaluate(options => window.axe.run({ runOnly: options }), runOnly);
    for (const id of ["button-name", "label"]) assert.ok(semanticControl.violations.some(rule => rule.id === id), `Missing ${id} negative control`);
  }
  await control.setContent('<html lang="en"><body><div id="root"></div></body></html>');
  const blank = await renderedSnapshot(control);
  assert.throws(() => assertRenderedRoute(blank, routes["/"]), "Empty React root must not count as contrast coverage");
  await control.close();
  for (const [name, viewport] of [["desktop", { width: 1440, height: 1000 }], ["mobile", { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport, reducedMotion: "reduce", hasTouch: values.variants && name === "mobile" });
    if (values.results) await page.addInitScript(() => {
      window.__p00ShareCalls = [];
      window.open = (...args) => { window.__p00ShareCalls.push(args); return null; };
      window.__p00ClipboardWrites = [];
      window.__p00ClipboardMode = "reject";
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
        writeText: async text => {
          window.__p00ClipboardWrites.push(text);
          if (window.__p00ClipboardMode === "reject") throw new Error("synthetic clipboard denied");
        },
      } });
    });
    const errors = [];
    const assetFailures = [];
    const expectedHttp = new Set();
    const observedHttp = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("requestfailed", request => { if (new URL(request.url()).origin === origin) assetFailures.push(request.url()); });
    page.on("response", response => {
      if (new URL(response.url()).origin !== origin || response.status() < 400) return;
      const key = `${response.request().method()} ${response.url()} ${response.status()}`;
      if (expectedHttp.delete(key)) observedHttp.push(response.status());
      else assetFailures.push(response.url());
    });
    await page.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    for (const [route, heading] of Object.entries(values.states || values.results || values.variants || values.history || values.events ? {} : routes)) {
      errors.length = 0;
      assetFailures.length = 0;
      const response = await page.goto(`${origin}${route}`, { waitUntil: "networkidle" });
      assert.equal(response.status(), 200);
      // Reduced motion does not remove intentional opacity entrance delays.
      await page.waitForTimeout(1500);
      assertRenderedRoute(await renderedSnapshot(page, errors, assetFailures), heading);
      if (route === "/" || route === "/simulate") {
        const names = route === "/"
          ? ["Network", "Transaction hash or contract address"]
          : ["Select network", "Read-only call input"];
        for (const name of names) {
          const field = page.getByLabel(name, { exact: true });
          assert.equal(await field.count(), 1, `Expected one natively labeled field: ${name}`);
          assert.equal(await field.isVisible(), true);
        }
      }
      await page.addScriptTag({ content: axe });
      const result = await page.evaluate(options => window.axe.run({ runOnly: options }), runOnly);
      assert.ok(result.passes.some(rule => rule.nodes.length > 0), "No actual text contrast checks ran");
      assertRenderedRoute(await renderedSnapshot(page, errors, assetFailures), heading);
      const compact = rules => rules.map(rule => ({ id: rule.id, nodes: rule.nodes.map(node => ({ target: node.target, html: node.html, failureSummary: node.failureSummary, checks: [...node.any, ...node.all, ...node.none].map(check => ({ id: check.id, data: check.data, message: check.message })) })) }));
      reports.push({ viewport: name, route, violations: compact(result.violations), incomplete: compact(result.incomplete), passes: result.passes.reduce((sum, rule) => sum + rule.nodes.length, 0) });
      if (route === "/" || route === "/privacy") await page.screenshot({ path: path.join(output, `${auditName}-${name}-${route === "/" ? "home" : "privacy"}.png`), fullPage: true });
      console.log(JSON.stringify({ viewport: name, route, violations: result.violations.reduce((sum, rule) => sum + rule.nodes.length, 0), incomplete: result.incomplete.reduce((sum, rule) => sum + rule.nodes.length, 0) }));
    }
    if (values.states || values.results || values.variants || values.history || values.events) {
      const verifyCommandFill = async (button, command) => {
        assert.equal(await button.isEnabled(), true);
        await page.addScriptTag({ content: axe });
        await page.mouse.move(0, 0);
        for (const state of ["default", "hover"]) {
          if (state === "hover") await button.hover();
          await page.waitForTimeout(400);
          const colors = await button.evaluate(element => {
            const css = getComputedStyle(element);
            const color = window.axe.commons.color;
            return { foreground: css.color, background: css.backgroundColor, image: css.backgroundImage,
              ratio: color.getContrast(new color.Color().parseString(css.color), new color.Color().parseString(css.backgroundColor)) };
          });
          assert.equal(colors.image, "none");
          assert.ok(colors.ratio >= 4.5, `${command} ${state}: insufficient computed fill contrast`);
          commandContrast.push({ viewport: name, command, state, ...colors });
        }
      };
      const scanState = async (state, route, preserveFocus = false) => {
        await page.waitForTimeout(1500);
        assert.deepEqual(errors, []);
        assert.deepEqual(assetFailures, []);
        assert.equal(await page.locator("main").count(), 1);
        if (state === "history-loading") {
          assert.equal((await page.locator("main").textContent()).replace(/\s+/g, " ").trim(), `ScannerRetrieving analysis${String.fromCodePoint(0x2026)}`);
        } else {
          assert.ok((await page.locator("main").innerText()).length >= 40);
        }
        await page.addScriptTag({ content: axe });
        if (preserveFocus) assert.equal(await page.getByRole("tooltip").count(), 1, "Tooltip state must remain open before accessibility scan");
        const result = await page.evaluate(options => window.axe.run({ runOnly: options }), runOnly);
        if (preserveFocus) assert.equal(await page.getByRole("tooltip").count(), 1, "Tooltip state must remain open after accessibility scan");
        assert.ok(result.passes.some(rule => rule.nodes.length));
        const compact = rules => rules.map(rule => ({ id: rule.id, nodes: rule.nodes.map(node => ({ target: node.target, html: node.html, failureSummary: node.failureSummary })) }));
        reports.push({ viewport: name, route, state, violations: compact(result.violations), incomplete: compact(result.incomplete), passes: result.passes.reduce((sum, rule) => sum + rule.nodes.length, 0) });
        await writeFile(path.join(output, `web-${auditName}-progress.json`), JSON.stringify({ complete: false, reports }, null, 2));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${state}: horizontal overflow`);
        if (!preserveFocus && (values.results || values.variants || values.history || values.events)) {
          // Normalize capture after keyboard controls scroll the sticky header into the evidence section.
          await page.locator("main").focus();
          await page.evaluate(() => scrollTo(0, 0));
        }
        await page.screenshot({ path: path.join(output, `${values.events ? "event" : values.history ? "history" : values.variants ? "variant" : values.results ? "result" : "state"}-${name}-${state}.png`), fullPage: !preserveFocus });
        console.log(JSON.stringify({ viewport: name, state, violations: result.violations.reduce((sum, rule) => sum + rule.nodes.length, 0) }));
      };
      if (values.events) {
        let fixture;
        let failRefresh = false;
        const assertMonitorScore = async expected => {
          const score = page.locator('main aside').getByText('Event-review heuristic', { exact: true }).locator('..').locator(':scope > p').filter({ hasNotText: 'Event-review heuristic' });
          assert.equal(await score.textContent(), expected);
        };
        await page.route("**/api/sigil/approvals/health?*", route => {
          const url = new URL(route.request().url());
          assert.equal(route.request().method(), "GET");
          assert.equal(url.searchParams.get("address"), fixture.entry.address);
          assert.equal(url.searchParams.get("network"), "mainnet");
          assert.equal(url.searchParams.size, 2);
          approvalEventRequests++;
          if (failRefresh) {
            expectedHttp.add(`GET ${route.request().url()} 503`);
            return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Synthetic scan unavailable"}' });
          }
          return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixture.payload) });
        });
        for (const route of ["/approvals", "/watchlist", "/monitor"]) {
          for (fixture of approvalEventFixtures) {
            failRefresh = false;
            const before = approvalEventRequests;
            await page.goto(origin, { waitUntil: "networkidle" });
            await page.evaluate(entry => localStorage.setItem('sigil.addressWatchlist.v1', JSON.stringify([entry])), fixture.entry);
            await page.goto(`${origin}${route}`, { waitUntil: "networkidle" });
            assertRenderedRoute(await renderedSnapshot(page, errors, assetFailures), routes[route]);
            await page.waitForTimeout(100);
            assert.equal(approvalEventRequests, before, "No approval scan may run before manual activation");
            if (route === '/monitor') {
              const sidebar = page.locator('main aside');
              assert.equal(await sidebar.getByText('Coverage incomplete', { exact: true }).count(), 1);
              assert.equal(await sidebar.getByText('Low', { exact: true }).count(), 0);
              await assertMonitorScore('--');
              for (const label of ['Large values', 'Flagged events']) {
                assert.equal(await sidebar.getByText(label, { exact: true }).locator('..').locator(':scope > p').filter({ hasNotText: label }).textContent(), '--');
              }
              if (fixture.state === 'empty') await scanState('monitor-unchecked', route);
            }
            const response = page.waitForResponse(item => new URL(item.url()).pathname === '/api/sigil/approvals/health', { timeout: 1500 });
            if (route === "/approvals") {
              await page.getByLabel("Wallet address", { exact: true }).fill(fixture.entry.address);
              await page.getByRole("button", { name: "Scan", exact: true }).click();
            } else {
              await page.getByRole("button", { name: "Check", exact: true }).click();
            }
            assert.equal((await response).status(), 200);
            const coverageOwner = route === '/approvals' ? page.locator('main') : page.locator('main article').filter({ hasText: fixture.entry.label });
            await coverageOwner.getByText(fixture.payload.coverage.message, { exact: true }).waitFor();
            assert.equal(approvalEventRequests, before + 1, "Manual action must send exactly one bounded address/network GET");
            const available = fixture.state !== 'unavailable';
            const stats = [['Event candidates', fixture.payload.summary.totalActive], ['Large values', fixture.payload.summary.unlimited],
              ['Flagged events', fixture.payload.summary.critical + fixture.payload.summary.high]];
            const owner = route === '/approvals' ? page.locator('main aside') : page.locator('main article').filter({ hasText: fixture.entry.label });
            assert.equal(await owner.count(), 1);
            if (route !== '/approvals') stats.push(['Event heuristic', fixture.payload.summary.healthScore]);
            if (route === '/monitor') {
              const sidebar = page.locator('main aside');
              assert.equal(await sidebar.getByText('Coverage incomplete', { exact: true }).count(), available ? 0 : 1);
              await assertMonitorScore(available ? String(Math.max(0, fixture.payload.summary.healthScore - (fixture.state === 'large' ? 5 : 0))) : '--');
              for (const [label, value] of [['Large values', fixture.payload.summary.unlimited], ['Flagged events', fixture.payload.summary.critical + fixture.payload.summary.high]]) {
                const tile = sidebar.getByText(label, { exact: true }).locator('..');
                assert.equal(await tile.locator(':scope > p').filter({ hasNotText: label }).textContent(), available ? String(value) : '--');
              }
            }
            for (const [label, value] of stats) {
              const tile = owner.getByText(label, { exact: true }).locator('..');
              assert.equal(await tile.count(), 1);
              await assertEvidenceReadable(tile.locator(':scope > p').filter({ hasText: label }), label);
              const number = tile.locator(':scope > p').filter({ hasNotText: label });
              assert.equal(await number.textContent(), available ? String(value) : route === '/approvals' ? '--' : '-');
            }
            for (const unsupported of ['Clean', 'Active', 'Allowance', 'Wallet health', 'Health', 'Unlimited']) {
              assert.equal(await page.getByText(unsupported, { exact: true }).count(), 0, `Unsupported current-rights label: ${unsupported}`);
            }
            if (route === '/approvals') {
              if (fixture.state === 'large') {
                const raw = page.getByText(fixture.payload.approvals[0].amountRaw, { exact: true });
                assert.equal(await raw.count(), 1);
                await assertEvidenceReadable(raw, fixture.payload.approvals[0].amountRaw);
                assert.equal(await page.getByText('Raw event value', { exact: true }).count(), 1);
                await assertEvidenceReadable(page.getByText(fixture.payload.approvals[0].recommendation, { exact: true }), fixture.payload.approvals[0].recommendation);
              } else {
                await page.getByRole('heading', { name: available ? 'No approval-event candidates returned' : 'Approval-event scan unavailable', exact: true }).waitFor();
              }
            } else {
              const entries = await page.evaluate(() => JSON.parse(localStorage.getItem('sigil.addressWatchlist.v1')));
              assert.equal(entries.length, 1);
              assert.equal(entries[0].status, fixture.storedStatus, "Stored compatible status must remain separate from the visible capability claim");
              assert.equal(entries[0].coverageStatus, fixture.payload.coverage.status);
              assert.equal(await owner.getByText(fixture.state === 'empty' ? 'No flags' : fixture.state === 'large' ? 'High risk' : 'Unavailable', { exact: true }).count(), 1);
              assert.ok((await page.locator('main').innerText()).includes("Manual refresh sends the selected address and network to Sigil's API and explorer providers."));
            }
            await scanState(`${route.slice(1)}-${fixture.state}`, route);
            if (route === '/monitor' && fixture.state === 'large') {
              failRefresh = true;
              const failure = page.waitForResponse(item => new URL(item.url()).pathname === '/api/sigil/approvals/health', { timeout: 1500 });
              await page.getByRole('button', { name: 'Check', exact: true }).click();
              assert.equal((await failure).status(), 503);
              await owner.getByText('Unavailable', { exact: true }).waitFor();
              const sidebar = page.locator('main aside');
              assert.equal(await sidebar.getByText('Coverage incomplete', { exact: true }).count(), 1);
              await assertMonitorScore('--');
              for (const label of ['Large values', 'Flagged events']) {
                assert.equal(await sidebar.getByText(label, { exact: true }).locator('..').locator(':scope > p').filter({ hasNotText: label }).textContent(), '--');
              }
              assert.equal(await page.getByText(`Review flagged approval events on ${fixture.entry.label}`, { exact: true }).count(), 0);
              assert.equal(await page.getByText(`Review large event values on ${fixture.entry.label}`, { exact: true }).count(), 0);
              assert.equal(approvalEventRequests, before + 2);
              await scanState('monitor-success-then-transport-failure', route);
            }
          }
        }
        const large = approvalEventFixtures.find(item => item.state === 'large');
        const mixed = [{ ...large.entry, status: 'high-risk', coverageStatus: 'limited', approvalSummary: large.payload.summary },
          { ...large.entry, id: `mainnet:0x${'f'.repeat(40)}`, address: `0x${'f'.repeat(40)}`, label: 'Unavailable synthetic wallet', status: 'unavailable', coverageStatus: 'unavailable', approvalSummary: large.payload.summary }];
        const beforeMixed = approvalEventRequests;
        await page.evaluate(entries => localStorage.setItem('sigil.addressWatchlist.v1', JSON.stringify(entries)), mixed);
        await page.goto(`${origin}/monitor`, { waitUntil: 'networkidle' });
        assert.equal(approvalEventRequests, beforeMixed, 'Mixed saved coverage must not trigger automatic scans');
        await assertMonitorScore('--');
        const mixedSidebar = page.locator('main aside');
        assert.equal(await mixedSidebar.getByText('Coverage incomplete', { exact: true }).count(), 1);
        for (const label of ['Large values', 'Flagged events']) {
          assert.equal(await mixedSidebar.getByText(label, { exact: true }).locator('..').locator(':scope > p').filter({ hasNotText: label }).textContent(), '--');
        }
        assert.equal(await page.getByText('Review flagged approval events on Unavailable synthetic wallet', { exact: true }).count(), 0);
        await scanState('monitor-mixed-coverage', '/monitor');
        const saved = [{ ...large.entry, id: 'duplicate-import', label: 'Missing saved coverage', address: `0x${'3'.repeat(40)}`, status: 'clean', approvalSummary: { ...large.payload.summary, totalActive: 0, unlimited: 0, critical: 0, high: 0 } },
          { ...large.entry, id: 'duplicate-import', label: 'Invalid saved summary', address: `0x${'4'.repeat(40)}`, status: 'clean', coverageStatus: 'limited', approvalSummary: { ...large.payload.summary, totalActive: -1 } },
          { ...large.entry, id: 'duplicate-import', label: 'Unavailable saved coverage', address: `0x${'5'.repeat(40)}`, status: 'clean', coverageStatus: 'unavailable', approvalSummary: large.payload.summary },
          { ...large.entry, id: 'duplicate-import', label: 'Conflicting saved label', address: `0x${'6'.repeat(40)}`, status: 'clean', coverageStatus: 'limited', approvalSummary: large.payload.summary }];
        const expectedStatuses = ['unchecked', 'unchecked', 'unavailable', 'high-risk'];
        const expectedLabels = ['Unchecked', 'Unchecked', 'Unavailable', 'High risk'];
        const beforeImport = approvalEventRequests;
        const existing = { ...large.entry, id: 'duplicate-import', label: 'Existing collision wallet', address: `0x${'b'.repeat(40)}` };
        await page.evaluate(entry => localStorage.setItem('sigil.addressWatchlist.v1', JSON.stringify([entry])), existing);
        await page.goto(`${origin}/watchlist`, { waitUntil: 'networkidle' });
        const chooser = page.waitForEvent('filechooser');
        await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
        await (await chooser).setFiles({ name: 'synthetic-watchlist.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify([{ ...large.entry, address: 123 }, ...saved])) });
        await page.locator('main article').filter({ hasText: saved[0].label }).waitFor();
        for (const route of ['/watchlist', '/monitor']) {
          if (route === '/monitor') await page.goto(`${origin}${route}`, { waitUntil: 'networkidle' });
          for (const [index, entry] of saved.entries()) {
            const row = page.locator('main article').filter({ hasText: entry.label });
            assert.equal(await row.getByText(expectedLabels[index], { exact: true }).count(), 1);
            assert.equal(await row.getByText('No flags', { exact: true }).count(), 0);
            if (index === 3) assert.equal(await row.getByText('Saved event summary; not a verified scan or current allowance assessment.', { exact: true }).count(), 1);
            if (index === 2) assert.equal(await row.getByText('Saved scan coverage is unavailable; no current allowance assessment.', { exact: true }).count(), 1);
            for (const label of ['Event candidates', 'Large values', 'Flagged events', 'Event heuristic']) {
              const number = row.getByText(label, { exact: true }).locator('..').locator(':scope > p').filter({ hasNotText: label });
              assert.equal(await number.textContent(), index === 3 ? label === 'Event heuristic' ? '10' : '1' : '-');
            }
          }
          if (route === '/monitor') {
            await assertMonitorScore('--');
            assert.equal(await page.locator('main aside').getByText('Coverage incomplete', { exact: true }).count(), 1);
          }
          const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('sigil.addressWatchlist.v1')));
          assert.equal(stored.length, 5);
          assert.equal(new Set(stored.map(entry => entry.id)).size, 5);
          assert.equal(stored.find(entry => entry.address === existing.address).id, existing.id, 'Import must preserve existing identity when incoming IDs collide');
          for (const [index, entry] of saved.entries()) assert.equal(stored.find(item => item.label === entry.label).status, expectedStatuses[index]);
          assert.equal(approvalEventRequests, beforeImport, 'Import and reload must not trigger approval requests');
          await scanState(`${route.slice(1)}-inconsistent-file-import`, route);
        }
        const beforeCollision = await page.evaluate(() => JSON.parse(localStorage.getItem('sigil.addressWatchlist.v1')));
        await page.getByRole('button', { name: `Remove ${saved[0].label}`, exact: true }).click();
        assert.equal(await page.locator('main article').filter({ hasText: saved[0].label }).count(), 0);
        assert.equal(await page.locator('main article').filter({ hasText: existing.label }).count(), 1);
        fixture = { ...large, entry: saved[3], payload: { ...large.payload, walletAddress: saved[3].address } };
        failRefresh = false;
        const collisionRow = page.locator('main article').filter({ hasText: saved[3].label });
        const refreshed = page.waitForResponse(item => new URL(item.url()).pathname === '/api/sigil/approvals/health', { timeout: 1500 });
        await collisionRow.getByRole('button', { name: 'Check', exact: true }).click();
        assert.equal((await refreshed).status(), 200);
        await collisionRow.getByText(fixture.payload.coverage.message, { exact: true }).waitFor();
        const afterCollision = await page.evaluate(() => JSON.parse(localStorage.getItem('sigil.addressWatchlist.v1')));
        assert.equal(afterCollision.length, 4);
        assert.equal(new Set(afterCollision.map(entry => entry.id)).size, 4);
        assert.deepEqual(afterCollision.find(entry => entry.address === existing.address), beforeCollision.find(entry => entry.address === existing.address), 'Remove and refresh of colliding imported IDs must preserve the original wallet exactly');
        assert.equal(approvalEventRequests, beforeImport + 1);
        await scanState('monitor-import-collision-remove-refresh', '/monitor');
        await page.close();
        continue;
      }
      if (values.history) {
        let historyPhase = "hold";
        let resolveHistory;
        const pendingHistory = new Promise(resolve => { resolveHistory = resolve; });
        await page.route("**/api/sigil/history?*", route => {
          const id = new URL(route.request().url()).searchParams.get("id");
          const fixture = id === resultId ? analysisFixture : analysisVariants.slice(0, 2).find(item => item.fixture.id === id)?.fixture;
          assert.ok(fixture, "Unknown history fixture");
          assert.equal(route.request().method(), "GET");
          historyRequests++;
          if (historyPhase === "hold") { resolveHistory(route); return; }
          return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixture) });
        });
        await page.goto(`${origin}/analysis/${resultId}`, { waitUntil: "domcontentloaded" });
        const historyRoute = await waitForIntercept(pendingHistory, "history GET interception");
        const retrieval = page.getByRole("status").filter({ hasText: "Retrieving analysis" });
        await retrieval.waitFor();
        assert.equal(await retrieval.getAttribute("aria-busy"), "true");
        assert.equal(await page.locator("main dl, main details").count(), 0);
        await scanState("history-loading", "/analysis/synthetic");
        expectedHttp.add(`GET ${historyRoute.request().url()} 404`);
        await historyRoute.fulfill({ status: 404, contentType: "application/json", body: '{"error":"Synthetic missing record"}' });
        const missing = page.getByRole("alert");
        await missing.waitFor();
        assert.equal((await missing.innerText()).replace(/\s+/g, " ").trim(), "Record Not Found This analysis record doesn't exist or the link has expired.");
        assert.equal(await retrieval.count(), 0);
        assert.equal(await page.getByRole("heading", { name: analysisFixture.summary, exact: true }).count(), 0);
        await scanState("history-not-found", "/analysis/synthetic");
        historyPhase = "fixture";
        await page.goto(`${origin}/analysis/${resultId}?cached=1`, { waitUntil: "networkidle" });
        const summary = page.getByRole("heading", { name: analysisFixture.summary, exact: true });
        await summary.waitFor();
        assert.equal(await page.getByText("Previously saved report", { exact: true }).isVisible(), true);
        let resolveFresh;
        const startFresh = async () => {
          const request = new Promise(resolve => { resolveFresh = resolve; });
          await page.getByRole("button", { name: "Re-analyze fresh", exact: true }).click();
          return waitForIntercept(request, "fresh-analysis POST interception");
        };
        await page.route("**/api/sigil/analyze", route => {
          assert.equal(route.request().method(), "POST");
          assert.deepEqual(route.request().postDataJSON(), { input: analysisFixture.input, network: analysisFixture.network, fresh: true });
          freshRequests++;
          resolveFresh(route);
        });
        const freshRoute = await startFresh();
        const pending = page.getByRole("status");
        await pending.waitFor();
        assert.equal(await pending.innerText(), "Re-analysis in progress. The previous report is still shown.");
        assert.equal(await page.getByRole("button", { name: "Analyzing", exact: false }).isDisabled(), true);
        assert.equal(await summary.isVisible(), true);
        await scanState("reanalysis-loading", "/analysis/synthetic?cached=1");
        expectedHttp.add(`POST ${freshRoute.request().url()} 503`);
        await freshRoute.fulfill({ status: 503, contentType: "application/json", body: '{"error":"synthetic-private-provider-error"}' });
        const freshError = page.getByRole("alert");
        await freshError.waitFor();
        assert.equal(await freshError.innerText(), "Re-analysis unavailable. The previous report is still shown; no fresh assessment or signing clearance was produced.");
        assert.equal(await pending.count(), 0);
        assert.equal(await summary.isVisible(), true);
        assert.equal(await page.getByRole("button", { name: "Re-analyze fresh", exact: true }).isEnabled(), true);
        assert.equal((await page.locator("main").textContent()).includes("synthetic-private-provider-error"), false);
        assert.equal(new URL(page.url()).pathname, `/analysis/${resultId}`);
        await scanState("reanalysis-error", "/analysis/synthetic?cached=1");
        for (const [state, body] of [
          ["missing-id", {}], ["null-body", null],
          ["path-id", { id: `${resultId}/../synthetic-private-response?cached=1` }],
          ["old-id", { id: resultId.toUpperCase() }],
        ]) {
          const malformedRoute = await startFresh();
          await pending.waitFor();
          assert.equal(await freshError.count(), 0, "Retry clears prior failure feedback");
          await malformedRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
          await freshError.waitFor();
          assert.equal(await freshError.innerText(), "Re-analysis unavailable. The previous report is still shown; no fresh assessment or signing clearance was produced.");
          assert.equal(await pending.count(), 0);
          assert.equal(await summary.isVisible(), true);
          assert.equal(await page.getByRole("button", { name: "Re-analyze fresh", exact: true }).isEnabled(), true);
          assert.equal(new URL(page.url()).pathname, `/analysis/${resultId}`);
          assert.equal((await page.locator("main").textContent()).includes("synthetic-private-response"), false);
          await scanState(`reanalysis-malformed-${state}`, "/analysis/synthetic?cached=1");
        }
        const next = analysisVariants[0].fixture;
        await page.evaluate(id => history.pushState(null, "", `/analysis/${id}?cached=1`), next.id);
        await page.getByRole("heading", { name: next.summary, exact: true }).waitFor();
        assert.equal(await freshError.count(), 0, "Failed mutation feedback must not follow a different record");
        assert.equal(await summary.count(), 0);
        await scanState("history-error-record-navigation", "/analysis/next-synthetic?cached=1");
        await page.evaluate(id => history.pushState(null, "", `/analysis/${id}?cached=1`), resultId);
        await summary.waitFor();
        await page.waitForLoadState("networkidle");
        const retryRoute = await startFresh();
        await pending.waitFor();
        assert.equal(await freshError.count(), 0);
        assert.equal(await summary.isVisible(), true);
        const fresh = analysisVariants[1].fixture;
        await retryRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fresh) });
        const freshSummary = page.getByRole("heading", { name: fresh.summary, exact: true });
        await freshSummary.waitFor();
        assert.equal(new URL(page.url()).pathname, `/analysis/${fresh.id}`);
        assert.equal(await summary.count(), 0);
        assert.equal(await freshError.count(), 0);
        assert.equal(await pending.count(), 0);
        assert.equal(await page.getByText("Previously saved report", { exact: true }).count(), 0);
        const riskBanner = page.getByText(`${String.fromCodePoint(0x1f6a8)} Do Not Sign`, { exact: true });
        await riskBanner.waitFor();
        assert.equal(await page.getByRole("button", { name: /Share This Transaction on/ }).locator("span").first().evaluate(element => getComputedStyle(element).color),
          await riskBanner.evaluate(element => getComputedStyle(element).color), "Share color must match the current validated verdict, not stale outer metadata");
        await scanState("reanalysis-success", "/analysis/fresh-synthetic");
        await page.evaluate(id => history.pushState(null, "", `/analysis/${id}?cached=1`), next.id);
        await page.getByRole("heading", { name: next.summary, exact: true }).waitFor();
        assert.equal(await freshError.count(), 0, "Previous record's mutation error must not follow client-side navigation");
        assert.equal(await summary.count(), 0);
        assert.equal(await page.getByRole("status").count(), 0);
        await scanState("history-client-navigation", "/analysis/next-synthetic?cached=1");
        await page.evaluate(() => history.replaceState(null, "", `${location.pathname}?cached=10`));
        await page.getByRole("button", { name: "Re-analyze fresh", exact: true }).waitFor({ state: "hidden" });
        assert.equal(await page.getByText("Previously saved report", { exact: true }).count(), 0);
        await page.evaluate(() => history.replaceState(null, "", `${location.pathname}?other=1&cached=1`));
        await page.getByRole("button", { name: "Re-analyze fresh", exact: true }).waitFor();
        assert.equal(await page.getByText("Previously saved report", { exact: true }).isVisible(), true);
        const lateRoute = await startFresh();
        await pending.waitFor();
        await page.evaluate(id => history.pushState(null, "", `/analysis/${id}?cached=1`), resultId);
        await summary.waitFor();
        await page.waitForLoadState("networkidle");
        assert.equal(await pending.count(), 0);
        await lateRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fresh) });
        await page.getByRole("button", { name: "Re-analyze fresh", exact: true }).waitFor();
        assert.equal(new URL(page.url()).pathname, `/analysis/${resultId}`);
        assert.equal(await summary.isVisible(), true);
        assert.equal(await freshSummary.count(), 0);
        await scanState("reanalysis-late-record-ignored", "/analysis/synthetic?cached=1");
        for (const [state, body] of [["success", fresh], ["malformed", null]]) {
          const roundtripRoute = await startFresh();
          await pending.waitFor();
          await page.evaluate(id => history.pushState(null, "", `/analysis/${id}?cached=1`), next.id);
          await page.getByRole("heading", { name: next.summary, exact: true }).waitFor();
          await page.waitForLoadState("networkidle");
          await page.evaluate(id => history.pushState(null, "", `/analysis/${id}?cached=1`), resultId);
          await summary.waitFor();
          await page.waitForLoadState("networkidle");
          assert.equal(await pending.count(), 0, "Returning to the report must not revive obsolete status");
          assert.equal(await freshError.count(), 0);
          await roundtripRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
          await page.getByRole("button", { name: "Re-analyze fresh", exact: true }).waitFor();
          assert.equal(new URL(page.url()).pathname, `/analysis/${resultId}`);
          assert.equal(await summary.isVisible(), true);
          assert.equal(await freshSummary.count(), 0);
          assert.equal(await freshError.count(), 0, "Obsolete malformed completion must not produce current feedback");
          await scanState(`reanalysis-roundtrip-${state}-ignored`, "/analysis/synthetic?cached=1");
        }
        const unmountedRoute = await startFresh();
        await pending.waitFor();
        await page.evaluate(() => history.pushState(null, "", "/"));
        await page.getByRole("heading", { name: routes["/"], exact: true }).waitFor();
        const completion = page.waitForResponse(response => response.request() === unmountedRoute.request());
        await unmountedRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fresh) });
        const response = await waitForIntercept(completion, "unmounted fresh response");
        await response.finished();
        await scanState("reanalysis-late-unmounted-ignored", "/");
        assert.equal(new URL(page.url()).pathname, "/");
        assertRenderedRoute(await renderedSnapshot(page, errors, assetFailures), routes["/"]);
        assert.equal(await freshSummary.count(), 0);
        assert.equal(expectedHttp.size, 0);
        assert.deepEqual(observedHttp, [404, 503]);
        await page.close();
        continue;
      }
      if (values.variants) {
        const revealJargon = async trigger => {
          await waitForIntercept(trigger.evaluate(element => new Promise(resolve => {
            element.scrollIntoView({ block: "center", behavior: "instant" });
            requestAnimationFrame(() => requestAnimationFrame(resolve));
          })), "jargon scroll completion");
        };
        const focusJargon = async trigger => {
          await revealJargon(trigger);
          await trigger.evaluate(element => element.focus({ preventScroll: true }));
          await page.waitForFunction(element => {
            const id = element.getAttribute("aria-describedby");
            return id && document.getElementById(id);
          }, await trigger.elementHandle(), { timeout: 1500 });
        };
        for (const variant of analysisVariants) {
          await page.goto(`${origin}/analysis/${variant.fixture.id}`, { waitUntil: "networkidle" });
          if (variant.state === "invalid-evidence") {
            const alert = page.getByRole("alert");
            await alert.waitFor();
            const alertText = "Analysis unavailable: this report's evidence could not be validated. Run a fresh analysis. No risk verdict or score is shown.";
            assert.equal(await alert.innerText(), alertText);
            assert.equal((await page.locator("main").innerText()).replace(/\s+/g, " ").trim(), `Scanner ${alertText}`, "Invalid evidence must render only navigation and the bounded alert");
            assert.equal(await page.getByRole("heading", { name: variant.fixture.summary, exact: true }).count(), 0);
            assert.equal(await page.getByRole("button", { name: "Copy", exact: true }).count(), 0);
            assert.equal(await page.getByRole("button", { name: /Share This Transaction on/ }).count(), 0);
            assert.equal(await page.locator("main dl, main details").count(), 0);
            for (const label of ["Should I sign this?", "No Concrete Warning Signs Detected", "Proceed with Caution", "Do Not Sign"]) {
              assert.equal(await page.getByText(label, { exact: false }).count(), 0);
            }
          } else {
            const narrative = page.locator("main h2").filter({ hasText: variant.fixture.summary });
            await narrative.waitFor();
            assert.equal(await narrative.textContent(), variant.fixture.summary);
            const verdict = variant.verdict || variant.fixture.verdict;
            const emoji = verdict === "safe" ? String.fromCodePoint(0x2705)
              : verdict === "dangerous" ? String.fromCodePoint(0x1f6a8) : String.fromCodePoint(0x26a0, 0xfe0f);
            const banner = page.getByText(`${emoji} ${variant.label}`, { exact: true });
            assert.equal(await banner.count(), 1);
            await banner.waitFor();
            assert.equal(await page.getByRole("button", { name: /Share This Transaction on/ }).locator("span").first().evaluate(element => getComputedStyle(element).color),
              await banner.evaluate(element => getComputedStyle(element).color));
            const status = page.getByRole("status");
            if (variant.state.startsWith("legacy-approval-")) {
              const info = variant.fixture.approvalInfo;
              const title = info.isRevoke ? "Zero-Value Approval Intent" : info.isUnlimited ? "Large-Value Approval Intent" : "Approval Calldata Detected";
              await assertEvidenceReadable(page.getByRole("heading", { name: title, exact: true }), title);
              await assertEvidenceReadable(page.getByText("Approval Inspector", { exact: true }), "Approval Inspector");
              for (const label of ["Amount", "Method", "Who Gets Access", "Token Contract", "Risk Level", "You've interacted with this spender before", "500.00 tokens"]) {
                await assertEvidenceReadable(page.getByText(label, { exact: true }), label);
              }
              const priorRow = page.getByText("500.00 tokens", { exact: true }).locator("xpath=../..");
              const priorNetwork = priorRow.getByText("mainnet", { exact: true });
              const priorTime = priorRow.locator(":scope > span");
              await assertEvidenceReadable(priorNetwork, "mainnet");
              assert.equal(await priorTime.count(), 1);
              const priorMonths = await page.evaluate(iso => Math.floor((Date.now() - Date.parse(iso)) / 86_400_000 / 30), info.priorApprovals[0].analyzedAt);
              assert.ok(priorMonths > 0, "Synthetic history date must be in the recorded past");
              await assertEvidenceReadable(priorTime, `${priorMonths} month${priorMonths > 1 ? "s" : ""} ago`);
              const networkBounds = await priorNetwork.boundingBox();
              const timeBounds = await priorTime.boundingBox();
              assertSeparatedLabels(networkBounds, timeBounds);
              if (info.isUnlimited && !info.isRevoke) {
                await assertEvidenceReadable(page.getByText("Token currently trading at", { exact: false }), "Token currently trading at $1.00 per token");
              }
              const boundedCopy = info.isRevoke
                ? "The calldata contains a zero-value approval. This may attempt a revoke, but token semantics and the resulting allowance were not checked. A failed or pending call does not confirm removal."
                : info.isUnlimited
                ? "The requested spender is not in Sigil's local registry. A large raw value may represent broad ERC20 approval or an NFT token ID; executed permission and source verification are not established."
                : "500.00 tokens \u00d7 $1.00 per token";
              await assertEvidenceReadable(page.getByText(boundedCopy, { exact: true }), boundedCopy);
              assert.equal(await page.getByText("0 \u2014 Revoke not confirmed", { exact: true }).count(), info.isRevoke ? 1 : 0);
              assert.equal(await page.getByText("LARGE RAW VALUE", { exact: true }).count(), info.isUnlimited ? 1 : 0);
            }
            if (variant.version) {
              for (const label of ["Risk Findings", "Analysis Limits", "Observations", "Supporting Evidence"]) {
                assert.equal(await page.getByRole("heading", { name: label, exact: true }).isVisible(), true);
              }
            } else {
              for (const label of ["Threat Vectors", "Trust Indicators"]) {
                assert.equal(await page.getByRole("heading", { name: label, exact: true }).isVisible(), true);
              }
              for (const text of ["No threats detected.", "No positive indicators found."]) {
                assert.equal(await page.getByText(text, { exact: true }).isVisible(), true);
              }
            }
            if (variant.version === "findings-v2") {
              assert.equal(await status.count(), 0);
              const score = page.locator("dt").filter({ hasText: /^Decision score$/ });
              await score.waitFor();
              assert.equal(await score.locator("xpath=following-sibling::dd").isVisible(), true);
              assert.equal(await score.evaluate(element => element.nextElementSibling?.textContent), `${variant.score}/100`);
              if (variant.state === "current-risk") {
                const riskText = "Synthetic exact historical attribution, not current exploitability or user loss.";
                const risk = page.locator("main li").filter({ hasText: riskText });
                assert.equal(await risk.count(), 1);
                await risk.waitFor();
                assert.equal(await risk.evaluate(element => [...element.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join("").trim()), riskText);
                assert.equal(await page.getByText("No concrete risk findings in the acquired data.", { exact: true }).count(), 0);
              }
            } else {
              assert.equal(await status.count(), 1);
              assert.equal(await status.innerText(), variant.version === "findings-v1"
                ? "Legacy validated report (findings-v1): narrower coverage. Separate evidence risk, uncertainty and adapter capabilities were not recorded. Run a fresh analysis for current supported checks."
                : "Legacy report: these statements were not checked by the current finding validator. Run a fresh analysis before relying on them.");
              assert.equal(await page.locator("dt").filter({ hasText: /^Decision score$/ }).count(), 0);
            }
          }
          await scanState(variant.state, "/analysis/synthetic-variant");
          if (variant.state.startsWith("legacy-approval-")) {
            const method = page.locator('[tabindex="0"]').filter({ hasText: /^approve\(\)$/ });
            assert.equal(await method.count(), 1);
            // Exercise native sequential focus without pre-scrolling the trigger.
            await page.locator("main").focus();
            await waitForIntercept(page.evaluate(() => new Promise(resolve => {
              window.scrollTo(0, 0);
              requestAnimationFrame(() => requestAnimationFrame(resolve));
            })), "keyboard initial scroll completion");
            assert.equal(await page.locator("main").evaluate(element => element === document.activeElement), true);
            await page.getByRole("tooltip").waitFor({ state: "hidden", timeout: 1500 });
            const initialMethodBounds = await method.boundingBox();
            if (name === "mobile") assert.ok(initialMethodBounds.y >= page.viewportSize().height, "Mobile method must initially be offscreen");
            await page.evaluate(() => {
              window.__p00KeyboardTrace = [];
              window.__p00KeyboardListener = event => {
                const active = document.activeElement;
                window.__p00KeyboardTrace.push({ type: event.type, text: active?.textContent?.slice(0, 100),
                  description: active?.getAttribute("aria-describedby"), scrollY });
                if (window.__p00KeyboardTrace.length > 40) window.__p00KeyboardTrace.shift();
              };
              document.addEventListener("focusin", window.__p00KeyboardListener, true);
              window.addEventListener("scroll", window.__p00KeyboardListener, true);
            });
            let tabSteps = 0;
            while (!(await method.evaluate(element => element === document.activeElement)) && tabSteps < 32) {
              await page.keyboard.press("Tab");
              tabSteps++;
            }
            assert.ok(tabSteps > 0 && tabSteps <= 32, "Sequential Tab must reach the jargon trigger within the bounded focus order");
            assert.deepEqual(await page.evaluate(() => window.__p00KeyboardTrace.filter(event => event.type === "focusin").map(event => event.text)),
              ["Scanner", "Share This Transaction onX / Twitter", "approve()"],
              "Fixture sequential focus order must not wrap or skip expected controls");
            assert.equal(await method.evaluate(element => element === document.activeElement && element.matches(":focus-visible")), true);
            const keyboardTooltip = page.getByRole("tooltip");
            const assertKeyboardOpen = async () => {
              await page.waitForFunction(element => {
                const id = element.getAttribute("aria-describedby");
                const description = id && document.getElementById(id);
                return element === document.activeElement && element.matches(":focus-visible") && ["instant-open", "delayed-open"].includes(element.dataset.state) &&
                  description?.textContent === "approve: Grants a contract permission to spend a specific token from your wallet on your behalf." &&
                  ["instant-open", "delayed-open"].includes(description.parentElement.dataset.state) && document.querySelectorAll('[role="tooltip"]').length === 1;
              }, await method.elementHandle(), { timeout: 1500 }).catch(async error => {
                console.log(JSON.stringify({ keyboardFailure: await method.evaluate(element => ({
                  active: element === document.activeElement,
                  description: element.getAttribute("aria-describedby"),
                  scrollY, trace: window.__p00KeyboardTrace,
                  tooltips: [...document.querySelectorAll('[role="tooltip"]')].map(tip => ({ id: tip.id, text: tip.textContent })),
                })) }));
                throw error;
              });
              const id = await method.getAttribute("aria-describedby");
              assert.ok(id);
              assert.equal(await keyboardTooltip.getAttribute("id"), id);
              const panel = keyboardTooltip.locator("..");
              await page.waitForFunction(descriptionId => {
                const panel = document.getElementById(descriptionId)?.parentElement;
                const rect = panel?.getBoundingClientRect();
                return rect && rect.width > 0 && rect.height > 0 && rect.x >= 4 && rect.right <= innerWidth - 4 && rect.y >= 0 && rect.bottom <= innerHeight;
              }, id, { timeout: 1500 });
              await assertEvidenceReadable(panel.locator(":scope > span").nth(0), "approve");
              await assertEvidenceReadable(panel.locator(":scope > span").nth(1), "Grants a contract permission to spend a specific token from your wallet on your behalf.");
              const trigger = await method.boundingBox();
              const header = await page.locator("header").boundingBox();
              assert.ok(trigger && header && trigger.y >= header.y + header.height && trigger.y + trigger.height <= page.viewportSize().height,
                "Native focused trigger must be visible and unobscured by the sticky header");
              return id;
            };
            const keyboardId = await assertKeyboardOpen();
            if (name === "mobile") {
              assert.ok(await page.evaluate(() => window.scrollY) > 0, "Mobile native Tab must exercise automatic page scrolling to the offscreen method");
            }
            await scanState(`${variant.state}-tooltip-tab`, "/analysis/synthetic-variant", true);
            assert.equal(await assertKeyboardOpen(), keyboardId, "Tab description must persist through the scan");
            const keyboardUrl = page.url();
            await page.keyboard.press("Escape");
            await keyboardTooltip.waitFor({ state: "hidden", timeout: 1500 });
            assert.equal(await method.evaluate(element => element === document.activeElement), true);
            assert.equal(await method.getAttribute("aria-describedby"), null);
            assert.equal(await method.getAttribute("data-state"), "closed");
            await page.keyboard.press("Enter");
            assert.equal(await assertKeyboardOpen(), keyboardId);
            await page.waitForTimeout(700);
            assert.equal(await assertKeyboardOpen(), keyboardId, "Enter-opened explanation must persist without refocusing");
            await page.keyboard.press("Escape");
            await keyboardTooltip.waitFor({ state: "hidden", timeout: 1500 });
            assert.equal(await method.getAttribute("aria-describedby"), null);
            assert.equal(await method.getAttribute("data-state"), "closed");
            assert.equal(await method.evaluate(element => element === document.activeElement), true);
            assert.equal(page.url(), keyboardUrl);
            await page.locator("main").focus();
            await page.evaluate(() => {
              document.removeEventListener("focusin", window.__p00KeyboardListener, true);
              window.removeEventListener("scroll", window.__p00KeyboardListener, true);
            });
            await focusJargon(method);
            const tooltip = page.getByRole("tooltip");
            await tooltip.waitFor();
            assert.equal(await tooltip.count(), 1);
            const descriptionId = await method.getAttribute("aria-describedby");
            assert.ok(descriptionId);
            assert.equal(await tooltip.getAttribute("id"), descriptionId);
            // Radix exposes a hidden description inside its visible portal content.
            const content = tooltip.locator("..");
            await page.waitForFunction(id => {
              const content = document.getElementById(id)?.parentElement;
              if (!content) return false;
              const rect = content.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0 && rect.x >= 4 && rect.right <= innerWidth - 4 && rect.y >= 0 && rect.bottom <= innerHeight;
            }, descriptionId, { timeout: 1500 });
            const tipBounds = await content.boundingBox();
            await assertEvidenceReadable(content.locator(":scope > span").nth(0), "approve");
            await assertEvidenceReadable(content.locator(":scope > span").nth(1), "Grants a contract permission to spend a specific token from your wallet on your behalf.");
            assert.equal(await tooltip.textContent(), "approve: Grants a contract permission to spend a specific token from your wallet on your behalf.");
            assert.ok(tipBounds && tipBounds.width > 0 && tipBounds.height > 0);
            const viewport = page.viewportSize();
            assert.ok(tipBounds.x >= 4 && tipBounds.x + tipBounds.width <= viewport.width - 4 &&
              tipBounds.y >= 0 && tipBounds.y + tipBounds.height <= viewport.height,
            `Focused tooltip must remain inside the viewport: ${JSON.stringify({ tipBounds, viewport })}`);
            await scanState(`${variant.state}-tooltip`, "/analysis/synthetic-variant", true);
            await method.press("Escape");
            await tooltip.waitFor({ state: "hidden", timeout: 1500 });
            assert.equal(await method.evaluate(element => element === document.activeElement), true);
            await page.locator("main").focus();
            await method.hover();
            await tooltip.waitFor();
            await content.hover();
            await page.waitForTimeout(700);
            assert.equal(await tooltip.count(), 1, "Pointer must be able to enter tooltip content without dismissing it");
            await scanState(`${variant.state}-tooltip-hover`, "/analysis/synthetic-variant", true);
            await page.mouse.move(0, 0);
            await tooltip.waitFor({ state: "hidden", timeout: 1500 });
            if (variant.state === "legacy-approval-large") {
              const repeated = page.getByRole("button", { name: "approve", exact: true });
              assert.ok(await repeated.count() >= 2, "Repeated jargon requires separate descriptions");
              const ids = [];
              for (let index = 0; index < await repeated.count(); index++) {
                const term = repeated.nth(index);
                await focusJargon(term);
                await tooltip.waitFor();
                const id = await term.getAttribute("aria-describedby");
                assert.ok(id);
                assert.equal(await tooltip.getAttribute("id"), id);
                ids.push(id);
                await term.press("Escape");
                await tooltip.waitFor({ state: "hidden", timeout: 1500 });
              }
              assert.equal(new Set(ids).size, ids.length, "Repeated terms must not reuse description IDs");
              await page.locator("main").focus();
            }
            if (name === "mobile") {
              assert.ok(await page.evaluate(() => navigator.maxTouchPoints) > 0, "Touch check requires a touch-enabled context");
              await revealJargon(method);
              await method.tap();
              await tooltip.waitFor({ timeout: 1500 });
              assert.equal(await tooltip.textContent(), "approve: Grants a contract permission to spend a specific token from your wallet on your behalf.");
              await scanState(`${variant.state}-tooltip-touch`, "/analysis/synthetic-variant", true);
              assert.equal(await tooltip.count(), 1, "Outside dismissal must start with an open tooltip");
              const triggerBounds = await method.boundingBox();
              assert.ok(triggerBounds);
              await page.touchscreen.tap(viewport.width - 2, triggerBounds.y + triggerBounds.height / 2);
              await tooltip.waitFor({ state: "hidden", timeout: 1500 });
            }
          }
        }
        await page.close();
        continue;
      }
      if (values.results) {
        await page.goto(`${origin}/analysis/${resultId}?cached=1`, { waitUntil: "networkidle" });
        const summary = page.getByRole("heading", { name: analysisFixture.summary, exact: true });
        await summary.waitFor();
        assert.equal(resultRequests, name === "desktop" ? 1 : 4);
        for (const label of ["Risk Findings", "Analysis Limits", "Observations", "Supporting Evidence"]) {
          assert.equal(await page.getByRole("heading", { name: label, exact: true }).isVisible(), true);
        }
        assert.equal(await page.locator("main details").count(), 3);
        assert.equal(await page.locator("main details[open]").count(), 0);
        await scanState("validated-collapsed", "/analysis/synthetic?cached=1");
        for (const detail of await page.locator("main details > summary").all()) {
          await detail.focus();
          await page.keyboard.press("Enter");
        }
        assert.equal(await page.locator("main details[open]").count(), 3);
        for (const text of ["Decoded intent (not executed effects)", "Contract-reported state (not effective rights)", "Raw amount: 500000000"]) {
          assert.equal(await page.getByText(text, { exact: true }).isVisible(), true);
        }
        const evidence = analysisFixture.details.validatedReport.evidence.find(item => item.kind === "observed");
        const argument = evidence.input.arguments[0];
        for (const text of [`${argument.name} (${argument.type}): ${JSON.stringify(argument.value)}`,
          `Contract-declared decimals: ${evidence.tokenStates[0].decimals}`,
          `Raw balance: ${evidence.tokenStates[0].balanceRaw}`,
          `Raw permission value: ${evidence.permissionStates[0].rawValue}`]) {
          assert.equal(await page.getByText(text, { exact: true }).isVisible(), true);
        }
        const source = page.getByRole("link", { name: "Synthetic source reference", exact: true });
        assert.equal(await source.isVisible(), true);
        assert.equal(await source.getAttribute("href"), "https://example.com/synthetic-evidence");
        assert.equal(await summary.isVisible(), true);
        await scanState("validated-expanded", "/analysis/synthetic?cached=1");
        assert.deepEqual(await page.evaluate(() => window.__p00ShareCalls), [], "Sharing must not open a popup before the explicit click");
        await page.getByRole("button", { name: /Share This Transaction on/ }).click();
        const shareCalls = await page.evaluate(() => window.__p00ShareCalls);
        assert.equal(shareCalls.length, 1);
        const [shareUrl, shareTarget, shareFeatures] = shareCalls[0];
        const share = new URL(shareUrl);
        assert.equal(share.origin, "https://twitter.com");
        assert.equal(share.pathname, "/intent/tweet");
        assert.equal(share.searchParams.size, 1);
        const draft = share.searchParams.get("text");
        assert.equal(draft, `Sigil: No concrete risk findings in acquired data. Coverage: partial. No safety guarantee or signing clearance.\n${origin}`);
        assert.ok(draft.includes("No concrete risk findings in acquired data. Coverage: partial."));
        assert.ok(draft.includes("No safety guarantee or signing clearance."));
        assert.ok(draft.endsWith(origin));
        for (const privateValue of [resultId, analysisFixture.input, analysisFixture.summary, analysisFixture.verdictReason]) {
          assert.equal(draft.includes(privateValue), false);
        }
        assert.equal(shareTarget, "_blank");
        assert.equal(shareFeatures, "noopener,noreferrer,width=600,height=500");
        assert.deepEqual(await page.evaluate(() => window.__p00ClipboardWrites), []);
        await page.getByRole("button", { name: "Copy", exact: true }).click();
        await page.getByText("Copy failed", { exact: true }).waitFor();
        assert.equal(await page.getByText("Clipboard access is unavailable. Nothing was copied.", { exact: true }).isVisible(), true);
        assert.equal(await page.getByText("Copied", { exact: true }).count(), 0);
        assert.deepEqual(await page.evaluate(() => window.__p00ClipboardWrites), [analysisFixture.input]);
        await scanState("clipboard-error", "/analysis/synthetic?cached=1");
        await page.getByRole("button", { name: "Dismiss notification", exact: true }).focus();
        await page.keyboard.press("Enter");
        await page.getByText("Copy failed", { exact: true }).waitFor({ state: "hidden" });
        await page.evaluate(() => { window.__p00ClipboardMode = "success"; });
        await page.getByRole("button", { name: "Copy", exact: true }).click();
        await page.getByText("Copied", { exact: true }).waitFor();
        assert.equal(await page.getByText("Input copied to clipboard.", { exact: true }).isVisible(), true);
        assert.equal(await page.getByText("Copy failed", { exact: true }).count(), 0);
        assert.deepEqual(await page.evaluate(() => window.__p00ClipboardWrites), [analysisFixture.input, analysisFixture.input]);
        await scanState("clipboard-success", "/analysis/synthetic?cached=1");
        await page.getByRole("button", { name: "Dismiss notification", exact: true }).focus();
        await page.keyboard.press("Enter");
        await page.getByText("Copied", { exact: true }).waitFor({ state: "hidden" });
        await page.goto(`${origin}/analysis/${nestedFixture.id}`, { waitUntil: "networkidle" });
        await page.getByRole("heading", { name: nestedFixture.summary, exact: true }).waitFor();
        const nestedEvidence = nestedFixture.details.validatedReport.evidence.find(item => item.kind === "observed");
        const recorded = page.locator("main details").filter({ has: page.getByText(nestedEvidence.value, { exact: true }) });
        assert.equal(await recorded.count(), 1);
        const subcalls = recorded.locator("details");
        assert.equal(await page.locator("main details").count(), 6);
        assert.equal(await subcalls.count(), 3);
        assert.equal(await page.locator("main details[open]").count(), 0);
        const topSignature = `${nestedEvidence.input.signature} - partial`;
        assert.equal(await page.getByText(topSignature, { exact: true }).isVisible(), false);
        await scanState("nested-collapsed", "/analysis/nested-synthetic");
        const toggle = async detail => {
          const control = detail.locator(":scope > summary");
          await control.focus();
          if (await control.innerText() !== "Recorded evidence") {
            const box = await control.boundingBox();
            assert.ok(box && box.height >= 24 && box.width >= 24, "Nested summary target must be at least 24px");
            const focus = await control.evaluate(element => ({ visible: element.matches(':focus-visible'), style: getComputedStyle(element).outlineStyle, width: getComputedStyle(element).outlineWidth }));
            assert.equal(focus.visible, true);
            assert.equal(focus.style, 'solid');
            assert.ok(parseFloat(focus.width) >= 2);
          }
          await page.keyboard.press("Enter");
        };
        await toggle(recorded);
        assert.equal(await page.getByText(topSignature, { exact: true }).isVisible(), true);
        const parentCall = nestedEvidence.input.subcalls[0];
        const childSignature = `${parentCall.signature} - partial`;
        const leafCall = parentCall.subcalls[0];
        const leafSignature = `${leafCall.signature} - available`;
        assert.equal(await page.getByText(childSignature, { exact: true }).isVisible(), false);
        for (const text of [
          `calls (bytes[]): ${JSON.stringify(nestedEvidence.input.arguments[0].value)}`,
          `Token ${nestedEvidence.tokenStates[1].address}; block 0x123; unavailable`,
          "synthetic_token_state_unavailable", "Owner: unknown",
          `Caller: ${nestedEvidence.permissionStates[1].caller}`,
          `Raw token ID: ${nestedEvidence.permissionStates[1].tokenIdRaw}`, "Raw permission value: 1",
        ]) assert.equal(await recorded.getByText(text, { exact: true }).isVisible(), true);
        assert.equal(await recorded.getByRole("heading", { name: "Contract-reported state (not effective rights)", exact: true }).isVisible(), true);
        assert.equal(await recorded.getByText("Interface responses are observations, not authenticated economics or permission effectiveness.", { exact: true }).isVisible(), true);
        for (const state of nestedEvidence.permissionStates) {
          const row = recorded.getByText(`${state.kind}; token ${state.token}; block ${state.blockTag}`, { exact: true }).locator('..');
          assert.equal(await row.count(), 1);
          for (const text of [`Owner: ${state.owner ?? 'unknown'}`, `Spender: ${state.spender}`, `Raw permission value: ${state.rawValue}`,
            ...(state.caller ? [`Caller: ${state.caller}`] : []), ...(state.tokenIdRaw ? [`Raw token ID: ${state.tokenIdRaw}`] : [])]) {
            assert.equal(await row.getByText(text, { exact: true }).isVisible(), true);
            await assertEvidenceReadable(row.getByText(text, { exact: true }), text);
          }
          if (!state.caller) assert.equal(await row.getByText(/^Caller:/).count(), 0);
        }
        const unavailableRow = recorded.getByText(`Token ${nestedEvidence.tokenStates[1].address}; block 0x123; unavailable`, { exact: true }).locator('..');
        assert.equal(await unavailableRow.getByText(nestedEvidence.tokenStates[1].reason, { exact: true }).isVisible(), true);
        assert.equal(await unavailableRow.getByText(/^(?:Raw balance|Contract-declared decimals):/).count(), 0);
        const assertCall = async (container, call) => {
          for (const text of [`${call.signature ?? 'No decoded signature'} - ${call.status}`,
            `ABI provenance: ${call.provenance.scope}; network ${call.provenance.network}; address ${call.provenance.address}; block ${call.provenance.blockTag}.`,
            `ABI address: ${call.provenance.abiAddress}`,
            `${call.historicalCertainty ? 'Historically bound ABI.' : 'Historical execution semantics are not established.'} ${call.reason ?? ''}`.trim(),
            ...(call.arguments ?? []).map(arg => `${arg.name} (${arg.type}): ${JSON.stringify(arg.value)}`)]) {
            const matches = [];
            for (const paragraph of await container.locator(':scope > div > p').all()) {
              if ((await paragraph.textContent()).trim() === text) matches.push(paragraph);
            }
            assert.equal(matches.length, 1, 'Evidence context must belong to this call, not a descendant');
            const exact = matches[0];
            assert.equal(await exact.isVisible(), true);
            await assertEvidenceReadable(exact, text);
          }
        };
        await assertCall(recorded, nestedEvidence.input);
        await scanState("nested-parent-expanded", "/analysis/nested-synthetic");
        await toggle(subcalls.nth(0));
        await toggle(subcalls.nth(2));
        assert.equal(await page.getByText(childSignature, { exact: true }).isVisible(), true);
        assert.equal(await page.getByText(leafSignature, { exact: true }).isVisible(), false);
        assert.equal(await subcalls.nth(0).getByText(`positions (tuple[]): ${JSON.stringify(parentCall.arguments[0].value)}`, { exact: true }).isVisible(), true);
        assert.equal(await subcalls.nth(2).getByText("No decoded signature - unavailable", { exact: true }).isVisible(), true);
        assert.equal(await subcalls.nth(2).getByText("Historical execution semantics are not established. synthetic_unknown_selector", { exact: true }).isVisible(), true);
        assert.equal(await subcalls.nth(2).locator("details").count(), 0);
        await assertCall(subcalls.nth(0), parentCall);
        await assertCall(subcalls.nth(2), nestedEvidence.input.subcalls[1]);
        await scanState("nested-children-expanded", "/analysis/nested-synthetic");
        await toggle(subcalls.nth(1));
        assert.equal(await page.getByText(leafSignature, { exact: true }).isVisible(), true);
        assert.equal(await subcalls.nth(1).getByText("Historically bound ABI.", { exact: true }).isVisible(), true);
        for (const argument of leafCall.arguments) {
          assert.equal(await subcalls.nth(1).getByText(`${argument.name} (${argument.type}): ${JSON.stringify(argument.value)}`, { exact: true }).isVisible(), true);
        }
        assert.equal(await page.locator("main details[open]").count(), 4);
        await assertCall(subcalls.nth(1), leafCall);
        const leafArgumentText = `amount (uint256): ${JSON.stringify(leafCall.arguments[1].value)}`;
        const leafArgument = subcalls.nth(1).getByText(leafArgumentText, { exact: true });
        for (const ancestor of [false, true]) {
          const original = await leafArgument.evaluate((element, parent) => {
            const target = parent ? element.parentElement : element;
            const original = target.getAttribute('style');
            target.style.maxHeight = '1px'; target.style.overflow = 'hidden';
            return original;
          }, ancestor);
          try { await assert.rejects(() => assertEvidenceReadable(leafArgument, leafArgumentText), /Evidence (?:text must not overflow|must not be cut)/); }
          finally { await leafArgument.evaluate((element, { parent, original }) => {
            const target = parent ? element.parentElement : element;
            if (original === null) target.removeAttribute('style'); else target.setAttribute('style', original);
          }, { parent: ancestor, original }); }
        }
        await assertEvidenceReadable(leafArgument, leafArgumentText);
        await scanState("nested-grandchild-expanded", "/analysis/nested-synthetic");
        for (const [index, text] of [[1, leafSignature], [0, childSignature], [2, "No decoded signature - unavailable"]]) {
          await toggle(subcalls.nth(index));
          assert.equal(await subcalls.nth(index).getAttribute('open'), null);
          assert.equal(await subcalls.nth(index).getByText(text, { exact: true }).isVisible(), false);
        }
        await scanState("nested-children-reclosed", "/analysis/nested-synthetic");
        for (const index of [0, 1, 2]) await toggle(subcalls.nth(index));
        await toggle(recorded);
        for (const text of [topSignature, childSignature, leafSignature, "No decoded signature - unavailable"]) {
          assert.equal(await recorded.getByText(text, { exact: true }).isVisible(), false);
        }
        assert.equal(await page.getByRole("heading", { name: nestedFixture.summary, exact: true }).isVisible(), true);
        await scanState("nested-parent-reclosed", "/analysis/nested-synthetic");
        await page.goto(`${origin}/analysis/${producerNestedFixture.id}`, { waitUntil: "networkidle" });
        await page.getByRole("heading", { name: producerNestedFixture.summary, exact: true }).waitFor();
        const producerEvidence = producerNestedFixture.details.validatedReport.evidence.find(item => item.kind === 'decoded_intent');
        const producerRecorded = page.locator('main details').filter({ has: page.getByText(producerEvidence.value, { exact: true }) });
        assert.equal(await producerRecorded.count(), 1);
        assert.equal(await producerRecorded.locator('details').count(), 3);
        await scanState('producer-nested-collapsed', '/analysis/producer-synthetic');
        await toggle(producerRecorded);
        for (const child of await producerRecorded.locator('details').all()) await toggle(child);
        await assertCall(producerRecorded, producerEvidence.input);
        for (const [index, call] of [[0, producerEvidence.input.subcalls[0]], [1, producerEvidence.input.subcalls[0].subcalls[0]], [2, producerEvidence.input.subcalls[1]]]) {
          await assertCall(producerRecorded.locator('details').nth(index), call);
        }
        assert.equal(await producerRecorded.getByText('Historically bound ABI.', { exact: true }).count(), 0);
        await scanState('producer-nested-expanded', '/analysis/producer-synthetic');
        let executionResponse = executionFixture;
        let executionInput = '{"to":"0x000000000000000000000000000000000000dEaD","data":"0x"}';
        await page.route("**/api/sigil/simulate-v2", route => {
          assert.deepEqual(route.request().postDataJSON(), { rawData: executionInput, network: "mainnet" });
          executionRequests++;
          return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(executionResponse) });
        });
        await page.goto(`${origin}/simulate`, { waitUntil: "networkidle" });
        await page.getByLabel("Read-only call input", { exact: true }).fill('{"to":"0x000000000000000000000000000000000000dEaD","data":"0x"}');
        await page.getByRole("button", { name: "Check Read-only Call", exact: true }).click();
        await page.getByRole("heading", { name: "Read-only call completed", exact: true }).waitFor();
        assert.equal(await page.getByText(executionFixture.summary, { exact: true }).isVisible(), true);
        assert.equal(await page.getByText("historicalArchive", { exact: true }).isVisible(), true);
        for (const [label, value] of [["Outcome", executionFixture.callCheck.outcome],
          ["Pinned block", executionFixture.callCheck.blockNumber], ["Destination", executionFixture.callCheck.to],
          ["Caller", executionFixture.callCheck.from]]) {
          const term = page.locator("dt").filter({ hasText: new RegExp(`^${label}$`) });
          assert.equal(await term.count(), 1);
          assert.equal(await term.evaluate(element => element.nextElementSibling?.textContent), value);
        }
        await scanState("read-only-completed", "/simulate");
        await page.getByRole("button", { name: "Check another", exact: true }).click();
        await page.getByLabel("Read-only call input", { exact: true }).waitFor();
        assert.equal(await page.getByLabel("Read-only call input", { exact: true }).inputValue(), "");
        const assertNoSuccessEvidence = async () => {
          const content = await page.locator("main").textContent();
          for (const stale of [executionFixture.summary, ...new Set(Object.values(executionFixture.callCheck))]) {
            assert.equal(content.includes(stale), false, `Stale successful call evidence: ${stale}`);
          }
        };
        const assertReportCleared = async fixture => {
          assert.equal(await page.locator("main section, main dl").count(), 0, "Report sections and capability rows must be removed on reset");
          assert.equal(await page.getByRole("button", { name: "Check another", exact: true }).count(), 0);
          const content = await page.locator("main").textContent();
          for (const stale of [fixture.summary, ...fixture.limitations, `${fixture.network} | ${fixture.reportVersion}`]) {
            assert.equal(content.includes(stale), false, "Report text must be removed on reset");
          }
        };
        await assertReportCleared(executionFixture);
        for (const [state, title, fixture, input] of [
          ["read-only-advisory", "Advisory only", advisoryFixture, "Synthetic plaintext without destination"],
          ["read-only-unavailable", "Check unavailable", unavailableFixture, '{"to":"0x000000000000000000000000000000000000dEaD","data":"0x"}'],
        ]) {
          executionResponse = fixture;
          executionInput = input;
          await page.getByLabel("Read-only call input", { exact: true }).fill(input);
          await page.getByRole("button", { name: "Check Read-only Call", exact: true }).click();
          await page.getByRole("heading", { name: title, exact: true }).waitFor();
          assert.equal(await page.getByText(fixture.summary, { exact: true }).isVisible(), true);
          assert.equal(await page.getByRole("heading", { name: "Read-only call completed", exact: true }).count(), 0);
          for (const label of ["Outcome", "Pinned block", "Destination", "Caller"]) {
            assert.equal(await page.locator("dt").filter({ hasText: new RegExp(`^${label}$`) }).count(), 0);
          }
          await assertNoSuccessEvidence();
          if (state === "read-only-advisory") {
            await page.locator("main").evaluate((main, text) => {
              const stale = document.createElement("p");
              stale.id = "p00-stale-success-control";
              stale.textContent = text;
              main.append(stale);
            }, executionFixture.summary);
            await assert.rejects(assertNoSuccessEvidence, /Stale successful call evidence/);
            await page.locator("#p00-stale-success-control").evaluate(element => element.remove());
            await assertNoSuccessEvidence();
          }
          for (const limit of fixture.limitations) {
            assert.equal(await page.getByText(limit, { exact: true }).isVisible(), true);
          }
          for (const [label, available] of Object.entries(fixture.capabilities)) {
            const term = page.locator("dt").filter({ hasText: new RegExp(`^${label}$`) });
            assert.equal(await term.count(), 1);
            assert.equal(await term.evaluate(element => element.nextElementSibling?.textContent), available ? "Supported check" : "Unavailable");
          }
          await scanState(state, "/simulate");
          await page.getByRole("button", { name: "Check another", exact: true }).click();
          await page.getByLabel("Read-only call input", { exact: true }).waitFor();
          assert.equal(await page.getByLabel("Read-only call input", { exact: true }).inputValue(), "");
          assert.equal(await page.getByRole("heading", { name: title, exact: true }).count(), 0);
          await assertReportCleared(fixture);
          await assertNoSuccessEvidence();
          if (state === "read-only-unavailable") {
            await page.locator("main").evaluate((main, text) => {
              const stale = document.createElement("p");
              stale.id = "p00-stale-reset-control";
              stale.textContent = text;
              main.append(stale);
            }, fixture.summary);
            await assert.rejects(() => assertReportCleared(fixture), /Report text must be removed on reset/);
            await page.locator("#p00-stale-reset-control").evaluate(element => element.remove());
            await assertReportCleared(fixture);
          }
        }
        await page.close();
        continue;
      }
      await page.goto(origin, { waitUntil: "networkidle" });
      assertRenderedRoute(await renderedSnapshot(page, errors, assetFailures), routes["/"]);
      await page.getByLabel("Transaction hash or contract address", { exact: true }).fill("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
      await verifyCommandFill(page.getByRole("button", { name: /^Analyze$/i }), "analyze");
      await page.getByRole("button", { name: /^Analyze$/i }).click();
      await page.getByText("Synthetic evidence check", { exact: true }).waitFor();
      assert.equal(streamRequests, name === "desktop" ? 1 : 2);
      assert.ok(syntheticStream && !syntheticStream.writableEnded);
      const streaming = page.locator('main section[aria-live="polite"]');
      assert.equal(await streaming.getAttribute("aria-busy"), "true");
      assert.equal(await page.getByRole("heading", { name: "Analyzing", exact: true }).isVisible(), true);
      await scanState("evidence-loading", "/");
      syntheticStream.write(event({ type: "step", step: 2, label: "Synthetic validation check" }));
      await page.getByText("Synthetic validation check", { exact: true }).waitFor();
      await scanState("validation-loading", "/");
      syntheticStream.end(event({ type: "error", message: "Synthetic provider unavailable. No risk verdict was produced." }));
      await page.getByRole("alert").filter({ hasText: "Synthetic provider unavailable" }).waitFor();
      await scanState("analysis-error", "/");
      assertRenderedRoute(await renderedSnapshot(page, errors, assetFailures), routes["/"]);
      errors.length = 0;
      assetFailures.length = 0;
      let pending;
      await page.route("**/api/sigil/simulate-v2", route => { pending = route; });
      await page.goto(`${origin}/simulate`, { waitUntil: "networkidle" });
      await page.getByLabel("Read-only call input", { exact: true }).fill('{"to":"0x000000000000000000000000000000000000dEaD","data":"0x"}');
      await verifyCommandFill(page.getByRole("button", { name: "Check Read-only Call", exact: true }), "read-only");
      await page.getByRole("button", { name: "Check Read-only Call", exact: true }).click();
      await page.getByRole("status").waitFor();
      assert.ok(pending, "Read-only request must be intercepted");
      await scanState("read-only-loading", "/simulate");
      await pending.fulfill({ status: 200, contentType: "application/json", body: '{"synthetic":"invalid-report-control"}' });
      const executionError = page.getByRole("alert").filter({ hasText: "Remote execution check unavailable." });
      await executionError.waitFor();
      assert.equal(await executionError.innerText(), "Remote execution check unavailable. No outcome or signing clearance established.");
      await scanState("invalid-execution-report", "/simulate");
      assertRenderedRoute(await renderedSnapshot(page, errors, assetFailures), routes["/simulate"]);
    }
    await page.close();
  }
  await mkdir(output, { recursive: true });
  assert.equal(reports.length, values.events ? 30 : values.history ? 30 : values.variants ? 37 : values.results ? 30 : values.states ? 10 : 26, "Audit coverage must include every declared viewport/state or route");
  assert.equal(commandContrast.length, values.states ? 8 : 0);
  assert.equal(createHash("sha256").update(await readFile(path.join(dist, "index.html"))).digest("hex"), buildHash,
    "Web build changed during the audit; rebuild first and rerun against a stable candidate");
  if (values.results) {
    assert.equal(resultRequests, 6);
    assert.equal(executionRequests, 6);
  }
  if (values.variants) {
    assert.equal(resultRequests, 16);
    assert.equal(executionRequests, 0);
  }
  if (values.history) {
    assert.equal(historyRequests, 22);
    assert.equal(freshRequests, 20);
  }
  if (values.events) assert.equal(approvalEventRequests, 22);
  await writeFile(path.join(output, `web-${auditName}-report.json`), JSON.stringify({
    engine: "axe-core 4.14.0", buildIndexSha256: buildHash, runOnly,
    negativeControl: "detected", semanticNegativeControls: wcagAudit ? "button_name_and_input_label_detected" : "not_run",
    blankApplicationControl: "rejected",
    shareDraftControl: values.results ? "two_actual_clicks_local_popup_interception_bounded_status_no_private_values" : "not_run",
    clipboardControl: values.results ? "four_intercepted_writes_reject_then_success_named_keyboard_dismissal" : "not_run",
    nestedEvidenceControl: values.results ? "ui_only_mixed_branches_and_actual_decoder_inventory_parser_calls_contextual_optional_state_individual_keyboard_open_close_and_clipping_negative_controls" : "not_run",
    legacyApprovalControl: values.variants ? "bounded_large_zero_intent_price_and_prior_rows_exact_visible_unclipped_copy_with_legacy_disclaimer" : "not_run",
    jargonTooltipControl: values.variants ? "native_tab_mobile_autoscroll_enter_activation_focus_exact_visible_and_accessible_copy_viewport_escape_retained_focus_hover_persistence_repeated_unique_associations_and_touch_activation_outside_dismissal" : "not_run",
    executionStatusControl: values.results ? "six_requests_success_advisory_unavailable_exact_fields_capabilities_limits_reset_and_stale_text_negative_controls" : "not_run",
    historyControl: values.history ? "twenty_two_history_twenty_fresh_requests_malformed_200_roundtrip_generation_failure_navigation_retry_success_late_record_unmount_query_boundary_color_and_bounded_wait" : "not_run",
    approvalEventsControl: values.events ? "twenty_two_manual_gets_empty_large_unavailable_unchecked_failure_mixed_coverage_actual_file_import_conflicting_statuses_unique_ids_remove_refresh_original_wallet_preserved" : "not_run",
    routeCoverage: values.events ? "approval_scan_watchlist_and_monitor_empty_large_unavailable_renderer_fixtures" : values.history ? "held_history_not_found_saved_report_reanalysis_loading_and_failure"
      : values.variants ? "current_low_risk_legacy_v1_unvalidated_and_invalid_evidence_exact_status_content_and_score"
      : values.results ? "exact_summary_groups_keyboard_open_evidence_and_read_only_result_reset"
      : values.states ? "declared_phase_status_or_alert_single_main_no_local_load_or_runtime_errors"
      : "visible_exact_heading_single_main_content_and_no_local_load_or_runtime_errors",
    scope: values.events ? "actual_app_renderer_only_approval_event_fixtures_manual_gets_external_requests_blocked" : values.history ? "actual_app_synthetic_history_and_fresh_analysis_external_requests_blocked"
      : values.variants ? "actual_app_synthetic_analysis_variants_external_requests_blocked"
      : values.results ? "actual_app_validated_synthetic_results_external_requests_blocked"
      : values.states ? "actual_app_synthetic_stream_and_read_only_states_external_requests_blocked"
      : "built_initial_routes_synthetic_empty_api_external_requests_blocked",
    limits: ["fallback_fonts", "incomplete_needs_manual_review", "not_full_accessibility", "not_all_interactive_states"],
    commandContrast, reports,
  }, null, 2));
  assert.equal(reports.flatMap(report => report.violations).length, 0, `Rendered ${auditName} failures: see tmp/p00/web-${auditName}-report.json`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
