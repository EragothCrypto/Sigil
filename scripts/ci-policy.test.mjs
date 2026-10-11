import assert from "node:assert/strict";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import test from "node:test";

const require = createRequire(realpathSync(new URL("../lib/api-spec/node_modules/orval/package.json", import.meta.url)));
const { parse } = require("yaml");
const file = new URL("../.github/workflows/verify.yml", import.meta.url);
const source = existsSync(file) ? readFileSync(file, "utf8") : "";
const workflow = parse(source) || {};
const steps = Object.values(workflow.jobs || {}).flatMap((job) => job.steps || []);

test("CI exists and runs unprivileged PR, push and scheduled checks", () => {
  assert.ok(workflow.on?.pull_request !== undefined);
  assert.ok(workflow.on?.push !== undefined);
  assert.ok(workflow.on?.schedule?.length);
  assert.equal(workflow.on?.pull_request_target, undefined);
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.doesNotMatch(source, /secrets\./);
});

test("CI pins actions and does not persist checkout credentials", () => {
  assert.ok(steps.some((step) => step.uses?.startsWith("actions/checkout@")));
  for (const step of steps.filter((step) => step.uses)) {
    assert.match(step.uses, /@[a-f0-9]{40}$/);
    if (step.uses.startsWith("actions/checkout@")) assert.equal(step.with?.["persist-credentials"], false);
  }
});

test("CI required baseline and audit checks cannot be skipped or failure-masked", () => {
  const required = ["pnpm install --frozen-lockfile", "pnpm run test:baseline", "pnpm run typecheck", "node scripts/check-codegen.mjs", "pnpm --filter @workspace/api-server run build", "pnpm --filter @workspace/sigil run build", "node scripts/verify-api-build.mjs", "pnpm audit --audit-level=low", "pnpm licenses list --json", "node scripts/generate-sbom.mjs --inventory", "node scripts/collect-license-texts.mjs --inventory", "-EvidenceDirectory"];
  for (const command of required) {
    const step = steps.find((candidate) => candidate.run?.includes(command));
    assert.ok(step, `Missing required command: ${command}`);
    assert.equal(step.if, undefined);
    assert.equal(step["continue-on-error"], undefined);
  }
  for (const job of Object.values(workflow.jobs || {})) {
    assert.equal(job.if, undefined);
    assert.equal(job["continue-on-error"], undefined);
    for (const step of job.steps || []) assert.equal(step["continue-on-error"], undefined);
  }
  assert.doesNotMatch(source, /\|\|\s*(true|exit\s+0)|NODE_TLS_REJECT_UNAUTHORIZED|--ignore-scripts/);
});

test("real environment files are not tracked (not a full secret-history scan)", () => {
  const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8", cwd: new URL("..", import.meta.url) }).split("\0");
  for (const name of files) assert.ok(!/(^|\/)\.env(?:\.|$)/.test(name) || name.endsWith("/.env.example") || name === ".env.example", `Real env filename tracked: ${name}`);
});

test("baseline TS regressions use the workspace owning the installed tsx dependency", () => {
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const command = manifest.scripts["test:baseline"];
  assert.doesNotMatch(command, /(?:^|&&\s*)pnpm exec tsx/);
  assert.equal((command.match(/pnpm --filter @workspace\/scripts exec tsx \.\.\/artifacts\//g) || []).length, 4);
});

test("real PostgreSQL retention drill is isolated, pinned and required", () => {
  const job = workflow.jobs?.retention;
  assert.ok(job, "Missing real PostgreSQL job");
  assert.equal(job.if, undefined);
  assert.equal(job["continue-on-error"], undefined);
  const database = job.services?.postgres;
  assert.match(database.image, /^postgres@sha256:[a-f0-9]{64}$/);
  assert.equal(database.env.POSTGRES_DB, "sigil_p00_retention");
  assert.equal(database.env.POSTGRES_USER, "sigil_p00");
  assert.deepEqual(database.ports, ["127.0.0.1:5432:5432"]);
  const step = job.steps.find((entry) => entry.run?.includes("node scripts/verify-retention-postgres.mjs"));
  assert.ok(step);
  assert.equal(step.if, undefined);
  assert.match(step.run, /--force-database-failure/);
  assert.match(step.run, /assert\.equal\(report\.stage,"forced_database_failure"\)/);
  assert.match(step.run, /assert\.equal\(report\.code,"42P01"\)/);
  assert.equal((step.run.match(/^\s*node scripts\/verify-retention-postgres\.mjs\s*$/gm) || []).length, 2);
  assert.match(step.env.SIGIL_P00_DATABASE_URL, /^postgresql:\/\/sigil_p00:[^@]+@127\.0\.0\.1:5432\/sigil_p00_retention$/);
  assert.equal(step.env.DATABASE_URL, undefined);
  const buildIndex = job.steps.findIndex((entry) => entry.run === "pnpm --filter @workspace/api-server run build");
  const httpIndex = job.steps.findIndex((entry) => entry.run === "node scripts/verify-retention-http.mjs");
  assert.ok(buildIndex >= 0 && httpIndex > buildIndex, "Built HTTP retention drill must be required");
  assert.equal(job.steps[httpIndex].if, undefined);
  assert.equal(job.steps[httpIndex]["continue-on-error"], undefined);
  assert.equal(job.steps[httpIndex].env.SIGIL_P00_DATABASE_URL, step.env.SIGIL_P00_DATABASE_URL);
  assert.ok(httpIndex > job.steps.indexOf(step), "HTTP schema must follow the empty-database SQL drills");
});

test("real private-history HTTP controls run in their own fresh required database job", () => {
  const job = workflow.jobs?.privacy;
  assert.ok(job, "Missing private-history PostgreSQL job");
  assert.equal(job.if, undefined);
  assert.equal(job["continue-on-error"], undefined);
  const database = job.services?.postgres;
  assert.equal(database.image, workflow.jobs.retention.services.postgres.image);
  assert.deepEqual(database.env, { POSTGRES_DB: "sigil_p00_retention", POSTGRES_USER: "sigil_p00", POSTGRES_PASSWORD: "synthetic-ci-only" });
  assert.deepEqual(database.ports, ["127.0.0.1:5432:5432"]);
  assert.match(database.options, /pg_isready -U sigil_p00 -d sigil_p00_retention/);
  const install = job.steps.findIndex(step => step.run === "pnpm install --frozen-lockfile");
  const build = job.steps.findIndex(step => step.run === "pnpm --filter @workspace/api-server run build");
  const check = job.steps.findIndex(step => step.run === "node scripts/verify-retention-http.mjs --privacy");
  assert.ok(install >= 0 && build > install && check > build);
  for (const index of [install, build, check]) {
    assert.equal(job.steps[index].if, undefined, "Privacy prerequisites and check must never be skipped");
    assert.equal(job.steps[index]["continue-on-error"], undefined);
  }
  assert.equal(job.steps[check].env.SIGIL_P00_DATABASE_URL,
    "postgresql://sigil_p00:synthetic-ci-only@127.0.0.1:5432/sigil_p00_retention");
  assert.equal(job.steps[check].env.DATABASE_URL, undefined);
  assert.equal(job.steps.some(step => /verify-retention-postgres|maintenance\/retention|DROP TABLE|TRUNCATE/i.test(step.run ?? "")), false);
});
