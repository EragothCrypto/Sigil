const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const app = fs.readFileSync(path.join(root, "src", "App.tsx"), "utf8");
const layout = fs.readFileSync(path.join(root, "src", "components", "layout", "Layout.tsx"), "utf8");
const home = fs.readFileSync(path.join(root, "src", "pages", "home.tsx"), "utf8");
const onboardingPath = path.join(root, "src", "pages", "onboarding.tsx");

assert.match(app, /@\/pages\/onboarding/);
assert.match(app, /path="\/onboarding"/);
assert.match(layout, /href: '\/onboarding'/);
assert.match(home, /\/onboarding/);
assert.equal(fs.existsSync(onboardingPath), true);

const onboarding = fs.readFileSync(onboardingPath, "utf8");
const onboardingLower = onboarding.toLowerCase();
[
  "what approvals are",
  "why signatures are risky",
  "what Sigil verdicts mean",
  "how to use the extension",
  "how to monitor a wallet",
].forEach((topic) => assert.match(onboardingLower, new RegExp(topic.toLowerCase())));

assert.match(onboarding, /sigil:onboarding-complete/);
assert.match(onboardingLower, /chrome web store/);
assert.match(onboarding, /\/monitor/);
assert.match(onboarding, /\/approvals/);
