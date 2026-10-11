import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const read = (file) => readFileSync(new URL(`../artifacts/sigil/${file}`, import.meta.url), "utf8");

function contrast(a, b) {
  const luminance = hex => {
    const values = hex.replace('#', '').match(/../g).map(value => parseInt(value, 16) / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
  };
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
const token = (css, name) => css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6});`, 'i'))?.[1];

test("jargon disclosures use existing portal tooltip with unique library-owned associations", () => {
  const source = read("src/components/sigil/JargonTooltip.tsx");
  assert.match(source, /import \{ Tooltip, TooltipTrigger, TooltipContent \} from '@\/components\/ui\/tooltip'/);
  assert.match(source, /<TooltipTrigger[\s\S]*?type="button"/);
  assert.match(source, /min-h-6/);
  assert.match(source, /focus-visible:outline/);
  assert.match(source, /<TooltipContent[\s\S]*?collisionPadding=\{8\}/);
  assert.match(source, /<Tooltip open=\{open\} onOpenChange=\{setOpen\}>/);
  assert.match(source, /onClick=\{event => \{\s*event\.preventDefault\(\);\s*focusGeneration\.current\+\+;\s*setOpen\(true\);/);
  assert.match(source, /text-primary-text/);
  assert.doesNotMatch(source, /jargon-\$\{|pointer-events-none|onMouseLeave|text-primary\/70/);
});

test("legacy approval price copy and title retain contrast and history rows can wrap", () => {
  const source = read("src/components/sigil/ApprovalInspector.tsx");
  assert.doesNotMatch(source, /text-white\/(?:35|40)\b/);
  assert.match(source, /header: "text-primary-text"/);
  const history = source.split("{info.priorApprovals.map")[1];
  assert.ok(history);
  assert.match(history, /flex flex-wrap items-center justify-between gap-3/);
  assert.match(history, /flex min-w-0 flex-wrap items-center gap-3/);
});

test("primary analysis commands keep contrasting solid fills when hovered", () => {
  const home = read('src/pages/home.tsx');
  assert.match(home, /type="submit"[\s\S]*?className="console-button/);
  const css = read('src/index.css');
  assert.ok(contrast('#ffffff', token(css, 'primary')) >= 4.5);
  const hover = css.match(/\.console-button:hover:not\(:disabled\)\s*\{[^}]*background:\s*(#[0-9a-f]{6})/)[1];
  assert.ok(contrast('#ffffff', hover) >= 4.5, 'Hover fill must retain text contrast');
  assert.notEqual(hover, token(css, 'primary'), 'Hover must visibly change the fill');
  for (const [file, marker] of [["simulate", "{/* Simulate button */}"]]) {
    const button = read(`src/pages/${file}.tsx`).split(marker)[1]?.split("</button>")[0];
    assert.ok(button);
    assert.match(button, /bg-primary hover:bg-\[#6d28d9\]/);
    assert.doesNotMatch(button, /linear-gradient/);
  }
});

test("streaming steps stay readable and read-only failures are announced", () => {
  const streaming = read("src/components/sigil/StreamingAnalysisView.tsx");
  assert.doesNotMatch(streaming, /text-white\/(?:35|40)\b/);
  assert.match(streaming, /text-subtle/);
  const failure = read("src/pages/simulate.tsx").split("{(simulateMutation.isError || invalidReport) && (")[1]?.split("</motion.div>")[0];
  assert.ok(failure);
  assert.match(failure, /role="alert"/);
});

test("scanner and read-only forms have persistent native labels", () => {
  for (const [file, fields] of [
    ["home", [["scan-network", "Network"], ["scan-input", "Transaction hash or contract address"]]],
    ["simulate", [["execution-network", "Select network"], ["execution-input", "Read-only call input"]]],
  ]) {
    const source = read(`src/pages/${file}.tsx`);
    for (const [id, label] of fields) {
      assert.match(source, new RegExp(`<label[^>]*htmlFor="${id}"[^>]*>${label}</label>`));
      assert.match(source, new RegExp(`<(?:input|select|textarea)\\s+id="${id}"`));
    }
  }
});

test("legal inline links are distinguished without relying only on color", () => {
  const links = [...read("src/pages/legal.tsx").matchAll(/<a\s+className="([^"]+)"/g)];
  assert.ok(links.length >= 4);
  for (const [, classes] of links) assert.match(classes, /(?:^|\s)underline(?:\s|$)/);
});

test("validated results retain readable labels and source links", () => {
  const page = read("src/pages/analysis.tsx");
  assert.doesNotMatch(page, /text-white\/(?:30|40)\b|hover:text-primary\b(?!-)/);
  const result = read("src/components/sigil/AnalysisResultView.tsx");
  const structured = result.split("{validatedReport ? (")[1].split(") : data.breakdown")[0];
  assert.doesNotMatch(structured, /text-white\/(?:35|40)\b/);
  assert.match(result, /underline underline-offset-4 text-primary-text/);
  assert.match(result, /<code className="[^"]*text-xs break-all select-text/);
  assert.match(result, /aria-label="Copy input"/);
  assert.match(result, /text-subtle/);
});

test("notifications provide a named dismiss command and a contrasting error fill", () => {
  const source = read("src/components/ui/toast.tsx");
  assert.match(source, /aria-label="Dismiss notification"/);
  assert.match(source, /border-rose-800 bg-rose-950 text-rose-100/);
});

test("legacy result empty findings retain readable text", () => {
  const source = read("src/components/sigil/AnalysisResultView.tsx");
  for (const message of ["No threats detected.", "No positive indicators found."]) {
    const paragraph = [...source.matchAll(/<p className="([^"]+)">([^<]+)<\/p>/g)].find(match => match[2] === message);
    assert.ok(paragraph, message);
    assert.match(paragraph[1], /(?:^|\s)text-subtle(?:\s|$)/);
    assert.doesNotMatch(paragraph[1], /text-white\/25/);
  }
});

test("nested ABI disclosures retain at least 24px targets and visible keyboard focus", () => {
  const source = read("src/components/sigil/AnalysisResultView.tsx");
  const decoded = source.split('function AdditionalEvidence')[0];
  const summary = decoded.match(/<summary className="([^"]+)">Subcall/);
  assert.ok(summary, 'Actual recursive Subcall summary must have target styling');
  assert.match(summary[1], /(?:^|\s)min-h-6(?:\s|$)/);
  assert.match(summary[1], /(?:^|\s)py-1(?:\s|$)/);
  assert.match(summary[1], /focus-visible:outline-2/);
  assert.match(summary[1], /focus-visible:outline-primary-text/);
});

test("history retrieval and fresh-analysis failures expose bounded status feedback", () => {
  const source = read("src/pages/analysis.tsx");
  assert.match(source, /\{isLoading && \([\s\S]*?<div role="status" aria-live="polite" aria-busy="true"/);
  assert.match(source, /\{isCurrentReanalysis && reanalyzeMutation\.isPending && \([\s\S]*?role="status"[\s\S]*?Re-analysis in progress\. The previous report is still shown\./);
  assert.match(source, /\{isCurrentReanalysis && reanalyzeMutation\.isError && \([\s\S]*?role="alert"[\s\S]*?Re-analysis unavailable\. The previous report is still shown; no fresh assessment or signing clearance was produced\./);
  assert.match(source, /reanalyzeRecordId\.current = id;[\s\S]*?reanalyzeMutation\.mutate/);
  assert.match(source, /const isCurrentReanalysis = hasAnalysisData && !isError && reanalyzeRecordId\.current === id/);
  const expression = source.match(/const isCurrentReanalysis = ([^;]+);/)[1];
  for (const [hasAnalysisData, isError, submitted, id, expected] of [[true, false, "a", "a", true], [true, false, "a", "b", false], [false, false, "a", "a", false], [true, true, "a", "a", false]]) {
    assert.equal(vm.runInNewContext(expression, { hasAnalysisData, isError, reanalyzeRecordId: { current: submitted }, reanalyzeGeneration: { current: 0 }, navigationGeneration: { current: 0 }, id }), expected);
  }
  assert.equal(vm.runInNewContext(expression, { hasAnalysisData: true, isError: false, reanalyzeRecordId: { current: 'a' }, reanalyzeGeneration: { current: 0 }, navigationGeneration: { current: 2 }, id: 'a' }), false, 'Returning to a report must not revive obsolete feedback');
  assert.match(source, /\{!isLoading && \(isError \|\| !hasAnalysisData\) && \([\s\S]*?role="alert"/);
  assert.doesNotMatch(source, /reanalyzeMutation\.error\.(?:message|stack)/);
});

test("saved-report controls read the router search parameter without claiming cache provenance", () => {
  const source = read("src/pages/analysis.tsx");
  assert.match(source, /import \{[^}]*useSearch[^}]*\} from 'wouter'/);
  assert.match(source, /const search = useSearch\(\)/);
  assert.match(source, /new URLSearchParams\(search\)\.get\('cached'\) === '1'/);
  assert.match(source, /Previously saved report/);
  assert.doesNotMatch(source, /location\.includes\('cached=1'\)|Instant result.*served from cache/);
  const expression = source.match(/const isCached = ([^;]+);/)[1];
  for (const [search, expected] of [["cached=1", true], ["cached=10", false], ["cached=0", false], ["notcached=1", false], ["", false], ["other=1&cached=1", true]]) {
    assert.equal(vm.runInNewContext(expression, { URLSearchParams, search }), expected, search);
  }
});

test("secondary and brand text use opaque contrast tokens, separate from primary fills", () => {
  const css = read("src/index.css");
  for (const text of ['subtle', 'primary-text', 'foreground']) {
    const value = token(css, text);
    assert.ok(value, `${text} must be an opaque color token`);
    for (const surface of ['background', 'card', 'secondary']) assert.ok(contrast(value, token(css, surface)) >= 4.5, `${text} on ${surface}`);
  }
  assert.notEqual(token(css, 'primary-text'), token(css, 'primary'));
  for (const name of ["home", "approvals", "wallet-monitor", "watchlist", "sites", "simulate", "history", "extension", "onboarding", "legal"]) {
    assert.doesNotMatch(read(`src/pages/${name}.tsx`), /text-white\/(?:[1-3]\d|4[0-5]|6)(?!\d)/, name);
    assert.doesNotMatch(read(`src/pages/${name}.tsx`), /text-primary(?!-)(?:\/\d+)?\b/, name);
  }
});

test("web viewport leaves zoom unrestricted", () => {
  const html = read("index.html");
  const viewport = html.match(/<meta\s+name="viewport"\s+content="([^"]+)"/)[1];
  assert.match(viewport, /width=device-width/);
  assert.doesNotMatch(viewport, /maximum-scale|user-scalable\s*=\s*(no|0)/i);
});

test("shared layout provides a keyboard skip link and focusable main target", () => {
  const layout = read("src/components/layout/Layout.tsx");
  assert.match(layout, /<a\s+href="#main-content"\s+className="skip-link">Skip to content<\/a>/);
  assert.match(layout, /<main\s+id="main-content"\s+tabIndex=\{-1\}/);
  assert.match(layout, /aria-current=\{active\s*\?\s*'page'\s*:\s*undefined\}/);
});

test("shared styles and motion provider respect reduced motion and keyboard focus", () => {
  const css = read("src/index.css");
  const outline = css.match(/:focus-visible\s*\{[^}]*outline:\s*2px solid (#[0-9a-f]{6}) !important/s);
  assert.ok(outline);
  assert.ok(contrast(outline[1], token(css, 'background')) >= 3);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*animation-duration:\s*0\.01ms !important/);
  assert.match(css, /animation-iteration-count:\s*1 !important/);
  assert.match(css, /scroll-behavior:\s*auto !important/);
  assert.match(read("src/App.tsx"), /<MotionConfig reducedMotion="user">/);
});

test("navigation focus stays inset and fragment target clears the sticky header", () => {
  const css = read("src/index.css");
  assert.match(css, /nav\[aria-label="Main navigation"\] a:focus-visible\s*\{[^}]*outline-offset:\s*-\d+px/s);
  assert.ok(Number(css.match(/#main-content\s*\{[^}]*scroll-margin-top:\s*(\d+)px/s)[1]) >= 128);
  const layout = read("src/components/layout/Layout.tsx");
  assert.match(layout, /min-h-16/);
  assert.doesNotMatch(layout, /hidden sm:inline|overflow-x-auto/);
  assert.match(layout, /<summary[\s\S]*?Tools/);
});

test("execution loading uses a static announced status when reduced motion is requested", () => {
  const source = read("src/components/sigil/ScanAnimation.tsx");
  assert.match(source, /useSyncExternalStore/);
  assert.match(source, /const reduceMotion = useSyncExternalStore\(subscribeToMotionPreference, motionPreferenceSnapshot, \(\) => true\)/);
  assert.match(source, /addEventListener\('change', onChange\)/);
  assert.match(source, /removeEventListener\('change', onChange\)/);
  const branch = source.split("if (reduceMotion) {")[1]?.split("\n  return (")[0];
  assert.ok(branch, "requires an explicit static reduced-motion branch");
  assert.match(branch, /role="status"/);
  assert.match(branch, /aria-live="polite"/);
  assert.doesNotMatch(branch, /motion\.|animate=|transition=|animate-/);
  assert.match(branch, /Checking available execution context/);
  assert.doesNotMatch(source, /Running AI heuristics and bytecode analysis/);
});
