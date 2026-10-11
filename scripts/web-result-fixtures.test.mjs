import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { analysisFixture, executionFixture } from "./web-result-fixtures.mjs";
import * as fixtures from "./web-result-fixtures.mjs";

test("approval-event renderer fixtures preserve raw values and map actual stored statuses without rights claims", () => {
  assert.ok(Array.isArray(fixtures.approvalEventFixtures));
  assert.deepEqual(fixtures.approvalEventFixtures.map(item => item.state), ['empty', 'large', 'unavailable']);
  const context = vm.createContext({});
  const source = readFileSync(new URL('../artifacts/sigil/src/lib/watchlist.ts', import.meta.url), 'utf8');
  vm.runInContext(stripTypeScriptTypes(source.replace(/export /g, '')), context);
  for (const fixture of fixtures.approvalEventFixtures) {
    context.input = { ...fixture.payload.summary, coverageStatus: fixture.payload.coverage.status };
    assert.equal(vm.runInContext('statusFromApprovalSummary(input)', context), fixture.storedStatus);
    assert.equal(fixture.payload.wallet, fixture.entry.address);
    assert.equal(fixture.entry.status, 'unchecked');
  }
  const large = fixtures.approvalEventFixtures[1].payload.approvals[0];
  assert.equal(large.amountRaw, ((1n << 256n) - 1n).toString());
  assert.equal(large.amountLabel, large.amountRaw);
});

test("nested result fixture covers recursive calls and optional unavailable/NFT/operator state", () => {
  const fixture = fixtures.nestedFixture;
  assert.ok(fixture, 'Nested fixture must exist');
  assert.notEqual(fixture.id, analysisFixture.id);
  const context = vm.createContext({ URL, TextEncoder, details: fixture.details });
  const source = readFileSync(new URL("../lib/api-zod/src/validated-report.ts", import.meta.url), "utf8");
  vm.runInContext(stripTypeScriptTypes(source.replace(/export /g, "")), context);
  assert.ok(vm.runInContext("parseValidatedReport(details)", context));
  const evidence = fixture.details.validatedReport.evidence.find(item => item.kind === 'observed');
  assert.equal(evidence.input.subcalls.length, 2);
  assert.equal(evidence.input.subcalls[0].subcalls.length, 1);
  assert.equal(evidence.input.subcalls[1].status, 'unavailable');
  assert.equal('signature' in evidence.input.subcalls[1], false);
  assert.equal(evidence.input.subcalls[0].subcalls[0].historicalCertainty, true);
  assert.equal(evidence.tokenStates[1].status, 'unavailable');
  assert.equal('balanceRaw' in evidence.tokenStates[1], false);
  assert.deepEqual(evidence.permissionStates.map(state => state.kind), ['erc20_allowance', 'erc721_approval', 'operator_approval']);
  assert.equal('caller' in evidence.permissionStates[2], false);
  context.details = structuredClone(fixture.details);
  context.details.validatedReport.evidence[2].input.subcalls[1].signature = 'injected()';
  assert.equal(vm.runInContext("parseValidatedReport(details)", context), null, 'Unavailable child cannot claim a decoded signature');
});

test('producer nested fixture survives actual decoder, finding inventory and shared client parser', async () => {
  const { producerNestedFixture } = await import('./web-producer-fixture.mjs');
  const report = producerNestedFixture.details.validatedReport;
  assert.ok(!report.findings.some(f => f.code === 'adapter_evidence_invalid'));
  const input = report.evidence.find(e => e.kind === 'decoded_intent').input;
  assert.equal(input.signature, 'multicall(bytes[])');
  assert.equal(input.arguments[0].value.length, 2);
  assert.equal(input.subcalls.length, 2);
  assert.equal(input.subcalls[0].signature, 'multicall(bytes[])');
  assert.equal(input.subcalls[0].subcalls[0].signature, 'positions((address,uint256)[])');
  assert.equal(input.subcalls[1].status, 'unavailable');
  assert.equal(input.subcalls[1].reason, 'unknown_selector');
  for (const call of [input, input.subcalls[0], input.subcalls[0].subcalls[0], input.subcalls[1]]) {
    assert.equal(call.provenance.scope, 'current_only');
    assert.equal(call.historicalCertainty, false);
  }
});

test("browser result fixtures pass the actual bounded client validators", () => {
  const context = vm.createContext({ URL, TextEncoder });
  const reportSource = readFileSync(new URL("../lib/api-zod/src/validated-report.ts", import.meta.url), "utf8");
  vm.runInContext(stripTypeScriptTypes(reportSource.replace(/export /g, "")), context);
  context.details = analysisFixture.details;
  assert.ok(vm.runInContext("parseValidatedReport(details)", context));
  const executionSource = readFileSync(new URL("../artifacts/sigil/src/components/sigil/SimulationResultView.tsx", import.meta.url), "utf8")
    .split("export function SimulationResultView")[0].replace(/^import .*;\r?\n/gm, "").replace(/export /g, "");
  vm.runInContext(stripTypeScriptTypes(executionSource), context);
  context.execution = executionFixture;
  assert.equal(vm.runInContext("isExecutionReport(execution)", context), true);
  context.execution = { ...executionFixture, assessmentStatus: "safe" };
  assert.equal(vm.runInContext("isExecutionReport(execution)", context), false);
});

for (const [name, status] of [["advisoryFixture", "advisory_only"], ["unavailableFixture", "unavailable"]]) {
  test(`${name} is a bounded non-execution report accepted by the actual client validator`, () => {
    const fixture = fixtures[name];
    assert.ok(fixture, `${name} must exist for browser coverage`);
    assert.equal(fixture.assessmentStatus, status);
    assert.equal("callCheck" in fixture, false);
    assert.equal(fixture.capabilities.readOnlyCall, true);
    assert.ok(fixture.limitations.length > 0);
    const context = vm.createContext({ execution: fixture });
    const source = readFileSync(new URL("../artifacts/sigil/src/components/sigil/SimulationResultView.tsx", import.meta.url), "utf8")
      .split("export function SimulationResultView")[0].replace(/^import .*;\r?\n/gm, "").replace(/export /g, "");
    vm.runInContext(stripTypeScriptTypes(source), context);
    assert.equal(vm.runInContext("isExecutionReport(execution)", context), true);
    context.execution = { ...fixture, callCheck: executionFixture.callCheck };
    assert.equal(vm.runInContext("isExecutionReport(execution)", context), false, "Non-execution status must reject injected success metadata");
  });
}

test("analysis variants distinguish current score-derived verdicts, validated legacy, unvalidated legacy and invalid evidence", () => {
  assert.ok(Array.isArray(fixtures.analysisVariants), "Analysis variants must exist for rendered coverage");
  assert.deepEqual(fixtures.analysisVariants.map(item => item.state), ["current-low", "current-risk", "legacy-validated", "legacy-unvalidated", "invalid-evidence", "legacy-approval-bounded", "legacy-approval-large", "legacy-approval-zero"]);
  const context = vm.createContext({ URL, TextEncoder });
  const source = readFileSync(new URL("../lib/api-zod/src/validated-report.ts", import.meta.url), "utf8");
  vm.runInContext(stripTypeScriptTypes(source.replace(/export /g, "")), context);
  for (const variant of fixtures.analysisVariants) {
    assert.match(variant.fixture.id, /^[0-9a-f-]{36}$/);
    context.details = variant.fixture.details;
    const report = vm.runInContext("parseValidatedReport(details)", context);
    assert.equal(report?.version ?? null, variant.version);
    if (variant.version === "findings-v2") {
      assert.equal(report.decisionScore, variant.score);
      assert.notEqual(variant.fixture.verdict, variant.verdict, "Outer stale verdict must not determine current report verdict");
    }
  }
  const risk = fixtures.analysisVariants.find(item => item.state === "current-risk");
  assert.ok(risk.fixture.details.validatedReport.findings.some(item => item.category === "risk"));
  const invalid = fixtures.analysisVariants.find(item => item.state === "invalid-evidence");
  assert.ok("validatedReport" in invalid.fixture.details, "Invalid report must not be mistaken for absent legacy validation");
});

test("legacy approval variants exercise bounded, large and zero intent without fabricated effective rights", () => {
  const variants = fixtures.analysisVariants.filter(item => item.state.startsWith("legacy-approval-"));
  assert.equal(variants.length, 3);
  for (const { fixture, version } of variants) {
    assert.equal(version, null);
    assert.deepEqual(fixture.details, {});
    assert.equal(fixture.approvalInfo.isApproval, true);
    assert.equal(fixture.approvalInfo.approvalType, "approve");
    assert.match(fixture.approvalInfo.spender, /^0x1{40}$/);
    assert.match(fixture.approvalInfo.tokenContract, /^0x3{40}$/);
    assert.equal(fixture.approvalInfo.priorApprovals.length, 1);
    assert.equal(fixture.approvalInfo.priorApprovals[0].network, "mainnet");
    assert.equal(fixture.approvalInfo.tokenPriceUsd, 1);
    assert.equal("effectiveAllowance" in fixture.approvalInfo, false);
  }
  assert.equal(variants[0].fixture.approvalInfo.isUnlimited, false);
  assert.equal(variants[1].fixture.approvalInfo.isUnlimited, true);
  assert.equal(variants[1].fixture.summary.match(/approve\(\)/g)?.length, 2);
  assert.equal(variants[2].fixture.approvalInfo.isRevoke, true);
});
