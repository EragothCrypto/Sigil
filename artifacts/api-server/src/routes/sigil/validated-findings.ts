import type { TransactionData, ContractData } from "./ethereum.js";
import { lookupEntity } from "./known-entities.js";

export type FindingCategory = "observation" | "limitation" | "risk" | "supported_indicator";
export interface ValidatedFinding {
  id: string;
  code: string;
  category: FindingCategory;
  text: string;
  evidenceRefs: string[];
}
export interface ValidatedReport {
  version: "findings-v1";
  scorePolicy: "max-floor-v1";
  findings: ValidatedFinding[];
  evidence: FindingInventory["evidence"];
}
export interface FindingInventory {
  findings: ValidatedFinding[];
  evidence: Array<{ id: string; kind: string; subject: string; value: string; transfers?: NonNullable<TransactionData["receiptEvidence"]>["transfers"] }>;
  score: number;
  subject: string;
}

function inventory(subject: string): FindingInventory {
  return { findings: [], evidence: [], score: 5, subject };
}

function add(data: FindingInventory, code: string, category: FindingCategory, text: string, value: string, floor = 5): void {
  const evidenceId = `e:${code}`;
  data.evidence.push({ id: evidenceId, kind: code, subject: data.subject, value });
  data.findings.push({ id: `f:${code}`, code, category, text, evidenceRefs: [evidenceId] });
  data.score = Math.max(data.score, floor);
}

function source(data: FindingInventory, state: string | undefined): void {
  if (state === "verified") add(data, "source_verified", "supported_indicator", "Explorer source verification makes destination source inspectable; it is not a safety audit.", state);
  else if (state === "unverified") add(data, "source_unverified", "limitation", "Destination source is unverified; its logic was not inspected.", state, 40);
  else add(data, "source_unknown", "limitation", "Destination source verification could not be established.", "unknown", 35);
}

function registry(data: FindingInventory, address: string, network: string): void {
  // This legacy registry identifies Ethereum addresses, not cross-chain deployments.
  if (network !== "mainnet") return;
  const entity = lookupEntity(address);
  if (!entity) return;
  add(data, "registry_identity", "observation", `Destination matches ${entity.name.slice(0, 80)} in Sigil's local Ethereum registry; this is not an audit.`, address.toLowerCase());
  if (entity.category === "Exploiter" && entity.trustLevel === "dangerous") {
    add(data, "registry_danger", "risk", "Destination is flagged dangerous in Sigil's curated Ethereum registry; this is not live exploit or sanctions verification.", address.toLowerCase(), 90);
  }
}

export function transactionFindings(tx: TransactionData, network: string, methodName: string | null, approval: { isUnlimited?: boolean } | null): FindingInventory {
  const data = inventory(`${network}:${tx.to.toLowerCase()}`);
  registry(data, tx.to, network);
  if (tx.destinationHasCode !== false) source(data, tx.destinationVerification);
  else add(data, "destination_no_code", "observation", "No destination bytecode was observed at the transaction block.", "absent");
  const outcome = tx.status === "0x1" ? "successful" : tx.status === "0x0" ? "reverted" : "unknown";
  add(data, "execution_status", "observation", `Observed execution outcome: ${outcome}. Execution success is not a safety indicator.`, outcome);
  if (outcome !== "successful" || tx.inclusionStatus !== "mined") add(data, "execution_incomplete", "limitation", "Execution effects cannot be fully assessed from the available inclusion/outcome data.", tx.inclusionStatus ?? "unknown", 35);
  if (methodName) add(data, "local_method", "observation", `Local selector registry identifies ${methodName.slice(0, 100)}; this does not prove execution semantics.`, methodName.slice(0, 100));
  else if (tx.input.length >= 10) add(data, "method_unknown", "limitation", "The method selector is not recognized by Sigil's local registry; call intent is unclear.", tx.input.slice(0, 10), 35);
  const receipt = tx.receiptEvidence;
  if (receipt?.status === "available") {
    add(data, "transfer_observations", "observation", `${receipt.transfers.length} Transfer-shaped events were recorded. Other event types are not decoded; this is not a balance or net-loss assessment.`, String(receipt.transfers.length));
    data.evidence[data.evidence.length - 1]!.transfers = receipt.transfers.slice(0, 50).map(t => ({ kind: t.kind, token: t.token, from: t.from, to: t.to, ...(t.amountRaw !== undefined ? { amountRaw: t.amountRaw } : {}), ...(t.tokenIdRaw !== undefined ? { tokenIdRaw: t.tokenIdRaw } : {}) }));
    if (receipt.transfers.length) {
      add(data, "raw_units_unknown", "limitation", "Token units and emitter-to-symbol mappings were not established; raw amounts do not establish economic size.", "units_unknown");
      if (receipt.transfers.some(t => /^0x0{40}$/i.test(t.from) || /^0x0{40}$/i.test(t.to))) add(data, "mint_burn_shaped", "observation", "Zero-address mint/burn-shaped events were observed; these alone do not establish inflation, manipulation or actual supply changes.", "observed");
    }
    if (!receipt.complete) add(data, "receipt_partial", "limitation", "Receipt event decoding is partial; omitted movements cannot be ruled out.", "partial", 35);
  } else add(data, "receipt_unavailable", "limitation", "Usable successful receipt evidence is unavailable; asset movement is not established.", receipt?.status ?? "unavailable", 35);
  add(data, "traces_missing", "limitation", "Internal call traces and wallet balance deltas were not collected; event order does not establish fund routing or recipient control.", "not_collected");
  if (approval) {
    add(data, "approval_intent", "observation", "Approval-shaped calldata expresses attempted intent, not confirmed token permissions.", "attempted");
    add(data, "allowance_unknown", "limitation", "Token semantics and executed allowance state were not checked; NFT token IDs must not be treated as ERC20 allowances.", approval.isUnlimited ? "large_raw_candidate" : "unchecked", 40);
  }
  return data;
}

export function contractFindings(contract: ContractData, network: string): FindingInventory {
  const data = inventory(`${network}:${contract.address.toLowerCase()}`);
  registry(data, contract.address, network);
  source(data, contract.verificationStatus);
  add(data, "contract_metadata_only", "limitation", "Only contract metadata was acquired. Source logic, permissions, simulation and internal traces were not audited.", "metadata_only");
  return data;
}

export function validateFindingSelection(content: string, data: FindingInventory): void {
  try {
    if (content.length > 8192) throw new Error();
    const parsed: unknown = JSON.parse(content);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    const selection = parsed as Record<string, unknown>;
    if (Object.keys(selection).length !== 1 || !Array.isArray(selection.findingIds) || selection.findingIds.length > 32) throw new Error();
    const allowed = new Set(data.findings.map(f => f.id));
    const seen = new Set<string>();
    for (const id of selection.findingIds) {
      if (typeof id !== "string" || !allowed.has(id) || seen.has(id)) throw new Error();
      seen.add(id);
    }
  } catch {
    throw new Error("Unreliable AI finding selection");
  }
}

export function renderFindings(data: FindingInventory) {
  const riskScore = data.score;
  const verdict = riskScore <= 25 ? "safe" as const : riskScore <= 60 ? "caution" as const : "dangerous" as const;
  const riskLevel = riskScore <= 25 ? "low" as const : riskScore <= 50 ? "medium" as const : riskScore <= 75 ? "high" as const : "critical" as const;
  return {
    summary: `Assessment based on acquired destination metadata and bounded evidence. ${data.findings.find(f => f.code === "local_method")?.text ?? "Review the observations and analysis limits before making a decision."}`,
    verdict, riskScore, riskLevel,
    verdictReason: verdict === "dangerous" ? "Dangerous registry flag requires verification; no signing clearance." : verdict === "caution" ? "Evidence gaps require verification before deciding." : "No concrete warning signs detected in the acquired data; not a safety guarantee.",
    warnings: data.findings.filter(f => f.category === "risk" || f.category === "limitation").map(f => f.category === "limitation" ? `Analysis limit: ${f.text}` : f.text),
    positives: data.findings.filter(f => f.category === "supported_indicator").map(f => f.text),
    validatedReport: { version: "findings-v1" as const, scorePolicy: "max-floor-v1" as const, findings: data.findings, evidence: data.evidence },
  };
}
