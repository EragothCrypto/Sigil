const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { stripTypeScriptTypes } = require("node:module");
const { join } = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

function loadAnalyzer(create = async () => { throw new Error("unexpected AI call"); }, model = "deepseek/deepseek-v4-flash") {
  const source = readFileSync(join(__dirname, "ai-analyzer.ts"), "utf8")
    .replace(/^import .*;\r?\n/gm, "")
    .replace(/export /g, "");
  const context = vm.createContext({
    openai: { chat: { completions: { create } } },
    getSigilAiModel: () => model,
  });
  vm.runInContext(stripTypeScriptTypes(source), context);
  return context;
}

const verdict = { summary: "Public contract analysis.", verdict: "caution", verdictReason: "Caution: review permissions", riskScore: 40, warnings: ["Review permissions"], positives: [] };

test("malformed and incomplete AI verdicts fail instead of inventing a score", () => {
  const api = loadAnalyzer();
  for (const input of ["", '{"riskScore":', "{}", "null", "[]", JSON.stringify({ ...verdict, riskScore: "unknown" }), JSON.stringify({ ...verdict, riskScore: 101 }), JSON.stringify({ ...verdict, warnings: [null] })]) {
    assert.throws(() => api.parseVerdictJson(input), /AI analysis output/);
  }
});

test("valid fenced verdicts preserve real zero scores and trim whitespace", () => {
  const api = loadAnalyzer();
  const result = api.parseVerdictJson(` \n\`\`\`json\n${JSON.stringify({ ...verdict, riskScore: 0, verdict: "safe", warnings: [] })}\n\`\`\`\n`);
  assert.equal(result.riskScore, 0);
  assert.equal(result.verdict, "safe");
});

function streamingApi(parts, finishReason = "stop") {
  let calls = 0;
  return loadAnalyzer(async () => {
    if (++calls === 1) return { choices: [{ message: { content: '{"signals":[],"estimatedBaseScore":40}' } }] };
    return (async function* () {
      for (const content of parts) yield { choices: [{ delta: { content } }] };
      yield { choices: [{ delta: {}, finish_reason: finishReason }] };
    })();
  });
}

test("streaming accepts a separator split across chunks without leaking JSON", async () => {
  const events = [];
  const api = streamingApi(["Contract summary.\n---JS", "ON---\n", JSON.stringify(verdict)]);
  const result = await api.runStreamingAnalysis("context", "", (e) => events.push(e));
  assert.equal(result.summary, "Contract summary.");
  assert.equal(events.filter(e => e.type === "token").map(e => e.text).join(""), "Contract summary.\n");
});

test("JSON-only model output is accepted without treating it as prose", async () => {
  const api = streamingApi([JSON.stringify(verdict)]);
  const result = await api.runStreamingAnalysis("context", "", () => {});
  assert.equal(result.summary, verdict.summary);
  assert.equal(result.riskScore, 40);
});

test("truncated and malformed streams never emit a successful result", async () => {
  for (const [parts, reason] of [[["Summary\n---JSON---\n", JSON.stringify(verdict)], "length"], [["Summary without a verdict"], "stop"]]) {
    const events = [];
    const api = streamingApi(parts, reason);
    await assert.rejects(api.runStreamingAnalysis("context", "", (e) => events.push(e)), /AI analysis output/);
    assert.equal(events.some(e => e.type === "result"), false);
  }
});

test("DeepSeek has bounded headroom for reasoning plus the complete verdict", async () => {
  const calls = [];
  const api = loadAnalyzer(async (request) => {
    calls.push(request);
    if (calls.length === 1) return { choices: [{ message: { content: '{"signals":[],"estimatedBaseScore":40}' }, finish_reason: "stop" }] };
    return (async function* () {
      yield { choices: [{ delta: { content: JSON.stringify(verdict) }, finish_reason: "stop" }] };
    })();
  });
  await api.runStreamingAnalysis("context", "", () => {});
  assert.equal(calls[0].max_completion_tokens, 4096);
  assert.equal(calls[1].max_completion_tokens, 12288);
  assert.equal(calls.length, 2);
});

test("length-limited evidence collection stops before verdict generation", async () => {
  let calls = 0;
  const api = loadAnalyzer(async () => {
    calls += 1;
    return { choices: [{ message: { content: '{"signals":' }, finish_reason: "length" }] };
  });
  await assert.rejects(api.runStreamingAnalysis("context", "", () => {}), (error) => error.code === "truncated_ai_output");
  assert.equal(calls, 1);
});

test("non-streaming DeepSeek uses the same reasoning-aware budgets", async () => {
  const calls = [];
  const api = loadAnalyzer(async (request) => {
    calls.push(request);
    return { choices: [{ message: { content: calls.length === 1 ? '{"signals":[]}' : JSON.stringify(verdict) }, finish_reason: "stop" }] };
  });
  await api.runTwoStepAnalysis("context");
  assert.equal(calls[0].max_completion_tokens, 4096);
  assert.equal(calls[1].max_completion_tokens, 12288);
});

test("stream transport fallback retains the same bounded verdict budget", async () => {
  const calls = [];
  const api = loadAnalyzer(async (request) => {
    calls.push(request);
    if (calls.length === 1) return { choices: [{ message: { content: '{"signals":[]}' }, finish_reason: "stop" }] };
    if (calls.length === 2) throw new Error("stream transport unavailable");
    return { choices: [{ message: { content: JSON.stringify(verdict) }, finish_reason: "stop" }] };
  });
  await api.runStreamingAnalysis("context", "", () => {});
  assert.equal(calls[2].max_completion_tokens, 12288);
  assert.equal(calls.length, 3);
});

test("other configured models retain their existing token ceilings", () => {
  const api = loadAnalyzer(undefined, "another/model");
  assert.equal(api.completionTokenBudget("signals"), 700);
  assert.equal(api.completionTokenBudget("verdict"), 2048);
});

test("non-streaming truncated signals do not trigger another billable call", async () => {
  let calls = 0;
  const api = loadAnalyzer(async () => {
    calls += 1;
    return { choices: [{ message: { content: "" }, finish_reason: "length" }] };
  });
  await assert.rejects(api.runTwoStepAnalysis("context"), (error) => error.code === "truncated_ai_output");
  assert.equal(calls, 1);
});

test("a length-limited verdict is not automatically retried", async () => {
  let calls = 0;
  const api = loadAnalyzer(async () => {
    if (++calls === 1) return { choices: [{ message: { content: '{"signals":[]}' }, finish_reason: "stop" }] };
    return (async function* () {
      yield { choices: [{ delta: { content: JSON.stringify(verdict) }, finish_reason: "length" }] };
    })();
  });
  await assert.rejects(api.runStreamingAnalysis("context", "", () => {}), (error) => error.code === "truncated_ai_output");
  assert.equal(calls, 2);
});

test("Tornado Cash context records historical delisting, not a current blanket sanction", () => {
  const source = readFileSync(join(__dirname, "known-entities.ts"), "utf8").replace(/export /g, "");
  const context = vm.createContext({});
  vm.runInContext(stripTypeScriptTypes(source), context);
  const entity = context.lookupEntity("0xa160cdab225685da1d56aa342ad8841c3b53f291");
  assert.equal(entity.trustLevel, "caution");
  assert.match(entity.description, /March 21, 2025/);
  assert.doesNotMatch(entity.description, /may violate OFAC|US persons are prohibited/);
  assert.match(entity.url, /sb0057/);
});
