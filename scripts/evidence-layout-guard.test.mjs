import assert from 'node:assert/strict';
import test from 'node:test';

const visible = { text: 'full evidence', width: 240, height: 48, overflow: false, clippedAncestor: false };
test('label separation rejects touching and overlapping boxes in either direction', async () => {
  const { assertSeparatedLabels } = await import('./evidence-layout-guard.mjs');
  const first = { x: 0, y: 0, width: 20, height: 10 };
  assert.doesNotThrow(() => assertSeparatedLabels(first, { ...first, x: 24 }));
  assert.doesNotThrow(() => assertSeparatedLabels(first, { ...first, y: 14 }));
  assert.doesNotThrow(() => assertSeparatedLabels({ ...first, y: 14 }, first));
  for (const second of [{ ...first, x: 20 }, { ...first, y: 10 }, { ...first, y: 12 }, { ...first }]) {
    assert.throws(() => assertSeparatedLabels(first, second));
  }
  assert.throws(() => assertSeparatedLabels(first, null));
});
test('readable evidence layout preserves complete text and uncut bounds', async () => {
  const { assertEvidenceLayout } = await import('./evidence-layout-guard.mjs');
  assert.doesNotThrow(() => assertEvidenceLayout(visible, visible.text));
});
for (const [name, changes] of [['local clipping', { overflow: true }], ['ancestor clipping', { clippedAncestor: true }], ['missing text', { text: 'full' }], ['zero dimensions', { height: 0 }]]) {
  test(`evidence layout rejects ${name}`, async () => {
    const { assertEvidenceLayout } = await import('./evidence-layout-guard.mjs');
    assert.throws(() => assertEvidenceLayout({ ...visible, ...changes }, visible.text));
  });
}
