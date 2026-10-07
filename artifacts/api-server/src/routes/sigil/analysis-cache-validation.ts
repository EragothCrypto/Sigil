import { parseValidatedReport, type ReportInput } from '@workspace/api-zod/validated-report';
import { lookupIncident } from './incident-catalog.js';

// Keep this exhaustive with validated-findings.ts; unknown cached rules fail closed.
const CACHE_FINDING_POLICY: Readonly<Record<string, readonly [string, number]>> = {
  source_verified: ['supported_indicator', 0],
  source_unverified: ['limitation', 40],
  source_unknown: ['limitation', 35],
  registry_identity: ['observation', 0],
  registry_danger: ['risk', 90],
  destination_no_code: ['observation', 0],
  execution_status: ['observation', 0],
  execution_incomplete: ['limitation', 35],
  local_method: ['observation', 0],
  method_unknown: ['limitation', 35],
  transfer_observations: ['observation', 0],
  raw_units_unknown: ['limitation', 0],
  mint_burn_shaped: ['observation', 0],
  receipt_partial: ['limitation', 35],
  receipt_unavailable: ['limitation', 35],
  traces_missing: ['limitation', 0],
  approval_intent: ['observation', 0],
  allowance_unknown: ['limitation', 40],
  contract_metadata_only: ['limitation', 0],
  adapter_evidence_invalid: ['limitation', 0],
  decoded_intent: ['observation', 0],
  abi_historical_uncertain: ['limitation', 35],
  abi_partial: ['limitation', 35],
  abi_unavailable: ['limitation', 35],
  reported_token_state: ['observation', 0],
  reported_permission_state: ['observation', 0],
  adapter_coverage: ['limitation', 0],
};

function cacheInputBound(input: ReportInput, destination: string, network: string, blockTag: string | undefined): boolean {
  return input.provenance.network === network && input.provenance.address.toLowerCase() === destination.toLowerCase()
    && (blockTag === undefined || input.provenance.blockTag === blockTag)
    && (input.subcalls?.every(call => cacheInputBound(call, destination, network, blockTag)) ?? true);
}

export function validatedCacheEntry(value: unknown, input: string, network: string): boolean {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    if (typeof record.input !== 'string' || record.input.toLowerCase() !== input.toLowerCase() || record.network !== network) return false;
    const report = parseValidatedReport(record.details);
    if (report?.version !== 'findings-v2') return false;
    let evidenceRiskScore: number | null = null;
    let uncertaintyScore = 0;
    for (const finding of report.findings) {
      let category: string;
      let floor: number;
      if (finding.code === 'historical_incident') {
        const incident = report.evidence.find(e => e.id === finding.evidenceRefs[0])?.incident;
        if (!incident) return false;
        category = incident.role === 'exploit_execution' ? 'risk' : 'observation';
        floor = incident.role === 'exploit_execution' ? 80 : 0;
      } else {
        if (!Object.hasOwn(CACHE_FINDING_POLICY, finding.code)) return false;
        [category, floor] = CACHE_FINDING_POLICY[finding.code];
      }
      if (finding.category !== category) return false;
      if (category === 'risk') evidenceRiskScore = Math.max(evidenceRiskScore ?? 0, floor);
      else if (category === 'limitation') uncertaintyScore = Math.max(uncertaintyScore, floor);
    }
    if (report.evidenceRiskScore !== evidenceRiskScore || report.uncertaintyScore !== uncertaintyScore
      || report.decisionScore !== Math.max(5, evidenceRiskScore ?? 0, uncertaintyScore)) return false;
    const score = report.decisionScore;
    if (record.riskScore !== score || record.verdict !== (score <= 25 ? 'safe' : score <= 60 ? 'caution' : 'dangerous')
      || record.riskLevel !== (score <= 25 ? 'low' : score <= 50 ? 'medium' : score <= 75 ? 'high' : 'critical')) return false;
    const details = record.details as Record<string, unknown>;
    const destination = record.inputType === 'contract' ? input : details.to;
    if (typeof destination !== 'string' || !/^0x[\da-f]{40}$/i.test(destination)) return false;
    let blockTag: string | undefined;
    if (record.inputType === 'transaction') {
      const raw = details.rawData;
      if (!/^0x[\da-f]{64}$/i.test(input) || !raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
      const rawData = raw as Record<string, unknown>;
      if (typeof rawData.hash !== 'string' || rawData.hash.toLowerCase() !== input.toLowerCase()) return false;
      blockTag = typeof rawData.blockNumber === 'string' && /^0x[\da-f]+$/i.test(rawData.blockNumber) ? rawData.blockNumber : 'latest';
    } else if (record.inputType !== 'contract') return false;
    const subject = `${network}:${destination.toLowerCase()}`;
    for (const evidence of report.evidence) {
      if (evidence.incident) {
        const incident = lookupIncident(input, network);
        if (evidence.subject !== `${network}:${input.toLowerCase()}` || !incident || JSON.stringify(evidence.incident) !== JSON.stringify(incident)) return false;
      } else if (evidence.subject !== subject) return false;
      if (evidence.input && !cacheInputBound(evidence.input, destination, network, blockTag)) return false;
      if (blockTag !== undefined && evidence.tokenStates?.some(s => s.blockTag !== blockTag)) return false;
      if (evidence.permissionStates?.some(s => s.token.toLowerCase() !== destination.toLowerCase() || blockTag !== undefined && s.blockTag !== blockTag)) return false;
    }
    const warnings = report.findings.filter(f => f.category === 'risk' || f.category === 'limitation').map(f => f.category === 'limitation' ? `Analysis limit: ${f.text}` : f.text);
    const positives = report.findings.filter(f => f.category === 'supported_indicator').map(f => f.text);
    if (JSON.stringify(record.warnings) !== JSON.stringify(warnings) || JSON.stringify(record.positives) !== JSON.stringify(positives)) return false;
    return typeof record.summary === 'string' && record.summary.length <= 1000 && typeof record.verdictReason === 'string' && record.verdictReason.length <= 500;
  } catch { return false; }
}
