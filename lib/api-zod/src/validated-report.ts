export type FindingCategory = 'observation' | 'limitation' | 'risk' | 'supported_indicator';
export interface ReportFinding { id: string; code: string; category: FindingCategory; text: string; evidenceRefs: string[] }
export type DecodedValue = string | boolean | null | DecodedValue[] | { [key: string]: DecodedValue };
export interface ReportInput {
  status: 'available' | 'partial' | 'unavailable'; source: 'abi'; historicalCertainty: boolean; reason: string | null;
  provenance: { network: string; address: string; abiAddress?: string; blockTag: string; scope: 'historical_bound' | 'current_only'; proxyResolved?: boolean };
  signature?: string; arguments?: Array<{ name: string; type: string; value: DecodedValue }>; subcalls?: ReportInput[];
}
export interface ReportTokenState { address: string; status: 'available' | 'unavailable'; blockTag: string; authority: 'contract_reported_interface'; decimals?: number; balanceRaw?: string; reason?: string }
export interface ReportPermissionState { token: string; owner?: string; caller?: string; spender?: string; blockTag: string; kind: 'erc20_allowance' | 'erc721_approval' | 'operator_approval'; rawValue: string; tokenIdRaw?: string; authority: 'contract_reported_interface' }
export interface ReportEvidence {
  id: string; kind: string; subject: string; value: string;
  transfers?: Array<{ kind: string; token: string; from: string; to: string; amountRaw?: string; tokenIdRaw?: string }>;
  incident?: { name: string; date: string; reviewedAt: string; network: 'mainnet'; hash: string; role: 'exploit_execution' | 'victim' | 'recovery' | 'association'; sources: Array<{ url: string; title: string; claim: string }> };
  input?: ReportInput; tokenStates?: ReportTokenState[]; permissionStates?: ReportPermissionState[];
}
export interface ReportCapabilities { sourceVerification: boolean; receiptEvents: boolean; incidentLookup: boolean; inputDecoding: boolean; reportedTokenState: boolean; reportedPermissionState: boolean; internalTraces: false; isolatedBalanceDeltas: false }
export type ValidatedReport = { version: 'findings-v1'; scorePolicy: 'max-floor-v1'; findings: ReportFinding[]; evidence: ReportEvidence[] }
  | { version: 'findings-v2'; scorePolicy: 'dual-floor-v2'; findings: ReportFinding[]; evidence: ReportEvidence[]; evidenceRiskScore: number | null; uncertaintyScore: number; decisionScore: number; coverage: 'complete_for_supported_checks' | 'partial' | 'unavailable'; capabilities: ReportCapabilities };

function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function keys(value: Record<string, unknown>, allowed: string[]): boolean { return Object.keys(value).every(key => allowed.includes(key)); }
function text(value: unknown, max: number, empty = false): value is string { return typeof value === 'string' && value.length <= max && (empty || !!value.trim()) && !/[\u0000-\u001f\u007f]/.test(value); }
function address(value: unknown): boolean { return typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value); }
function uint(value: unknown): boolean { return typeof value === 'string' && /^\d{1,78}$/.test(value) && BigInt(value) < 2n ** 256n; }
function score(value: unknown): value is number { return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100; }
function safeUrl(value: unknown): boolean {
  if (!text(value, 2048) || /\s|\\/.test(value) || !/^https?:\/\//.test(value)) return false;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password; } catch { return false; }
}
function date(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
function incident(value: unknown): boolean {
  return record(value) && keys(value, ['name', 'date', 'reviewedAt', 'network', 'hash', 'role', 'sources'])
    && text(value.name, 160) && date(value.date) && date(value.reviewedAt) && value.reviewedAt >= value.date
    && value.network === 'mainnet' && typeof value.hash === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value.hash)
    && ['exploit_execution', 'victim', 'recovery', 'association'].includes(value.role as string)
    && Array.isArray(value.sources) && value.sources.length >= 1 && value.sources.length <= 4
    && value.sources.every(s => record(s) && keys(s, ['url', 'title', 'claim']) && safeUrl(s.url) && text(s.title, 200) && text(s.claim, 600));
}
function input(value: unknown): boolean {
  const budget = { nodes: 0, children: 0 };
  function decoded(v: unknown, depth = 0): boolean {
    if (++budget.nodes > 256 || depth > 4) return false;
    if (v === null || typeof v === 'boolean') return true;
    if (typeof v === 'string') return v.length <= 1024;
    if (Array.isArray(v)) return v.length <= 32 && v.every(item => decoded(item, depth + 1));
    return record(v) && Object.keys(v).length <= 32 && Object.entries(v).every(([k, item]) => text(k, 128) && !['__proto__', 'constructor', 'prototype'].includes(k) && decoded(item, depth + 1));
  }
  function call(v: unknown, depth = 0): boolean {
    if (depth > 4 || !record(v) || !keys(v, ['status', 'source', 'provenance', 'historicalCertainty', 'reason', 'signature', 'arguments', 'subcalls'])) return false;
    const p = v.provenance;
    if (!['available', 'partial', 'unavailable'].includes(v.status as string) || v.source !== 'abi' || typeof v.historicalCertainty !== 'boolean'
      || !(v.reason === null || text(v.reason, 160)) || !record(p) || !keys(p, ['network', 'address', 'abiAddress', 'blockTag', 'scope', 'proxyResolved'])
      || !text(p.network, 128) || !address(p.address) || !text(p.blockTag, 128) || !['historical_bound', 'current_only'].includes(p.scope as string)
      || (p.abiAddress !== undefined && !address(p.abiAddress))
      || (p.proxyResolved !== undefined && typeof p.proxyResolved !== 'boolean')
      || (v.historicalCertainty && (p.scope !== 'historical_bound' || p.proxyResolved === false))) return false;
    if (v.signature !== undefined && !text(v.signature, 4096)) return false;
    if (v.status === 'unavailable' && (v.signature !== undefined || v.arguments !== undefined || v.subcalls !== undefined || v.historicalCertainty)) return false;
    if (v.status !== 'unavailable' && (v.signature === undefined || v.arguments === undefined)) return false;
    if (v.arguments !== undefined && (!Array.isArray(v.arguments) || v.arguments.length > 32 || !v.arguments.every(a => record(a) && keys(a, ['name', 'type', 'value']) && text(a.name, 128, true) && text(a.type, 128) && decoded(a.value)))) return false;
    if (v.subcalls !== undefined) {
      if (!Array.isArray(v.subcalls) || (budget.children += v.subcalls.length) > 16 || !v.subcalls.every(c => call(c, depth + 1))) return false;
    }
    return true;
  }
  return call(value);
}
function tokenState(v: unknown): boolean {
  return record(v) && keys(v, ['address', 'status', 'blockTag', 'authority', 'decimals', 'balanceRaw', 'reason'])
    && address(v.address) && ['available', 'unavailable'].includes(v.status as string) && text(v.blockTag, 128) && v.authority === 'contract_reported_interface'
    && (v.decimals === undefined || typeof v.decimals === 'number' && Number.isInteger(v.decimals) && v.decimals >= 0 && v.decimals <= 36)
    && (v.balanceRaw === undefined || uint(v.balanceRaw)) && (v.reason === undefined || text(v.reason, 160))
    && (v.status === 'available' ? v.decimals !== undefined && v.balanceRaw !== undefined : v.decimals === undefined && v.balanceRaw === undefined);
}
function permissionState(v: unknown): boolean {
  if (!record(v) || !keys(v, ['token', 'owner', 'caller', 'spender', 'blockTag', 'kind', 'rawValue', 'tokenIdRaw', 'authority'])
    || !address(v.token) || (v.owner !== undefined && !address(v.owner)) || (v.caller !== undefined && !address(v.caller))
    || (v.spender !== undefined && !address(v.spender)) || !text(v.blockTag, 128)
    || v.authority !== 'contract_reported_interface' || (v.tokenIdRaw !== undefined && !uint(v.tokenIdRaw))) return false;
  return v.kind === 'erc20_allowance' ? address(v.owner) && uint(v.rawValue) : v.kind === 'erc721_approval' ? address(v.rawValue)
    : v.kind === 'operator_approval' && address(v.owner) && ['0', '1'].includes(v.rawValue as string);
}
export function parseValidatedReport(details: unknown): ValidatedReport | null {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return null;
  const report = (details as Record<string, unknown>).validatedReport;
  if (!report || typeof report !== 'object' || Array.isArray(report)) return null;
  const value = report as Record<string, unknown>;
  const v2 = value.version === 'findings-v2';
  if ((!v2 && value.version !== 'findings-v1') || value.scorePolicy !== (v2 ? 'dual-floor-v2' : 'max-floor-v1') || !Array.isArray(value.findings) || value.findings.length === 0 || value.findings.length > 32) return null;
  if (v2) {
    if (!keys(value, ['version', 'scorePolicy', 'findings', 'evidence', 'evidenceRiskScore', 'uncertaintyScore', 'decisionScore', 'coverage', 'capabilities'])
      || !(value.evidenceRiskScore === null || score(value.evidenceRiskScore)) || !score(value.uncertaintyScore) || !score(value.decisionScore)
      || value.decisionScore !== Math.max(5, value.evidenceRiskScore ?? 0, value.uncertaintyScore)
      || !['complete_for_supported_checks', 'partial', 'unavailable'].includes(value.coverage as string)) return null;
    const c = value.capabilities;
    const fields = ['sourceVerification', 'receiptEvents', 'incidentLookup', 'inputDecoding', 'reportedTokenState', 'reportedPermissionState', 'internalTraces', 'isolatedBalanceDeltas'];
    if (!record(c) || !keys(c, fields) || !fields.every(k => typeof c[k] === 'boolean') || c.internalTraces !== false || c.isolatedBalanceDeltas !== false) return null;
    try { if (new TextEncoder().encode(JSON.stringify(value)).byteLength > 65536) return null; } catch { return null; }
  }
  const ids = new Set<string>();
  if (!Array.isArray(value.evidence) || value.evidence.length > 32) return null;
  const evidenceIds = new Set<string>();
  for (const item of value.evidence) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const e = item as Record<string, unknown>;
    if (v2 && !keys(e, ['id', 'kind', 'subject', 'value', 'transfers', 'incident', 'input', 'tokenStates', 'permissionStates'])) return null;
    if (typeof e.kind !== 'string' || !/^[a-z_]{1,64}$/.test(e.kind) || e.id !== `e:${e.kind}` || evidenceIds.has(e.id as string)
      || typeof e.subject !== 'string' || e.subject.length > 160 || !e.subject
      || typeof e.value !== 'string' || e.value.length > 2000) return null;
    if ((e.incident !== undefined && !incident(e.incident)) || (e.input !== undefined && !input(e.input))
      || (e.tokenStates !== undefined && (!Array.isArray(e.tokenStates) || e.tokenStates.length > 8 || !e.tokenStates.every(tokenState)))
      || (e.permissionStates !== undefined && (!Array.isArray(e.permissionStates) || e.permissionStates.length > 4 || !e.permissionStates.every(permissionState)))) return null;
    if (e.transfers !== undefined) {
      if (!Array.isArray(e.transfers) || e.transfers.length > 50) return null;
      for (const transfer of e.transfers) {
        if (!transfer || typeof transfer !== 'object' || Array.isArray(transfer)) return null;
        const t = transfer as Record<string, unknown>;
        if (v2 && !keys(t, ['kind', 'token', 'from', 'to', 'amountRaw', 'tokenIdRaw'])) return null;
        if (typeof t.kind !== 'string' || !['erc20-shaped', 'erc721-shaped'].includes(t.kind)
          || !['token', 'from', 'to'].every(key => typeof t[key] === 'string' && /^0x[0-9a-fA-F]{40}$/.test(t[key] as string))
          || !['amountRaw', 'tokenIdRaw'].every(key => t[key] === undefined || typeof t[key] === 'string' && /^\d{1,78}$/.test(t[key] as string))) return null;
      }
    }
    evidenceIds.add(e.id as string);
  }
  for (const item of value.findings) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const f = item as Record<string, unknown>;
    if (v2 && !keys(f, ['id', 'code', 'category', 'text', 'evidenceRefs'])) return null;
    if (typeof f.code !== 'string' || !/^[a-z_]{1,64}$/.test(f.code) || f.id !== `f:${f.code}` || ids.has(f.id as string)
      || !['observation', 'limitation', 'risk', 'supported_indicator'].includes(f.category as string)
      || typeof f.text !== 'string' || !f.text.trim() || f.text.length > 500
      || !Array.isArray(f.evidenceRefs) || f.evidenceRefs.length !== 1 || f.evidenceRefs[0] !== `e:${f.code}` || !evidenceIds.has(f.evidenceRefs[0])) return null;
    ids.add(f.id as string);
  }
  return value as unknown as ValidatedReport;
}
