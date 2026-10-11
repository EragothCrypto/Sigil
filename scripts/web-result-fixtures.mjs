const address = `0x${"1".repeat(40)}`;
export const resultId = "12345678-1234-4234-8234-123456789abc";
// Renderer-only health fixtures; not actual provider output or effective rights.
const eventWallet = '0x1111111111111111111111111111111111111111';
const eventSpender = '0x2222222222222222222222222222222222222222';
const eventToken = '0x3333333333333333333333333333333333333333';
const eventRaw = ((1n << 256n) - 1n).toString();
export const approvalEventFixtures = ['empty', 'large', 'unavailable'].map(state => ({
  state,
  storedStatus: state === 'empty' ? 'clean' : state === 'large' ? 'high-risk' : 'unavailable',
  entry: { id: `mainnet:${eventWallet}`, label: 'Synthetic event wallet', address: eventWallet,
    network: 'mainnet', kind: 'wallet', status: 'unchecked', createdAt: '2026-10-10T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z' },
  payload: {
    wallet: eventWallet, network: 'mainnet', generatedAt: '2026-10-10T00:00:00Z',
    coverage: { status: state === 'unavailable' ? 'unavailable' : 'limited', message: state === 'unavailable'
      ? 'Synthetic explorer coverage unavailable; current allowances and wallet safety are not established.'
      : 'Synthetic approval-event coverage only; current allowances and token units were not checked.' },
    summary: { healthScore: state === 'empty' ? 100 : state === 'large' ? 10 : 0,
      totalActive: state === 'large' ? 1 : 0, unlimited: state === 'large' ? 1 : 0,
      critical: state === 'large' ? 1 : 0, high: 0 },
    approvals: state === 'large' ? [{ id: `mainnet:${eventToken}:${eventSpender}`, token: eventToken, spender: eventSpender,
      spenderEntity: null, amountRaw: eventRaw, amountLabel: eventRaw, isUnlimited: true, riskScore: 90,
      riskLevel: 'critical', trustLevel: 'unknown', recommendation: 'Prioritize this recorded approval event; verify the current allowance before deciding whether to revoke.',
      blockNumber: '16', transactionHash: `0x${'a'.repeat(64)}`, timestamp: null,
      explorerUrl: `https://etherscan.io/address/${eventSpender}`, revokeUrl: `https://revoke.cash/address/${eventWallet}?chainId=1` }] : [],
    revokeUrl: `https://revoke.cash/address/${eventWallet}?chainId=1`,
  },
}));

export const analysisFixture = {
  id: resultId, input: address, inputType: "transaction", network: "mainnet",
  summary: "Synthetic bounded evidence result for accessibility testing.",
  verdict: "caution", verdictReason: "Synthetic evidence gaps require review; no signing clearance.",
  riskScore: 35, riskLevel: "medium", warnings: [], positives: [], createdAt: "2026-10-09T00:00:00.000Z",
  details: { validatedReport: {
    version: "findings-v2", scorePolicy: "dual-floor-v2", evidenceRiskScore: null,
    uncertaintyScore: 35, decisionScore: 35, coverage: "partial",
    capabilities: { sourceVerification: true, receiptEvents: true, incidentLookup: true,
      inputDecoding: true, reportedTokenState: true, reportedPermissionState: true,
      internalTraces: false, isolatedBalanceDeltas: false },
    findings: [
      { id: "f:limit", code: "limit", category: "limitation", text: "Synthetic internal traces were not collected.", evidenceRefs: ["e:limit"] },
      { id: "f:observed", code: "observed", category: "observation", text: "Synthetic decoded intent and reported state; not execution effects.", evidenceRefs: ["e:observed"] },
      { id: "f:support", code: "support", category: "supported_indicator", text: "Synthetic source metadata is inspectable, not audited.", evidenceRefs: ["e:support"] },
    ],
    evidence: [
      { id: "e:limit", kind: "limit", subject: `mainnet:${address}`, value: "not collected" },
      { id: "e:support", kind: "support", subject: `mainnet:${address}`, value: "synthetic metadata" },
      { id: "e:observed", kind: "observed", subject: `mainnet:${address}`, value: "synthetic bounded observation",
        input: { status: "partial", source: "abi", historicalCertainty: false, reason: "current_abi_only",
          provenance: { network: "mainnet", address, abiAddress: address, blockTag: "0x123", scope: "current_only", proxyResolved: false },
          signature: "approve(address,uint256)", arguments: [{ name: "spender", type: "address", value: address }] },
        tokenStates: [{ address, status: "available", blockTag: "0x123", authority: "contract_reported_interface", decimals: 6, balanceRaw: "500000000" }],
        permissionStates: [{ token: address, owner: address, spender: address, blockTag: "0x123", kind: "erc20_allowance", rawValue: "500000000", authority: "contract_reported_interface" }],
        transfers: [{ kind: "erc20-shaped", token: address, from: address, to: address, amountRaw: "500000000" }],
        incident: { name: "Synthetic historical reference", network: "mainnet", hash: `0x${"2".repeat(64)}`,
          role: "association", date: "2023-03-13", reviewedAt: "2026-10-09",
          sources: [{ url: "https://example.com/synthetic-evidence", title: "Synthetic source reference", claim: "Synthetic reference only; no real incident attribution." }] },
      },
    ],
  } },
};
export const executionFixture = {
  reportVersion: "execution-check-v2", network: "mainnet", assessmentStatus: "call_check",
  summary: "Synthetic read-only call completed; not a safety assessment.",
  callCheck: { outcome: "success", blockNumber: "0x123", to: address, from: address },
  capabilities: { readOnlyCall: true, internalTraces: false, walletBalanceDeltas: false,
    storageSimulation: false, permissionState: false, historicalArchive: false },
  limitations: ["Synthetic read-only call is not mined execution or signing clearance.", "Synthetic internal traces and isolated wallet balance deltas are unavailable."],
};

// UI-only mixed branches; not a claim that one adapter emits all of these states.
export const nestedFixture = structuredClone(analysisFixture);
nestedFixture.id = '12345678-1234-4234-8234-123456789ab6';
nestedFixture.summary = 'Synthetic nested ABI intent and optional reported state; not executed effects.';
const nestedEvidence = nestedFixture.details.validatedReport.evidence.find(item => item.kind === 'observed');
const otherAddress = `0x${'3'.repeat(40)}`;
const largeRaw = (2n ** 256n - 1n).toString();
const provenance = { ...nestedEvidence.input.provenance };
nestedEvidence.input = {
  status: 'partial', source: 'abi', historicalCertainty: false, reason: 'current_abi_only', provenance,
  signature: 'multicall(bytes[])', arguments: [{ name: 'calls', type: 'bytes[]', value: [`0x${'ab'.repeat(128)}`] }],
  subcalls: [
    { status: 'partial', source: 'abi', historicalCertainty: false, reason: 'current_abi_only', provenance: { ...provenance },
      signature: 'batch((address,uint256)[])', arguments: [{ name: 'positions', type: 'tuple[]', value: [{ recipient: otherAddress, amount: largeRaw }] }],
      subcalls: [{ status: 'available', source: 'abi', historicalCertainty: true, reason: null,
        provenance: { ...provenance, scope: 'historical_bound', proxyResolved: true },
        signature: 'transfer(address,uint256)', arguments: [{ name: 'recipient', type: 'address', value: otherAddress }, { name: 'amount', type: 'uint256', value: largeRaw }] }],
    },
    { status: 'unavailable', source: 'abi', historicalCertainty: false, reason: 'synthetic_unknown_selector', provenance: { ...provenance } },
  ],
};
nestedEvidence.tokenStates.push({ address: otherAddress, status: 'unavailable', blockTag: '0x123', authority: 'contract_reported_interface', reason: 'synthetic_token_state_unavailable' });
nestedEvidence.permissionStates.push(
  { token: otherAddress, caller: address, spender: otherAddress, blockTag: '0x123', kind: 'erc721_approval', rawValue: otherAddress, tokenIdRaw: largeRaw, authority: 'contract_reported_interface' },
  { token: otherAddress, owner: address, spender: address, blockTag: '0x123', kind: 'operator_approval', rawValue: '1', authority: 'contract_reported_interface' },
);
export const advisoryFixture = {
  reportVersion: "execution-check-v2", network: "mainnet", assessmentStatus: "advisory_only",
  summary: "No executable destination context. This input was not remotely validated.",
  capabilities: { ...executionFixture.capabilities },
  limitations: ["A read-only call is not mined execution or signing clearance.", "Plaintext, calldata-only and contract creation are not supported call checks."],
};
export const unavailableFixture = {
  reportVersion: "execution-check-v2", network: "mainnet", assessmentStatus: "unavailable",
  summary: "The read-only call check is unavailable; no execution outcome is established.",
  capabilities: { ...executionFixture.capabilities },
  limitations: ["A read-only call is not mined execution or signing clearance.", "RPC evidence was unavailable, malformed or exceeded its budget."],
};

const lowFixture = structuredClone(analysisFixture);
lowFixture.id = "12345678-1234-4234-8234-123456789ab1";
lowFixture.summary = "Synthetic current low-warning result; not a safety guarantee.";
lowFixture.verdict = "dangerous";
lowFixture.verdictReason = "No concrete warning signs in synthetic acquired data; no signing clearance.";
lowFixture.details.validatedReport.uncertaintyScore = 0;
lowFixture.details.validatedReport.decisionScore = 5;
const riskFixture = structuredClone(analysisFixture);
riskFixture.id = "12345678-1234-4234-8234-123456789ab2";
riskFixture.summary = "Synthetic attributed risk finding; historical attribution is not current exploitability.";
riskFixture.verdict = "safe";
riskFixture.verdictReason = "Synthetic attributed warning requires review; no signing clearance.";
riskFixture.details.validatedReport.evidenceRiskScore = 80;
riskFixture.details.validatedReport.decisionScore = 80;
riskFixture.details.validatedReport.findings.push({ id: "f:risk", code: "risk", category: "risk", text: "Synthetic exact historical attribution, not current exploitability or user loss.", evidenceRefs: ["e:risk"] });
riskFixture.details.validatedReport.evidence.push({ id: "e:risk", kind: "risk", subject: `mainnet:${address}`, value: "Synthetic attributed observation only" });
const v1Fixture = structuredClone(analysisFixture);
v1Fixture.id = "12345678-1234-4234-8234-123456789ab3";
v1Fixture.summary = "Synthetic validated legacy report with narrower coverage.";
v1Fixture.details.validatedReport = { version: "findings-v1", scorePolicy: "max-floor-v1", findings: v1Fixture.details.validatedReport.findings, evidence: v1Fixture.details.validatedReport.evidence };
const legacyFixture = structuredClone(analysisFixture);
legacyFixture.id = "12345678-1234-4234-8234-123456789ab4";
legacyFixture.summary = "Synthetic unvalidated legacy report; fresh analysis required.";
legacyFixture.details = {};
const invalidFixture = structuredClone(analysisFixture);
invalidFixture.id = "12345678-1234-4234-8234-123456789ab5";
invalidFixture.summary = "Synthetic invalid report narrative must not render.";
invalidFixture.details.validatedReport.findings[0].evidenceRefs = ["e:missing"];
// Renderer-only legacy inputs, not provider observations or effective rights.
const approvalVariants = ["bounded", "large", "zero"].map((kind, index) => {
  const fixture = structuredClone(legacyFixture);
  fixture.id = `12345678-1234-4234-8234-123456789ac${index}`;
  fixture.summary = `Synthetic legacy ${kind} approval intent; executed permission not checked.`;
  if (kind === "large") fixture.summary = "Synthetic legacy large approve() intent; repeated approve() labels do not establish executed permission.";
  fixture.approvalInfo = {
    isApproval: true, isRevoke: kind === "zero", isUnlimited: kind === "large",
    approvalType: "approve", spender: address, tokenContract: otherAddress,
    amountFormatted: kind === "zero" ? "0" : kind === "large" ? largeRaw : "500.00",
    riskLevel: "medium", tokenPriceUsd: 1, approvalUsdLabel: "$500.00",
    priorApprovals: [{ id: "synthetic-prior", analyzedAt: "2026-01-01T00:00:00.000Z",
      amountFormatted: "500.00", isUnlimited: false, network: "mainnet" }],
  };
  return { state: `legacy-approval-${kind}`, fixture, version: null, label: "Proceed with Caution" };
});
export const analysisVariants = [
  { state: "current-low", fixture: lowFixture, version: "findings-v2", score: 5, verdict: "safe", label: "No Concrete Warning Signs Detected" },
  { state: "current-risk", fixture: riskFixture, version: "findings-v2", score: 80, verdict: "dangerous", label: "Do Not Sign" },
  { state: "legacy-validated", fixture: v1Fixture, version: "findings-v1", label: "Proceed with Caution" },
  { state: "legacy-unvalidated", fixture: legacyFixture, version: null, label: "Proceed with Caution" },
  { state: "invalid-evidence", fixture: invalidFixture, version: null },
  ...approvalVariants,
];
