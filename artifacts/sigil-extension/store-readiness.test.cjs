const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = __dirname;

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("manifest uses a main-world injector and isolated UI bridge", () => {
  const manifest = JSON.parse(read("manifest.json"));
  const scripts = manifest.content_scripts || [];
  assert.equal(scripts.length, 2);
  assert.deepEqual(scripts[0].js, ["inject.js"]);
  assert.equal(scripts[0].world, "MAIN");
  assert.equal(scripts[0].run_at, "document_start");
  assert.deepEqual(scripts[1].js, ["core.js", "content.js"]);
});

test("manifest uses minimum permissions for store submission", () => {
  const manifest = JSON.parse(read("manifest.json"));
  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.deepEqual(manifest.host_permissions, ["https://sigil.s3ntrylabs.com/*"]);
  assert.equal(manifest.web_accessible_resources, undefined);
});

test("settings sync is optional and history remains local", () => {
  const popup = read("popup.js");
  const popupHtml = read("popup.html");

  assert.match(popupHtml, /id="syncEnabledToggle"/);
  assert.match(popup, /syncEnabled/);
  assert.match(popup, /createSyncSettingsPayload/);
  assert.match(popup, /localSet\(\{ history, sessions \}\)/);
  assert.doesNotMatch(popup, /syncSet\(\{ history/);
  assert.doesNotMatch(popup, /syncSet\(\{ sessions/);
});

test("popup constrains dynamic html classes before rendering", () => {
  const popup = read("popup.js");

  assert.match(popup, /function safeVerdictClass/);
  assert.doesNotMatch(popup, /class="pill \$\{verdict\}"/);
  assert.doesNotMatch(popup, /class="pill \$\{pillClass\}"/);
  assert.doesNotMatch(popup, /<strong>\$\{summary\.approvals \|\| 0\}<\/strong>/);
  assert.doesNotMatch(popup, /card\.innerHTML\s*=\s*`/);
  assert.doesNotMatch(popup, /pasteResult\.innerHTML\s*=\s*`/);
  assert.doesNotMatch(popup, /siteResult\.innerHTML\s*=\s*`/);
});

test("content overlay constrains dynamic html classes and urls", () => {
  const content = read("content.js");

  assert.match(content, /function safeVerdictClass/);
  assert.match(content, /function safeAnalysisUrl/);
  assert.match(content, /\.replace\(\/'\/g, "&#39;"\)/);
  assert.match(content, /Number\.isFinite\(numericRisk\)/);
  assert.doesNotMatch(content, /<div class="body \$\{verdict\}">/);
  assert.doesNotMatch(content, /href="\$\{escHtml\(fullUrl\)\}"/);
});

test("chart style injection is constrained to sanitized css identifiers and colors", () => {
  for (const file of [
    "../sigil/src/components/ui/chart.tsx",
    "../mockup-sandbox/src/components/ui/chart.tsx",
  ]) {
    const chart = read(file);
    assert.match(chart, /const SAFE_CSS_COLOR/);
    assert.match(chart, /function sanitizeCssIdent/);
    assert.match(chart, /function sanitizeCssColor/);
    assert.match(chart, /data-chart=\$\{id\}/);
    assert.match(chart, /const chartId = sanitizeCssIdent/);
    assert.doesNotMatch(chart, /--color-\$\{key\}: \$\{color\}/);
  }
});

test("extension package does not load remote executable code", () => {
  const popup = read("popup.html");
  const files = ["popup.html", "popup.js", "content.js", "core.js", "inject.js", "background.js"];
  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /<script[^>]+src=["']https?:\/\//i, `${file} must not load remote scripts`);
    assert.doesNotMatch(source, /\beval\s*\(/, `${file} must not use eval`);
    assert.doesNotMatch(source, /new Function\s*\(/, `${file} must not compile dynamic code`);
  }
  assert.doesNotMatch(popup, /https:\/\/fonts\.googleapis\.com/);
  assert.doesNotMatch(popup, /https:\/\/fonts\.gstatic\.com/);
});

test("main-world injector is advisory-only and never waits for page decisions", () => {
  const inject = read("inject.js");
  assert.match(inject, /sigil:observation/);
  assert.doesNotMatch(inject, /sigil:decision/);
  assert.doesNotMatch(inject, /sigil:intercept/);
  assert.doesNotMatch(inject, /request\s*=\s*async\s+function/);
  assert.doesNotMatch(inject, /Sigil blocked wallet request/);
  assert.doesNotMatch(inject, /Sigil security check timed out/);
  assert.doesNotMatch(inject, /90000/);
});

test("isolated content intake listens only for bounded observations", () => {
  const content = read("content.js");
  assert.match(content, /createObservationGate/);
  assert.match(content, /sigil:observation/);
  assert.doesNotMatch(content, /sigil:intercept/);
  assert.doesNotMatch(content, /requestQueue\.push\(event\.detail\)/);
});

test("content UI is advisory-only and cannot claim wallet authority", () => {
  const content = read("content.js");
  assert.doesNotMatch(content, /sigil:decision/);
  assert.doesNotMatch(content, /Cancel request/);
  assert.doesNotMatch(content, /id="proceedBtn"/);
  assert.doesNotMatch(content, /finish\("proceed"/);
  assert.doesNotMatch(content, /finish\("cancel"/);
  assert.match(content, /Dismiss alert/);
  assert.match(content, /Trust this site/);
  assert.match(content, /wallet remains the only place/i);
});

test("popup names advisory controls and keeps legacy actions separate", () => {
  const popup = read("popup.js");
  const popupHtml = read("popup.html");
  assert.match(popupHtml, /Wallet Request Alerts/);
  assert.match(popupHtml, /Alert Sensitivity/);
  assert.match(popup, /fewer alerts/i);
  assert.match(popup, /normal alerts/i);
  assert.match(popup, /more alerts/i);
  assert.match(popup, /summary\.reviewed/);
  assert.match(popup, /summary\.dismissed/);
  assert.match(popup, /summary\.analysisFailed/);
  assert.match(popup, /Legacy extension actions/);
  assert.match(popup, /Request alerts enabled/);
  assert.match(popup, /Alert sensitivity updated/);
  assert.doesNotMatch(popupHtml, /Transaction Guard/);
  assert.doesNotMatch(popupHtml, /Intercept signing requests/i);
  assert.doesNotMatch(popupHtml, /Protection Mode/);
  assert.doesNotMatch(popup, /Guard enabled/);
});

test("current product claims describe best-effort advisory observation", () => {
  const files = [
    "manifest.json",
    "../../docs/chrome-web-store-submission.md",
    "../../docs/production-qa-matrix.md",
    "../sigil/src/pages/extension.tsx",
    "../sigil/src/pages/home.tsx",
    "../sigil/src/pages/approvals.tsx",
    "../sigil/src/pages/wallet-monitor.tsx",
    "../sigil/src/pages/legal.tsx",
    "../../sigil-whitepaper.md",
    "../../overview.md",
  ];
  const claims = files.map((file) => read(file)).join("\n");
  assert.doesNotMatch(claims, /intercepts every transaction/i);
  assert.doesNotMatch(claims, /Sigil\\nintercepts/i);
  assert.doesNotMatch(claims, /before (?:they|it|the request) reach(?:es)? your wallet/i);
  assert.doesNotMatch(claims, /before the wallet request continues/i);
  assert.doesNotMatch(claims, /allows the user to proceed or cancel/i);
  assert.doesNotMatch(claims, /before any approval is possible/i);
  assert.doesNotMatch(claims, /every feature in Sigil operates before/i);
  assert.doesNotMatch(claims, /prevention is the only meaningful intervention/i);
  assert.doesNotMatch(claims, /fails closed/i);
  assert.doesNotMatch(claims, /transaction interception|signature interception/i);
  assert.match(claims, /Reviews compatible wallet requests/);
  assert.match(claims, /wallet remains the only place that approves or rejects/i);
  assert.match(claims, /best-effort/i);
});
