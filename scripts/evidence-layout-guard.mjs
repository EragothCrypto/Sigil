import assert from 'node:assert/strict';

export function assertSeparatedLabels(first, second) {
  assert.ok(first && second && first.width > 0 && first.height > 0 && second.width > 0 && second.height > 0);
  assert.ok(first.x + first.width + 4 <= second.x || second.x + second.width + 4 <= first.x ||
    first.y + first.height + 4 <= second.y || second.y + second.height + 4 <= first.y,
  'Labels must be separated by at least four pixels, not touching or overlapping');
}

export function assertEvidenceLayout(snapshot, expected) {
  assert.equal(snapshot.text, expected, 'Complete evidence text must be retained');
  assert.ok(snapshot.width > 0 && snapshot.height > 0, 'Evidence must have visible bounds');
  assert.equal(snapshot.overflow, false, 'Evidence text must not overflow its own box');
  assert.equal(snapshot.clippedAncestor, false, 'Evidence must not be cut by a clipping ancestor');
}

export async function assertEvidenceReadable(locator, expected) {
  const snapshot = await locator.evaluate(element => {
    const rect = element.getBoundingClientRect();
    let clippedAncestor = false;
    for (let parent = element.parentElement; parent && parent.tagName !== 'BODY'; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (['hidden', 'clip'].includes(style.overflowX) && parent.scrollWidth > parent.clientWidth + 1
        || ['hidden', 'clip'].includes(style.overflowY) && parent.scrollHeight > parent.clientHeight + 1) clippedAncestor = true;
      if (parent.tagName === 'MAIN') break;
    }
    return { text: element.textContent.trim(), width: rect.width, height: rect.height,
      overflow: element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1, clippedAncestor };
  });
  assertEvidenceLayout(snapshot, expected);
}
