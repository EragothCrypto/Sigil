import assert from "node:assert/strict";
import test from "node:test";

test("interception wait returns the actual intercepted value", async () => {
  const { waitForIntercept } = await import("./bounded-interception.mjs");
  const value = { synthetic: true };
  assert.equal(await waitForIntercept(Promise.resolve(value), "synthetic request", 100), value);
});
test("missing interception fails within its deadline with a bounded diagnostic", async () => {
  const { waitForIntercept } = await import("./bounded-interception.mjs");
  await assert.rejects(waitForIntercept(new Promise(() => {}), "synthetic request", 10), /Timed out waiting for synthetic request/);
});
test("interception wait preserves an actual rejection", async () => {
  const { waitForIntercept } = await import("./bounded-interception.mjs");
  const failure = new Error("synthetic failure");
  await assert.rejects(waitForIntercept(Promise.reject(failure), "synthetic request", 100), error => error === failure);
});
