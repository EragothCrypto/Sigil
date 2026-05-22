import assert from "node:assert/strict";
import { evaluateSiteReputation, normalizeSiteHost } from "./site-reputation.js";

assert.equal(normalizeSiteHost("https://www.app.uniswap.org/swap"), "app.uniswap.org");

const trusted = evaluateSiteReputation("https://app.uniswap.org/swap");
assert.equal(trusted.verdict, "safe");
assert.equal(trusted.brand, "Uniswap");

const blocked = evaluateSiteReputation("https://metamask-security-alert.example");
assert.equal(blocked.verdict, "dangerous");
assert.equal(blocked.riskLevel, "critical");

const clone = evaluateSiteReputation("https://uniswap-airdrop.example");
assert.equal(clone.verdict, "caution");
assert.equal(clone.riskLevel, "high");
assert.match(clone.warnings.join(" "), /Uniswap/);
