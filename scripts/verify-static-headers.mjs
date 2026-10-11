import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, extname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = resolve(root, "artifacts/sigil/dist/public");
const config = JSON.parse(await readFile(resolve(root, "vercel.json"), "utf8"));
assert.equal(config.headers.length, 1, "Verifier requires a single global rule; additional rules need explicit modeling");
assert.equal(config.headers[0].source, "/(.*)");
const headers = Object.fromEntries(config.headers.find(({ source }) => source === "/(.*)").headers.map(({ key, value }) => [key, value]));
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2" };
const { chromium } = createRequire(import.meta.url)(process.env.SIGIL_PLAYWRIGHT_MODULE || "playwright");
const output = resolve(root, "tmp/p00");
await mkdir(output, { recursive: true });

// Synthetic same-origin API controls; no production data or provider calls.
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (pathname === "/api/header-stream") {
      res.writeHead(200, { ...headers, "Content-Type": "text/event-stream" });
      res.write('data: {"synthetic":true}\n\n');
      setTimeout(() => res.end('data: {"done":true}\n\n'), 25);
      return;
    }
    if (pathname.startsWith("/api/")) {
      res.writeHead(200, { ...headers, "Content-Type": "application/json" });
      res.end(JSON.stringify(pathname === "/api/header-check" ? { synthetic: true } : []));
      return;
    }
    let path = resolve(publicDir, `.${pathname}`);
    const within = relative(publicDir, path);
    if (within === ".." || within.startsWith(`..${sep}`) || resolve(path) === root) {
      res.writeHead(403).end();
      return;
    }
    const found = await stat(path).catch(() => null);
    if (!found?.isFile()) path = resolve(publicDir, "index.html");
    const body = await readFile(path);
    res.writeHead(200, { ...headers, "Content-Type": mime[extname(path)] || "application/octet-stream" });
    res.end(body);
  } catch (error) {
    res.writeHead(500).end();
    console.error(error);
  }
});
let browser;
try {
  await new Promise((accept, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", accept);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, channel: "chrome" });
  for (const [name, viewport] of [["desktop", { width: 1440, height: 1000 }], ["mobile", { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    const failed = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("requestfailed", (request) => failed.push({ url: request.url(), error: request.failure()?.errorText }));
    await page.addInitScript(() => {
      window.headerViolations = [];
      document.addEventListener("securitypolicyviolation", (event) => window.headerViolations.push({ directive: event.effectiveDirective, blocked: event.blockedURI }));
    });
    for (const path of ["/", "/privacy", "/terms"]) {
      const response = await page.goto(`${origin}${path}`, { waitUntil: "networkidle" });
      assert.equal(response.status(), 200);
      assert.equal(response.headers()["content-security-policy"], headers["Content-Security-Policy"]);
      assert.ok((await page.locator("body").innerText()).length > 100, `${name}${path}: missing app content`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name}${path}: horizontal overflow`);
      assert.deepEqual(await page.evaluate(() => window.headerViolations), [], `${name}${path}: unexpected CSP violation`);
      assert.deepEqual(errors, [], `${name}${path}: runtime error`);
    }
    await page.goto(origin, { waitUntil: "networkidle" });
    assert.equal(await page.evaluate(() => [...document.images].filter((image) => image.getClientRects().length).every((image) => image.complete && image.naturalWidth > 0)), true, `${name}: visible image failed`);
    assert.deepEqual(await page.evaluate(async () => (await fetch("/api/header-check")).json()), { synthetic: true });
    assert.equal(await page.evaluate(async () => {
      const response = await fetch("/api/header-stream");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
      }
      return text;
    }), 'data: {"synthetic":true}\n\ndata: {"done":true}\n\n');
    await page.screenshot({ path: resolve(output, `headers-${name}.png`), fullPage: true });
    await page.goto(`${origin}/watchlist`, { waitUntil: "networkidle" });
    await page.getByPlaceholder("0x...", { exact: true }).fill("0x000000000000000000000000000000000000dEaD");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    const downloadReady = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export", exact: true }).click();
    const download = await downloadReady;
    assert.equal(download.suggestedFilename(), "sigil-watchlist.json");
    const entries = JSON.parse(await readFile(await download.path(), "utf8"));
    assert.equal(entries.length, 1);
    assert.equal(entries[0].address, "0x000000000000000000000000000000000000dead");
    assert.deepEqual(await page.evaluate(() => window.headerViolations), []);
    // Chrome evaluation is a test harness, not a script allowance. Inject a real DOM script.
    await page.evaluate(() => {
      const script = document.createElement("script");
      script.textContent = "window.inlineScriptExecuted = true";
      document.body.append(script);
    });
    await page.waitForFunction(() => window.headerViolations.some(({ directive }) => directive === "script-src-elem"));
    assert.equal(await page.evaluate(() => window.inlineScriptExecuted), undefined);
    await page.evaluate(() => {
      const script = document.createElement("script");
      script.src = "https://unapproved.invalid/header-script.js";
      document.body.append(script);
    });
    await page.waitForFunction(() => window.headerViolations.some(({ directive, blocked }) => directive === "script-src-elem" && blocked === "https://unapproved.invalid/header-script.js"));
    assert.equal(await page.evaluate(async () => {
      try { await fetch("https://unapproved.invalid/header-check"); return false; } catch { return true; }
    }), true);
    await page.waitForFunction(() => window.headerViolations.some(({ directive }) => directive === "connect-src"));
    assert.deepEqual(errors, []);
    const assetFailures = failed.filter(({ url }) => url.startsWith(origin));
    assert.deepEqual(assetFailures, [], `${name}: same-origin asset failure`);
    console.log(JSON.stringify({ viewport: name, routes: ["/", "/privacy", "/terms", "/watchlist"], syntheticStream: "complete", watchlistExport: "matched", inlineScript: "blocked", externalScript: "blocked", externalConnect: "blocked", externalTransportFailures: failed.filter(({ url }) => !url.startsWith(origin) && !url.startsWith("https://unapproved.invalid/")) }));
    await page.close();
  }
  for (const [name, viewport, textScale] of [
    ["desktop-text-200", { width: 1440, height: 1000 }, true],
    ["desktop-reflow-720", { width: 720, height: 500 }, false],
    ["mobile-reflow-320", { width: 320, height: 844 }, false],
  ]) {
    const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const path of ["/", "/privacy", "/terms", "/impressum", "/cookies"]) {
      await page.goto(`${origin}${path}`, { waitUntil: "networkidle" });
      if (textScale) await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      assert.doesNotMatch(await page.locator('meta[name="viewport"]').getAttribute("content"), /maximum-scale|user-scalable\s*=\s*(no|0)/i);
      await page.keyboard.press("Tab");
      const skip = page.getByRole("link", { name: "Skip to content", exact: true });
      await skip.waitFor({ state: "visible" });
      assert.equal(await skip.evaluate((element) => document.activeElement === element), true);
      await page.waitForFunction(() => {
        const element = document.activeElement;
        if (!element?.classList.contains("skip-link")) return false;
        const rect = element.getBoundingClientRect();
        return getComputedStyle(element).outlineWidth === "2px" && rect.top >= 0 && rect.bottom <= innerHeight;
      }, null, { timeout: 5000 });
      const focus = await skip.evaluate((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return { width: style.outlineWidth, style: style.outlineStyle, visible: rect.top >= 0 && rect.bottom <= innerHeight };
      });
      assert.deepEqual(focus, { width: "2px", style: "solid", visible: true }, `${name}${path}: ${JSON.stringify(await skip.evaluate((element) => ({ rect: element.getBoundingClientRect().toJSON(), className: element.className, style: getComputedStyle(element).cssText, background: getComputedStyle(element).backgroundColor, transform: getComputedStyle(element).transform, sheets: document.styleSheets.length, focusVisible: element.matches(':focus-visible') })))}`);
      await page.keyboard.press("Tab");
      const navLinks = page.getByRole("navigation", { name: "Main navigation", exact: true }).getByRole("link");
      for (let index = 0; index < await navLinks.count(); index++) {
        await page.keyboard.press("Tab");
        const link = navLinks.nth(index);
        assert.equal(await link.evaluate((element) => document.activeElement === element), true);
        await page.waitForFunction((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          const viewport = element.closest("nav").getBoundingClientRect();
          return element.matches(":focus-visible") && style.outlineWidth === "2px" && style.outlineOffset === "-2px" && rect.left >= viewport.left - 1 && rect.right <= viewport.right + 1;
        }, await link.elementHandle(), { timeout: 5000 });
        const navFocus = await link.evaluate((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          const viewport = element.closest("nav").getBoundingClientRect();
          return { width: style.outlineWidth, offset: style.outlineOffset, rect: rect.toJSON(), viewport: viewport.toJSON(), visible: rect.left >= viewport.left - 1 && rect.right <= viewport.right + 1 && rect.top >= viewport.top - 1 && rect.bottom <= viewport.bottom + 1 };
        });
        assert.equal(navFocus.width === "2px" && navFocus.offset === "-2px" && navFocus.visible, true, `${name}${path}: clipped navigation focus ${index}: ${JSON.stringify(navFocus)}`);
      }
      await skip.focus();
      await page.keyboard.press("Enter");
      assert.equal(await page.evaluate(() => document.activeElement?.id), "main-content");
      await page.waitForFunction(() => document.querySelector(".skip-link").getBoundingClientRect().bottom <= 0, null, { timeout: 5000 });
      assert.equal(await page.evaluate(() => document.querySelector("main").getBoundingClientRect().top >= document.querySelector("header").getBoundingClientRect().bottom), true, `${name}${path}: main target obscured by sticky header`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name}${path}: horizontal overflow`);
      const animated = await page.locator('[style*="glow-pulse"]').evaluateAll((elements) => elements.map((element) => {
        const style = getComputedStyle(element);
        return { duration: style.animationDuration, iterations: style.animationIterationCount };
      }));
      assert.equal(animated.length, 3);
      for (const animation of animated) {
        assert.ok(parseFloat(animation.duration) <= 0.00001);
        assert.equal(animation.iterations, "1");
      }
      assert.deepEqual(errors, []);
    }
    await page.screenshot({ path: resolve(output, `accessibility-${name}.png`), fullPage: true });
    console.log(JSON.stringify({ accessibility: name, keyboardSkip: "focused-main", cssMotion: "reduced", routes: ["/", "/privacy", "/terms", "/impressum", "/cookies"], scope: textScale ? "200 percent root text size, not browser zoom" : "CSS viewport reflow, not browser zoom" }));
    await page.close();
  }
  for (const reducedMotion of ["reduce", "no-preference"]) {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport, reducedMotion });
      let pending;
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/api/sigil/simulate-v2", (route) => { pending = route; });
      await page.goto(`${origin}/simulate`, { waitUntil: "networkidle" });
      await page.locator("textarea").fill('{"to":"0x000000000000000000000000000000000000dEaD","data":"0x"}');
      await page.getByRole("button", { name: "Check Read-only Call", exact: true }).click();
      const status = page.getByRole("status");
      await status.waitFor({ state: "visible" });
      assert.ok(pending, "synthetic execution check must be intercepted, not sent to a provider");
      assert.match(await status.innerText(), /Checking available execution context/);
      // Sample every descendant, including SVG: JS opacity/position loops are not CSS animations.
      const sample = () => status.evaluate((element) => [element, ...element.querySelectorAll("*")].map((node) => {
        const style = getComputedStyle(node);
        return { opacity: style.opacity, transform: style.transform, top: style.top, animation: style.animationName };
      }));
      await page.waitForTimeout(700);
      const samples = [await sample()];
      for (let index = 0; index < 3; index++) {
        await page.waitForTimeout(400);
        samples.push(await sample());
      }
      if (reducedMotion === "reduce") {
        for (const current of samples) assert.deepEqual(current, samples[0], "reduced execution status must remain static");
        assert.equal(await status.locator("svg").count(), 1);
      } else {
        assert.ok(samples.some((current) => JSON.stringify(current) !== JSON.stringify(samples[0])), "ordinary animation positive control must move");
        await page.emulateMedia({ reducedMotion: "reduce" });
        await status.locator("svg").waitFor({ state: "visible", timeout: 5000 });
        await page.waitForTimeout(400);
        const changed = await sample();
        await page.waitForTimeout(600);
        assert.deepEqual(await sample(), changed, "live preference change must stop animation");
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await page.waitForFunction(() => !document.querySelector('[role="status"] svg'), null, { timeout: 5000 });
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: resolve(output, `execution-loading-${reducedMotion}-${viewport.width}.png`), fullPage: true });
      await pending.abort();
      await page.close();
      console.log(JSON.stringify({ executionLoading: reducedMotion, width: viewport.width, syntheticOnly: true, samples: samples.length, result: reducedMotion === "reduce" ? "static" : "moving-positive-control" }));
    }
  }
} finally {
  await browser?.close();
  await new Promise((accept) => server.close(accept));
}
