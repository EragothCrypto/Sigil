import type { TransactionData, ContractData } from "./ethereum.js";
import { lookupEntity } from "./known-entities.js";
import { lookupIncident, type IncidentEntry } from "./incident-catalog.js";
import type { AnalysisEvidence } from "./analysis-adapters.js";
import { decodeInputEvidence, type InputEvidence } from "./abi-evidence.js";
import { parseAbiItem, toFunctionSelector, type AbiParameter } from "viem";

export type FindingCategory = "observation" | "limitation" | "risk" | "supported_indicator";
export interface ValidatedFinding {
  id: string;
  code: string;
  category: FindingCategory;
  text: string;
  evidenceRefs: string[];
}
export interface LegacyValidatedReport {
  version: "findings-v1";
  scorePolicy: "max-floor-v1";
  findings: ValidatedFinding[];
  evidence: FindingInventory["evidence"];
}
export type Coverage = "complete_for_supported_checks" | "partial" | "unavailable";
export interface FindingCapabilities {
  sourceVerification: boolean;
  receiptEvents: boolean;
  incidentLookup: boolean;
  inputDecoding: boolean;
  reportedTokenState: boolean;
  reportedPermissionState: boolean;
  internalTraces: false;
  isolatedBalanceDeltas: false;
}
export interface ValidatedReportV2 {
  version: "findings-v2";
  scorePolicy: "dual-floor-v2";
  findings: ValidatedFinding[];
  evidence: FindingInventory["evidence"];
  evidenceRiskScore: number | null;
  uncertaintyScore: number;
  decisionScore: number;
  coverage: Coverage;
  capabilities: FindingCapabilities;
}
export type ValidatedReport = LegacyValidatedReport | ValidatedReportV2;
export interface FindingInventory {
  findings: ValidatedFinding[];
  evidence: Array<{ id: string; kind: string; subject: string; value: string; transfers?: NonNullable<TransactionData["receiptEvidence"]>["transfers"]; incident?: IncidentEntry; input?: InputEvidence; tokenStates?: AnalysisEvidence["tokenStates"]; permissionStates?: AnalysisEvidence["permissionStates"] }>;
  score: number;
  evidenceRiskScore: number | null;
  uncertaintyScore: number;
  decisionScore: number;
  coverage: Coverage;
  capabilities: FindingCapabilities;
  subject: string;
}

function inventory(subject: string): FindingInventory {
  return { findings: [], evidence: [], score: 5, decisionScore: 5, evidenceRiskScore: null, uncertaintyScore: 0, subject, coverage: "unavailable",
    capabilities: { sourceVerification: false, receiptEvents: false, incidentLookup: false, inputDecoding: false, reportedTokenState: false, reportedPermissionState: false, internalTraces: false, isolatedBalanceDeltas: false } };
}

function report(data: FindingInventory): ValidatedReportV2 {
  return { version: "findings-v2", scorePolicy: "dual-floor-v2", findings: data.findings, evidence: data.evidence,
    evidenceRiskScore: data.evidenceRiskScore, uncertaintyScore: data.uncertaintyScore, decisionScore: data.decisionScore,
    coverage: data.coverage, capabilities: data.capabilities };
}

function checkedInventory(data: FindingInventory): FindingInventory {
  try {
    if (data.findings.length > 32 || data.evidence.length > 32
      || data.findings.some(f => f.text.length > 500) || data.evidence.some(e => e.value.length > 2000)
      || Buffer.byteLength(JSON.stringify(data), "utf8") > 65536 || Buffer.byteLength(JSON.stringify(report(data)), "utf8") > 65536) throw new Error();
    return data;
  } catch { throw new Error("Validated finding report exceeds serialization bounds; assessment unavailable"); }
}

function add(data: FindingInventory, code: string, category: FindingCategory, text: string, value: string, floor = 5): void {
  const evidenceId = `e:${code}`;
  data.evidence.push({ id: evidenceId, kind: code, subject: data.subject, value: value.slice(0, 2000) });
  data.findings.push({ id: `f:${code}`, code, category, text: text.slice(0, 500), evidenceRefs: [evidenceId] });
  if (category === "risk") data.evidenceRiskScore = Math.max(data.evidenceRiskScore ?? 0, floor);
  if (category === "limitation" && floor > 5) data.uncertaintyScore = Math.max(data.uncertaintyScore, floor);
  data.decisionScore = Math.max(5, data.evidenceRiskScore ?? 0, data.uncertaintyScore);
  data.score = data.decisionScore;
}

function source(data: FindingInventory, state: string | undefined): void {
  data.capabilities.sourceVerification = state === "verified" || state === "unverified";
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

const FINDING_ADDRESS = /^0x[\da-f]{40}$/i;
function sameAddress(a: unknown, b: string): boolean {
  return typeof a === "string" && FINDING_ADDRESS.test(a) && a.toLowerCase() === b.toLowerCase();
}
function uint(value: unknown): value is string {
  return typeof value === "string" && /^(0|[1-9]\d{0,77})$/.test(value) && BigInt(value) < 2n ** 256n;
}
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function keys(value: Record<string, unknown>, allowed: string): boolean {
  const set = new Set(allowed.split(","));
  return Object.keys(value).every(key => set.has(key));
}

function sameAbiValue(parameter: AbiParameter, supplied: unknown, canonical: unknown): boolean {
  const array = /^(.*)\[(\d*)\]$/.exec(parameter.type);
  if (array) {
    return Array.isArray(supplied) && Array.isArray(canonical) && supplied.length === canonical.length
      && (array[2] === "" || supplied.length === Number(array[2]))
      && supplied.every((value, i) => sameAbiValue({ ...parameter, type: array[1] } as AbiParameter, value, canonical[i]));
  }
  if (parameter.type === "tuple" && "components" in parameter) {
    // Named tuple fields retain ABI declaration order; canonical signatures retain only positions.
    const fields = Array.isArray(supplied) ? supplied : object(supplied) ? Object.values(supplied) : undefined;
    return Boolean(fields && Array.isArray(canonical) && fields.length === parameter.components.length && canonical.length === fields.length
      && parameter.components.every((component, i) => sameAbiValue(component, fields[i], canonical[i])));
  }
  return JSON.stringify(supplied) === JSON.stringify(canonical);
}

// This checks a trusted adapter envelope, not the truthfulness of the contract's replies.
function checkedAdapter(tx: TransactionData, network: string): AnalysisEvidence | undefined {
  try {
    const raw: unknown = tx.analysisEvidence;
    if (!object(raw) || Buffer.byteLength(JSON.stringify(raw), "utf8") > 65536) return;
    const block = /^0x[\da-f]+$/i.test(tx.blockNumber) ? tx.blockNumber : "latest";
    if (!keys(raw, "version,network,subject,blockTag,input,tokenStates,permissionStates,coverage,limits,attempts,capabilities")
      || raw.version !== "adapters-v1" || raw.network !== network || !sameAddress(raw.subject, tx.to) || raw.blockTag !== block
      || !["partial", "unavailable"].includes(String(raw.coverage)) || !Number.isInteger(raw.attempts) || Number(raw.attempts) < 0 || Number(raw.attempts) > 32
      || !Array.isArray(raw.limits) || raw.limits.length > 32 || !raw.limits.every(v => typeof v === "string" && /^[a-z0-9_]{1,128}$/.test(v))
      || !Array.isArray(raw.tokenStates) || raw.tokenStates.length > 8 || !Array.isArray(raw.permissionStates) || raw.permissionStates.length > 4
      || !object(raw.capabilities) || !keys(raw.capabilities, "inputDecoding,reportedTokenState,reportedPermissionState,internalTraces,isolatedBalanceDeltas")
      || raw.capabilities.internalTraces !== false || raw.capabilities.isolatedBalanceDeltas !== false
      || typeof raw.capabilities.inputDecoding !== "boolean") return;
    let nodes = 0;
    const normalized = (value: unknown, depth = 0): boolean => {
      if (++nodes > 512 || depth > 5) return false;
      if (value === null || typeof value === "boolean") return true;
      if (typeof value === "string") return value.length <= 1024;
      if (Array.isArray(value)) return value.length <= 32 && value.every(v => normalized(v, depth + 1));
      return object(value) && Object.keys(value).length <= 32 && Object.entries(value).every(([k, v]) => k.length <= 128 && normalized(v, depth + 1));
    };
    let children = 0;
    const inputValid = (value: unknown, calldata: string, depth = 0): boolean => {
      if (!object(value) || depth > 4 || ++children > 17 || !keys(value, "status,source,provenance,historicalCertainty,reason,signature,arguments,subcalls")
        || value.source !== "abi" || !["available", "partial", "unavailable"].includes(String(value.status)) || typeof value.historicalCertainty !== "boolean"
        || !(value.reason === null || typeof value.reason === "string" && /^[a-z0-9_]{1,128}$/.test(value.reason)) || !object(value.provenance)) return false;
      const p = value.provenance;
      if (!keys(p, "network,address,blockTag,scope,proxyResolved,abiAddress") || p.network !== network || !sameAddress(p.address, tx.to) || p.blockTag !== block
        || p.scope !== "current_only" || !(p.proxyResolved === undefined || p.proxyResolved === false) || value.historicalCertainty
        || p.abiAddress !== undefined && !(typeof p.abiAddress === "string" && FINDING_ADDRESS.test(p.abiAddress))) return false;
      if (value.status === "available") return false;
      if (value.status === "unavailable") return value.signature === undefined && value.arguments === undefined && value.subcalls === undefined && !value.historicalCertainty;
      if (typeof value.signature !== "string" || value.signature.length > 500 || !/^[A-Za-z_$][A-Za-z0-9_$]*\([A-Za-z0-9_,()[\]]*\)$/.test(value.signature)
        || !Array.isArray(value.arguments) || value.arguments.length > 32 || !value.arguments.every(a => object(a) && keys(a, "name,type,value")
          && typeof a.name === "string" && a.name.length <= 128 && typeof a.type === "string" && a.type.length <= 128 && normalized(a.value))) return false;
      if (toFunctionSelector(value.signature).toLowerCase() !== calldata.slice(0, 10).toLowerCase()) return false;
      const canonicalAbi = parseAbiItem(`function ${value.signature}`);
      if (canonicalAbi.type !== "function") return false;
      const rebound = decodeInputEvidence([canonicalAbi], calldata, {
        network, address: tx.to, blockTag: block, scope: "current_only", proxyResolved: false,
      });
      const suppliedArguments = value.arguments as Record<string, unknown>[];
      if (!rebound.arguments || rebound.signature !== value.signature || rebound.arguments.length !== suppliedArguments.length
        || !rebound.arguments.every((arg, i) => arg.type === suppliedArguments[i].type && sameAbiValue(canonicalAbi.inputs[i], suppliedArguments[i].value, arg.value))) return false;
      if (value.subcalls === undefined) return rebound.subcalls === undefined;
      const childIndex = value.signature === "multicall(bytes[])" ? 0 : value.signature === "multicall(uint256,bytes[])" ? 1 : -1;
      const calls = childIndex >= 0 ? rebound.arguments[childIndex]?.value : undefined;
      return Array.isArray(calls) && Array.isArray(value.subcalls) && value.subcalls.length <= 16 && value.subcalls.length <= calls.length
        && value.subcalls.every((s, i) => typeof calls[i] === "string" && inputValid(s, calls[i] as string, depth + 1));
    };
    if (!inputValid(raw.input, tx.input)) return;
    const emitters = new Set((tx.receiptEvidence?.status === "available" ? tx.receiptEvidence.transfers : []).map(t => t.token.toLowerCase()));
    const seen = new Set<string>();
    for (const state of raw.tokenStates) {
      if (!object(state) || !keys(state, "address,status,blockTag,authority,decimals,balanceRaw,reason") || typeof state.address !== "string" || !FINDING_ADDRESS.test(state.address)
        || !emitters.has(state.address.toLowerCase()) || seen.has(state.address.toLowerCase()) || state.blockTag !== block || state.authority !== "contract_reported_interface"
        || !["available", "unavailable"].includes(String(state.status))) return;
      seen.add(state.address.toLowerCase());
      if (state.reason !== undefined && !(typeof state.reason === "string" && /^[a-z0-9_]{1,128}$/.test(state.reason))) return;
      if (state.status === "available" && (!Number.isInteger(state.decimals) || Number(state.decimals) < 0 || Number(state.decimals) > 36 || !uint(state.balanceRaw)
        || tx.receiptEvidence?.transfers.some(t => sameAddress(t.token, state.address as string) && t.kind === "erc721-shaped"))) return;
      if (state.status === "unavailable" && (state.decimals !== undefined || state.balanceRaw !== undefined)) return;
    }
    const permissions = new Set<string>();
    for (const state of raw.permissionStates) {
      if (!object(state) || !keys(state, "token,owner,caller,spender,blockTag,kind,rawValue,tokenIdRaw,authority") || !sameAddress(state.token, tx.to)
        || state.blockTag !== block || state.authority !== "contract_reported_interface" || !/^0x(?:095ea7b3|a22cb465)0{24}[\da-f]{104}$/i.test(tx.input)
        || !sameAddress(state.spender, `0x${tx.input.slice(34, 74)}`)) return;
      if (state.kind === "erc20_allowance") { if (!sameAddress(state.owner, tx.from) || state.caller !== undefined || !tx.input.toLowerCase().startsWith("0x095ea7b3") || !uint(state.rawValue) || state.tokenIdRaw !== undefined) return; }
      else if (state.kind === "erc721_approval") { if (!tx.input.toLowerCase().startsWith("0x095ea7b3") || typeof state.rawValue !== "string" || !FINDING_ADDRESS.test(state.rawValue)
        || state.owner !== undefined || !sameAddress(state.caller, tx.from) || !uint(state.tokenIdRaw) || BigInt(state.tokenIdRaw) !== BigInt(`0x${tx.input.slice(74)}`)) return; }
      else if (state.kind === "operator_approval") { if (!sameAddress(state.owner, tx.from) || state.caller !== undefined || !/^0xa22cb465[\da-f]{64}0{63}[01]$/i.test(tx.input) || !["0", "1"].includes(String(state.rawValue)) || state.tokenIdRaw !== undefined) return; }
      else return;
      const identity = `${state.kind}:${state.token}:${state.owner}:${state.spender}:${state.tokenIdRaw ?? ""}`.toLowerCase();
      if (permissions.has(identity)) return;
      permissions.add(identity);
    }
    if (raw.capabilities.reportedTokenState !== raw.tokenStates.some(s => s.status === "available") || raw.capabilities.reportedPermissionState !== (raw.permissionStates.length > 0)) return;
    const decoded = object(raw.input) && raw.input.status !== "unavailable" && typeof raw.input.signature === "string";
    if (raw.capabilities.inputDecoding && !decoded || raw.coverage === "unavailable" && (decoded || raw.tokenStates.some(s => s.status === "available") || raw.permissionStates.length)) return;
    return JSON.parse(JSON.stringify(raw)) as AnalysisEvidence;
  } catch { return; }
}

function adapterFindings(data: FindingInventory, tx: TransactionData, network: string): boolean {
  if (tx.analysisEvidence === undefined) return false;
  const evidence = checkedAdapter(tx, network);
  if (!evidence) {
    add(data, "adapter_evidence_invalid", "limitation", "Adapter evidence failed identity, bounds or consistency checks; no decoded intent or reported state was accepted.", "unavailable");
    return false;
  }
  const decoded = evidence.input.status !== "unavailable" && Boolean(evidence.input.signature);
  data.capabilities.inputDecoding = decoded;
  data.capabilities.reportedTokenState = evidence.tokenStates.some(s => s.status === "available");
  data.capabilities.reportedPermissionState = evidence.permissionStates.length > 0;
  if (decoded) {
    add(data, "decoded_intent", "observation", "Bounded ABI decoding describes attempted call intent, not confirmed execution effects or signing safety.", evidence.input.signature!);
    data.evidence[data.evidence.length - 1]!.input = evidence.input;
    if (!evidence.input.historicalCertainty) add(data, "abi_historical_uncertain", "limitation", "Current ABI or unresolved proxy decoding does not establish historical implementation semantics.", evidence.input.reason ?? "historical_uncertain", 35);
    else if (evidence.input.status === "partial") add(data, "abi_partial", "limitation", "ABI decoding is partial; unresolved arguments or subcalls cannot establish complete call intent.", evidence.input.reason ?? "partial", 35);
  } else if (tx.input.length >= 10) add(data, "abi_unavailable", "limitation", "Bounded ABI decoding is unavailable; call intent was not established from ABI evidence.", evidence.input.reason ?? "unavailable", 35);
  if (evidence.tokenStates.length) {
    const available = evidence.tokenStates.filter(state => state.status === "available").length;
    const status = available === 0
      ? "No usable token-state responses were established. Recorded checks are unavailable; see each token's reason."
      : "Token queries report interface-candidate responses at the recorded block."
        + (available < evidence.tokenStates.length ? " Some token-state checks are unavailable; see each token's reason." : "");
    const proxyLimit = evidence.tokenStates.some(state => state.reason === "current_proxy_abi_only")
      ? " Current proxy ABI describes response shape only; historical implementation semantics are not established." : "";
    add(data, "reported_token_state", "observation", status + proxyLimit + " Contract-reported decimals and balances do not authenticate movement, economic value or token safety.", "contract_reported_interface");
    data.evidence[data.evidence.length - 1]!.tokenStates = evidence.tokenStates;
  }
  if (evidence.permissionStates.length) {
    add(data, "reported_permission_state", "observation", "Permission queries report contract responses at the recorded block, not guaranteed spending rights, historical grants or isolated transaction effects. Contracts may lie.", "contract_reported_interface");
    data.evidence[data.evidence.length - 1]!.permissionStates = evidence.permissionStates;
  }
  add(data, "adapter_coverage", "limitation", "Adapter coverage is bounded and incomplete. Internal traces, isolated balance deltas and effective permissions are not established.", evidence.limits.join(","));
  return decoded;
}

export function transactionFindings(tx: TransactionData, network: string, methodName: string | null, approval: { isUnlimited?: boolean } | null): FindingInventory {
  const data = inventory(`${network}:${tx.to.toLowerCase()}`);
  data.capabilities.incidentLookup = true;
  const incident = lookupIncident(tx.hash, network);
  if (incident) {
    add(data, "historical_incident", incident.role === "exploit_execution" ? "risk" : "observation", `Exact source-backed historical transaction attribution: ${incident.name} (${incident.role}, ${incident.date}). This is not evidence of current exploitability or this user's loss.`, incident.role, incident.role === "exploit_execution" ? 80 : 5);
    data.evidence[data.evidence.length - 1]!.subject = `${network}:${tx.hash.toLowerCase()}`;
    data.evidence[data.evidence.length - 1]!.incident = incident;
  }
  registry(data, tx.to, network);
  if (tx.destinationHasCode !== false) source(data, tx.destinationVerification);
  else add(data, "destination_no_code", "observation", "No destination bytecode was observed at the transaction block.", "absent");
  const outcome = tx.status === "0x1" ? "successful" : tx.status === "0x0" ? "reverted" : "unknown";
  add(data, "execution_status", "observation", `Observed execution outcome: ${outcome}. Execution success is not a safety indicator.`, outcome);
  if (outcome !== "successful" || tx.inclusionStatus !== "mined") add(data, "execution_incomplete", "limitation", "Execution effects cannot be fully assessed from the available inclusion/outcome data.", tx.inclusionStatus ?? "unknown", 35);
  const decoded = adapterFindings(data, tx, network);
  if (methodName) add(data, "local_method", "observation", `Local selector registry identifies ${methodName.slice(0, 100)}; this does not prove execution semantics.`, methodName.slice(0, 100));
  else if (!decoded && tx.input.length >= 10) add(data, "method_unknown", "limitation", "The method selector has no accepted ABI decoding or local registry hint; call intent is unclear.", tx.input.slice(0, 10), 35);
  const receipt = tx.receiptEvidence;
  if (receipt?.status === "available") {
    data.capabilities.receiptEvents = true;
    add(data, "transfer_observations", "observation", `${receipt.transfers.length} Transfer-shaped events were recorded. Other event types are not decoded; this is not a balance or net-loss assessment.`, String(receipt.transfers.length));
    data.evidence[data.evidence.length - 1]!.transfers = receipt.transfers.slice(0, 50).map(t => ({ kind: t.kind, token: t.token, from: t.from, to: t.to, ...(t.amountRaw !== undefined ? { amountRaw: t.amountRaw } : {}), ...(t.tokenIdRaw !== undefined ? { tokenIdRaw: t.tokenIdRaw } : {}) }));
    if (receipt.transfers.length) {
      add(data, "raw_units_unknown", "limitation", data.capabilities.reportedTokenState
        ? "Bounded contract-reported unit responses are available for some emitters; other amounts remain raw. Reported decimals do not authenticate event movement or economic value."
        : "Token units and emitter-to-symbol mappings were not established; raw amounts do not establish economic size.", data.capabilities.reportedTokenState ? "contract_reported_units_only" : "units_unknown");
      if (receipt.transfers.some(t => /^0x0{40}$/i.test(t.from) || /^0x0{40}$/i.test(t.to))) add(data, "mint_burn_shaped", "observation", "Zero-address mint/burn-shaped events were observed; these alone do not establish inflation, manipulation or actual supply changes.", "observed");
    }
    if (!receipt.complete) add(data, "receipt_partial", "limitation", "Receipt event decoding is partial; omitted movements cannot be ruled out.", "partial", 35);
  } else add(data, "receipt_unavailable", "limitation", "Usable successful receipt evidence is unavailable; asset movement is not established.", receipt?.status ?? "unavailable", 35);
  add(data, "traces_missing", "limitation", "Internal call traces and wallet balance deltas were not collected; event order does not establish fund routing or recipient control.", "not_collected");
  if (approval) {
    add(data, "approval_intent", "observation", "Approval-shaped calldata expresses attempted intent, not confirmed token permissions.", "attempted");
    add(data, "allowance_unknown", "limitation", "A transaction-specific allowance or permission grant and effective spending rights are not proven. Contract-reported state is not an isolated transaction delta; NFT token IDs are not ERC20 allowances.", approval.isUnlimited ? "large_raw_candidate" : data.capabilities.reportedPermissionState ? "reported_state_not_grant" : "unchecked", 40);
  }
  data.coverage = data.capabilities.sourceVerification || tx.destinationHasCode === false || data.capabilities.receiptEvents || decoded
    || data.capabilities.reportedTokenState || data.capabilities.reportedPermissionState ? "partial" : "unavailable";
  return checkedInventory(data);
}

export function contractFindings(contract: ContractData, network: string): FindingInventory {
  const data = inventory(`${network}:${contract.address.toLowerCase()}`);
  registry(data, contract.address, network);
  source(data, contract.verificationStatus);
  data.coverage = data.capabilities.sourceVerification ? "partial" : "unavailable";
  add(data, "contract_metadata_only", "limitation", "Only contract metadata was acquired. Source logic, permissions, simulation and internal traces were not audited.", "metadata_only");
  return checkedInventory(data);
}

export function validateFindingSelection(content: string, data: FindingInventory): void {
  checkedInventory(data);
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
  checkedInventory(data);
  const riskScore = data.score;
  const verdict = riskScore <= 25 ? "safe" as const : riskScore <= 60 ? "caution" as const : "dangerous" as const;
  const riskLevel = riskScore <= 25 ? "low" as const : riskScore <= 50 ? "medium" as const : riskScore <= 75 ? "high" as const : "critical" as const;
  return {
    summary: `Assessment based on acquired destination metadata and bounded evidence. ${data.findings.find(f => f.code === "local_method")?.text ?? "Review the observations and analysis limits before making a decision."}`,
    verdict, riskScore, riskLevel,
    verdictReason: verdict === "dangerous" ? "Attributed evidence-backed warning requires review; historical attribution does not establish current exploitability. No signing clearance." : verdict === "caution" ? "Evidence gaps require verification before deciding." : "No concrete warning signs detected in the acquired data; not a safety guarantee.",
    warnings: data.findings.filter(f => f.category === "risk" || f.category === "limitation").map(f => f.category === "limitation" ? `Analysis limit: ${f.text}` : f.text),
    positives: data.findings.filter(f => f.category === "supported_indicator").map(f => f.text),
    validatedReport: report(data),
  };
}
