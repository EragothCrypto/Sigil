const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { stripTypeScriptTypes } = require("node:module");
const { join } = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

function loadAnalyzer(create = async () => { throw new Error("unexpected AI call"); }) {
  const source = readFileSync(join(__dirname, "ai-analyzer.ts"), "utf8")
    .replace(/^import .*;\r?\n/gm, "")
    .replace(/export /g, "");
  const context = vm.createContext({
    openai: { chat: { completions: { create } } },
    getSigilAiModel: () => "deepseek/deepseek-v4-flash",
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
