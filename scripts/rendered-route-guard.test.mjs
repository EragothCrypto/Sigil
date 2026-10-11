import assert from "node:assert/strict";
import test from "node:test";
import { assertRenderedRoute } from "./rendered-route-guard.mjs";

const mounted = { headings: ["Privacy Policy"], headingVisible: true, mainCount: 1, textLength: 200, errors: [], assetFailures: [] };
test("contrast coverage requires the expected mounted route", () => {
  assert.doesNotThrow(() => assertRenderedRoute(mounted, "Privacy Policy"));
});
for (const [name, change] of Object.entries({
  blank: { headings: [], headingVisible: false, mainCount: 0, textLength: 0 },
  wrong_route: { headings: ["Not Found"] },
  hidden: { headingVisible: false },
  runtime_error: { errors: ["synthetic mount failure"] },
  asset_error: { assetFailures: ["synthetic missing JS"] },
  duplicate_main: { mainCount: 2 },
  missing_content: { textLength: 20 },
})) {
  test(`rendered contrast coverage rejects ${name}`, () => {
    assert.throws(() => assertRenderedRoute({ ...mounted, ...change }, "Privacy Policy"));
  });
}
