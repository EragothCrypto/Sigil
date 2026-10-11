import assert from "node:assert/strict";

export function assertRenderedRoute(snapshot, expectedHeading) {
  assert.deepEqual(snapshot.errors, [], "Application runtime errors invalidate contrast coverage");
  assert.deepEqual(snapshot.assetFailures, [], "Local load failures invalidate contrast coverage");
  assert.equal(snapshot.mainCount, 1, "Expected one mounted application main");
  assert.equal(snapshot.headingVisible, true, "Route heading must be visible");
  assert.deepEqual(snapshot.headings, [expectedHeading], "Wrong or missing route heading");
  assert.ok(snapshot.textLength >= 100, "Mounted route content is missing");
}
