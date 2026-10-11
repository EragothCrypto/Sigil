const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const source = readFileSync(path.join(__dirname, 'src/pages/home.tsx'), 'utf8');

test('final entry exposes Solana before input and retains visible security qualification', () => {
  assert.ok(source.indexOf('href="/solana"') < source.indexOf('<form'));
  assert.match(source, /Partial evidence\. Not signing clearance\./);
  assert.match(source, /<summary[^>]*>Scope and limitations<\/summary>/);
  assert.match(source, /entry-analyze/);
  assert.match(source, /example-action/);
});

test('HOME begins with a compact labeled analysis form', () => {
  assert.match(source, /<h1[^>]*>Check a transaction or contract<\/h1>/);
  assert.match(source, /<form[\s\S]*?onSubmit=\{[\s\S]*?handleAnalyze\(\)/);
  for (const [id, label] of [['scan-network', 'Network'], ['scan-input', 'Transaction hash or contract address']]) {
    const element = source.match(new RegExp(`<label[^>]*htmlFor="${id}"[^>]*>${label}<\\/label>`));
    assert.ok(element, `visible label for ${id}`);
    assert.doesNotMatch(element[0], /sr-only/);
  }
  assert.match(source, /type="submit"[\s\S]*?disabled=\{!input\.trim\(\)\}/);
  assert.doesNotMatch(source, /const (STATS|FEATURES|HOW_IT_WORKS|START_PATHS)|framer-motion|gradient|tracking-|text-5xl|rounded-2xl/);
  assert.match(source, /bg-card/);
  assert.match(source, /border-border/);
  assert.match(source, /rounded-md/);
});

test('wallet permissions are prominent and identify supported legacy SPL scope', () => {
  assert.match(source, /href="\/solana"[\s\S]*?Check wallet permissions/);
  assert.match(source, /legacy SPL Token/);
  assert.match(source, /Token-2022[^<]*not supported/);
  assert.ok(source.indexOf('href="/solana"') < source.indexOf('href="/approvals"'));
  assert.match(source, /recorded approval events, not current allowances/);
  assert.match(source, /manual refresh, not background monitoring/);
  assert.match(source, /coverage limits/);
  assert.match(source, /not a safety guarantee/);
});

test('onboarding remains dismissible and follows the form', () => {
  assert.ok(source.includes('</form>'));
  assert.ok(source.indexOf('</form>') < source.indexOf('{showOnboardingPrompt &&'));
  assert.match(source, /Start onboarding/);
  assert.match(source, /aria-label="Dismiss onboarding"/);
  assert.match(source, /localStorage\.setItem\('sigil:onboarding-complete', 'true'\)/);
  assert.match(source, /setShowOnboardingPrompt\(false\)/);
});

test('examples explicitly analyze their own value only when clicked', () => {
  assert.match(source, /Examples \(runs analysis\)/);
  assert.match(source, /onClick=\{\(\) => \{\s*setInput\(ex\.value\);\s*handleAnalyzeValue\(ex\.value\);/);
  assert.match(source, /<StreamingAnalysisView phase=\{phase\} onCancel=\{handleCancel\}/);
  assert.match(source, /role="alert"/);
});
