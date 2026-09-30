export type FindingCategory = 'observation' | 'limitation' | 'risk' | 'supported_indicator';
export interface ReportFinding { id: string; code: string; category: FindingCategory; text: string; evidenceRefs: string[] }
export interface ReportEvidence { id: string; kind: string; subject: string; value: string; transfers?: Array<{ kind: string; token: string; from: string; to: string; amountRaw?: string; tokenIdRaw?: string }> }
export interface ValidatedReport { version: 'findings-v1'; scorePolicy: 'max-floor-v1'; findings: ReportFinding[]; evidence: ReportEvidence[] }
export function parseValidatedReport(details: unknown): ValidatedReport | null {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return null;
  const report = (details as Record<string, unknown>).validatedReport;
  if (!report || typeof report !== 'object' || Array.isArray(report)) return null;
  const value = report as Record<string, unknown>;
  if (value.version !== 'findings-v1' || value.scorePolicy !== 'max-floor-v1' || !Array.isArray(value.findings) || value.findings.length === 0 || value.findings.length > 32) return null;
  const ids = new Set<string>();
  if (!Array.isArray(value.evidence) || value.evidence.length > 32) return null;
  const evidenceIds = new Set<string>();
  for (const item of value.evidence) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const e = item as Record<string, unknown>;
    if (typeof e.kind !== 'string' || !/^[a-z_]{1,64}$/.test(e.kind) || e.id !== `e:${e.kind}` || evidenceIds.has(e.id as string)
      || typeof e.subject !== 'string' || e.subject.length > 160 || !e.subject
      || typeof e.value !== 'string' || e.value.length > 2000) return null;
    if (e.transfers !== undefined) {
      if (!Array.isArray(e.transfers) || e.transfers.length > 50) return null;
      for (const transfer of e.transfers) {
        if (!transfer || typeof transfer !== 'object' || Array.isArray(transfer)) return null;
        const t = transfer as Record<string, unknown>;
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
    if (typeof f.code !== 'string' || !/^[a-z_]{1,64}$/.test(f.code) || f.id !== `f:${f.code}` || ids.has(f.id as string)
      || !['observation', 'limitation', 'risk', 'supported_indicator'].includes(f.category as string)
      || typeof f.text !== 'string' || !f.text.trim() || f.text.length > 500
      || !Array.isArray(f.evidenceRefs) || f.evidenceRefs.length !== 1 || f.evidenceRefs[0] !== `e:${f.code}` || !evidenceIds.has(f.evidenceRefs[0])) return null;
    ids.add(f.id as string);
  }
  return value as unknown as ValidatedReport;
}
