import { ShieldCheck, ShieldAlert, CheckCircle2, Copy, CheckCircle, AlertTriangle, XCircle, ExternalLink, BadgeCheck } from 'lucide-react';
import type { AnalysisResult, KnownEntity } from '@workspace/api-client-react';
import { RiskRing } from './RiskRing';
import { ApprovalInspector } from './ApprovalInspector';
import { TransactionBreakdown } from './TransactionBreakdown';
import { ContractReputationCard } from './ContractReputationCard';
import { PatternDetectionCard } from './PatternDetectionCard';
import { ShareButton } from './ShareButton';
import { ContractDiffView } from './ContractDiffView';
import { RiskScoreBreakdown } from './RiskScoreBreakdown';
import { JargonText } from './JargonTooltip';
import { useToast } from '@/hooks/use-toast';
import { parseValidatedReport, type ReportEvidence, type ReportInput } from '@/lib/validated-report';

function DecodedIntent({ input }: { input: ReportInput }) {
  return <div className="mt-3 space-y-1 break-all">
    <h4 className="font-semibold text-white/70">Decoded intent (not executed effects)</h4>
    <p>{input.signature ?? 'No decoded signature'} - {input.status}</p>
    <p>ABI provenance: {input.provenance.scope}; network {input.provenance.network}; address {input.provenance.address}; block {input.provenance.blockTag}.</p>
    {input.provenance.abiAddress && <p>ABI address: {input.provenance.abiAddress}</p>}
    <p>{input.historicalCertainty ? 'Historically bound ABI.' : 'Historical execution semantics are not established.'} {input.reason}</p>
    {input.arguments?.map((argument, index) => <p key={index} className="font-mono">{argument.name || `Argument ${index + 1}`} ({argument.type}): {JSON.stringify(argument.value)}</p>)}
    {input.subcalls?.map((subcall, index) => <details key={index} className="border-l border-white/10 pl-3"><summary className="min-h-6 py-1 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-text focus-visible:outline-offset-2">Subcall {index + 1}</summary><DecodedIntent input={subcall} /></details>)}
  </div>;
}

function AdditionalEvidence({ evidence }: { evidence: ReportEvidence }) {
  return <>
    {evidence.incident && <div className="mt-3 space-y-2">
      <p>{evidence.incident.name} - {evidence.incident.role}; {evidence.incident.date}. Reviewed {evidence.incident.reviewedAt}.</p>
      <p className="font-mono break-all">{evidence.incident.network}: {evidence.incident.hash}</p>
      <ul className="space-y-2">{evidence.incident.sources.map((source, index) => <li key={index}>
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-4 text-primary-text break-all">{source.title}<ExternalLink className="w-3 h-3 shrink-0" /></a>
        <p>{source.claim}</p>
      </li>)}</ul>
    </div>}
    {evidence.input && <DecodedIntent input={evidence.input} />}
    {(!!evidence.tokenStates?.length || !!evidence.permissionStates?.length) && <div className="mt-3 space-y-2">
      <h4 className="font-semibold text-white/70">Contract-reported state (not effective rights)</h4>
      <p>Interface responses are observations, not authenticated economics or permission effectiveness.</p>
      {evidence.tokenStates?.map((state, index) => <div key={`token:${index}`} className="font-mono break-all border-l border-white/10 pl-3">
        <p>Token {state.address}; block {state.blockTag}; {state.status}</p>
        {state.decimals !== undefined && <p>Contract-declared decimals: {state.decimals}</p>}
        {state.balanceRaw !== undefined && <p>Raw balance: {state.balanceRaw}</p>}
        {state.reason && <p>{state.reason}</p>}
      </div>)}
      {evidence.permissionStates?.map((state, index) => <div key={`permission:${index}`} className="font-mono break-all border-l border-white/10 pl-3">
        <p>{state.kind}; token {state.token}; block {state.blockTag}</p><p>Owner: {state.owner ?? 'unknown'}</p>
        {state.caller && <p>Caller: {state.caller}</p>}
        {state.spender && <p>Spender: {state.spender}</p>}<p>Raw permission value: {state.rawValue}</p>
        {state.tokenIdRaw !== undefined && <p>Raw token ID: {state.tokenIdRaw}</p>}
      </div>)}
    </div>}
  </>;
}

function KnownEntityBadge({ entity }: { entity: KnownEntity }) {
  return (
    <a
      href={entity.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 border-y border-border hover:bg-accent transition-colors py-3 group w-full"
    >
      <div className="flex-shrink-0 w-9 h-9 rounded-md bg-muted flex items-center justify-center text-sm font-bold text-foreground font-mono">
        {entity.logoLetter}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="font-display font-semibold text-white text-base leading-tight">{entity.name}</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/15">
            {entity.category}
          </span>
          {entity.trustLevel === "trusted" && (
            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <BadgeCheck className="w-3 h-3" /> Trusted
            </span>
          )}
        </div>
        <p className="text-sm text-subtle break-words">{entity.description}</p>
      </div>
      <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-primary transition-colors flex-shrink-0" />
    </a>
  );
}

const VERDICT_CONFIG = {
  safe: {
    icon: CheckCircle,
    label: 'No Concrete Warning Signs Detected',
    bg: 'bg-emerald-500/8',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    nextAction: 'Verify the destination and intended permissions independently before signing. No warning signs in acquired data is not signing clearance.',
  },
  caution: {
    icon: AlertTriangle,
    label: 'Proceed with Caution',
    bg: 'bg-amber-500/8',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    nextAction: 'Resolve the recorded limitations and review the findings before deciding whether to sign.',
  },
  dangerous: {
    icon: XCircle,
    label: 'Do Not Sign',
    bg: 'bg-rose-500/8',
    border: 'border-rose-500/20',
    text: 'text-rose-400',
    nextAction: 'Do not sign this request. Review the recorded findings and verify the intended destination and permissions independently.',
  },
} as const;

export function AnalysisResultView({ data }: { data: AnalysisResult }) {
  const { toast } = useToast();
  const validatedReport = parseValidatedReport(data.details);
  const reportV2 = validatedReport?.version === 'findings-v2' ? validatedReport : null;
  const verdict = (reportV2 ? reportV2.decisionScore <= 25 ? 'safe' : reportV2.decisionScore <= 60 ? 'caution' : 'dangerous' : data.verdict ?? 'caution') as keyof typeof VERDICT_CONFIG;
  const config = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.caution;
  const VerdictIcon = config.icon;

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: "Input copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard access is unavailable. Nothing was copied.", variant: "destructive" });
    }
  };

  if (data.details && typeof data.details === 'object' && 'validatedReport' in data.details && !validatedReport) {
    return <p role="alert" className="border-l-2 border-amber-400 pl-4 py-3 text-sm text-amber-200">Analysis unavailable: this report's evidence could not be validated. Run a fresh analysis. No risk verdict or score is shown.</p>;
  }

  return (
    <div className="w-full min-w-0 space-y-5">

      {!validatedReport && (
        <p role="status" className="border-l-2 border-amber-400 pl-4 py-2 text-sm text-amber-200/80">
          Legacy report: these statements were not checked by the current finding validator. Run a fresh analysis before relying on them.
        </p>
      )}
      {validatedReport?.version === 'findings-v1' && <p role="status" className="border-l-2 border-amber-400 pl-4 py-2 text-sm text-amber-200/80">Legacy validated report (findings-v1): narrower coverage. Separate evidence risk, uncertainty and adapter capabilities were not recorded. Run a fresh analysis for current supported checks.</p>}

      {/* ── VERDICT BANNER ── */}
      <section aria-label="Decision" className={`border-l-2 ${config.border} pl-4 py-2 space-y-3`}>
          <h2 className={`flex items-start gap-2 text-xl font-display font-semibold ${config.text}`}>
            <VerdictIcon className="w-5 h-5 shrink-0 mt-1" strokeWidth={1.8} />{config.label}
          </h2>
          <p className="text-foreground text-sm leading-relaxed break-words">
            <JargonText text={data.verdictReason} />
          </p>
          <div className="space-y-1 text-sm leading-relaxed">
            <h3 className="font-semibold text-foreground">Next action</h3>
            <p className="text-subtle">{!validatedReport || validatedReport.version === 'findings-v1' ? 'Run a fresh analysis before relying on this legacy report. Review the intended destination and permissions independently.' : config.nextAction}</p>
          </div>
      </section>

      {/* ── HEADER PANEL ── */}
      <section aria-label="Explanation" className="border-t border-border pt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-subtle">
            <span className="font-mono">
              {data.network}
            </span>
            <span className="font-mono">
              {data.inputType}
            </span>
          </div>

          <p className="text-sm text-foreground leading-relaxed break-words">
            <JargonText text={data.summary} />
          </p>

          <div className="flex items-start gap-2 text-subtle min-w-0">
            <code className="font-mono text-xs break-all select-text min-w-0 flex-1">{data.input}</code>
            <button
              onClick={() => handleCopy(data.input)}
              className="flex items-center justify-center w-8 h-8 hover:text-primary-text transition-colors shrink-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-text"
              aria-label="Copy input"
              title="Copy input"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
      </section>

      <details className="border-y border-border py-3" data-evidence>
        <summary className="cursor-pointer text-sm font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-text">Scores and methodology</summary>
        <div className="mt-3 space-y-3">
          {reportV2 ? <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div><dt className="text-subtle">Evidence-backed risk</dt><dd className="text-foreground font-semibold">{reportV2.evidenceRiskScore === null ? 'No concrete risk established' : `${reportV2.evidenceRiskScore}/100`}</dd></div>
            <div><dt className="text-subtle">Uncertainty</dt><dd className="text-amber-300 font-mono">{reportV2.uncertaintyScore}/100</dd></div>
            <div><dt className="text-subtle">Decision score</dt><dd className="text-foreground font-mono">{reportV2.decisionScore}/100</dd></div>
          </dl> : <RiskRing score={data.riskScore} level={data.riskLevel} />}
          {validatedReport && <p className="text-sm text-subtle">Assessed evidence only, not signing clearance. {reportV2 ? 'Decision score uses dual evidence-risk and uncertainty floors v2; a product heuristic, not a loss probability. No concrete risk established does not mean safe.' : 'Score policy: maximum evidence floor v1; a product heuristic, not a loss probability.'}</p>}

      {/* ── SCORE BREAKDOWN ── */}
      {!validatedReport && data.scoreFactors && data.scoreFactors.length > 0 && (
        <RiskScoreBreakdown factors={data.scoreFactors} riskScore={data.riskScore} />
      )}
        </div>
      </details>

      {!validatedReport && <details className="border-b border-border pb-3">
        <summary className="cursor-pointer text-sm font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-text">Legacy findings and evidence</summary>
        <div className="mt-3 space-y-4">
          {data.knownEntity && <KnownEntityBadge entity={data.knownEntity} />}
          {data.approvalInfo?.isApproval && <ApprovalInspector info={data.approvalInfo} />}
      {/* ── PATTERN DETECTION ── */}
      {!validatedReport && data.patterns && data.patterns.length > 0 && (
        <PatternDetectionCard patterns={data.patterns} />
      )}

      {/* ── CONTRACT REPUTATION ── */}
      {!validatedReport && data.reputation && <ContractReputationCard data={data.reputation} />}

      {/* ── UPGRADE DIFF ── */}
      {!validatedReport && data.inputType === 'contract' && (
        <ContractDiffView address={data.input} network={data.network.toLowerCase()} />
      )}
        </div>
      </details>}

      {/* ── STRUCTURED BREAKDOWN ── */}
      {validatedReport ? (
        <section className="space-y-5 border-y border-white/10 py-6">
          {reportV2 && <div className="space-y-3">
            <p className="text-sm text-white/75">Coverage: <strong>{reportV2.coverage === 'complete_for_supported_checks' ? 'Complete for supported checks only' : reportV2.coverage === 'partial' ? 'Partial' : 'Unavailable'}</strong>. Not a complete audit or full execution assessment.</p>
            <details data-evidence><summary className="cursor-pointer text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-text">Check capabilities</summary>
            <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              {([
                ['sourceVerification', 'Source verification'], ['receiptEvents', 'Receipt events'], ['incidentLookup', 'Incident lookup'], ['inputDecoding', 'Input decoding'],
                ['reportedTokenState', 'Reported token state'], ['reportedPermissionState', 'Reported permission state'], ['internalTraces', 'Internal traces'], ['isolatedBalanceDeltas', 'Isolated balance deltas'],
              ] as const).map(([key, label]) => <div key={key} className="flex justify-between gap-3 border-b border-white/5 pb-2"><dt className="text-white/60">{label}</dt><dd className={reportV2.capabilities[key] ? 'text-white/80' : 'text-amber-300'}>{reportV2.capabilities[key] ? 'Available' : 'Not established'}</dd></div>)}
            </dl>
            </details>
          </div>}
          <div className="space-y-3">
            {([
              { category: 'risk', label: 'Risk Findings', icon: ShieldAlert, color: 'text-rose-400', empty: 'No concrete risk findings in the acquired data.' },
              { category: 'limitation', label: 'Analysis Limits', icon: AlertTriangle, color: 'text-amber-300', empty: 'No additional recorded limitations.' },
              { category: 'observation', label: 'Observations', icon: CheckCircle2, color: 'text-white/70', empty: 'No observations recorded.' },
              { category: 'supported_indicator', label: 'Supporting Evidence', icon: ShieldCheck, color: 'text-emerald-300', empty: 'No supporting indicators established.' },
            ] as const).map(group => {
              const entries = validatedReport.findings.filter(f => f.category === group.category);
              return (
                <details key={group.category} open={group.category === 'risk' || group.category === 'limitation'} className="min-w-0 border-t border-border py-3">
                  <summary className={`cursor-pointer text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-text ${group.color}`}>{group.label} ({entries.length})</summary>
                  {entries.length ? <ul className="divide-y divide-white/5">{entries.map(f => {
                    const evidence = validatedReport.evidence.find(e => e.id === f.evidenceRefs[0])!;
                    return <li key={f.id} className="py-3 text-sm leading-relaxed text-white/75 break-words">
                      {f.text}
                      <details className="mt-2 text-xs text-white/50" data-evidence>
                        <summary className="cursor-pointer min-h-8 py-1 hover:text-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-text">Recorded evidence</summary>
                        <dl className="mt-2 space-y-1 break-all">
                          <div><dt className="inline text-subtle">Subject: </dt><dd className="inline font-mono">{evidence.subject}</dd></div>
                          <div><dt className="inline text-subtle">Observation: </dt><dd className="inline">{evidence.value}</dd></div>
                        </dl>
                        <AdditionalEvidence evidence={evidence} />
                        {evidence.transfers && evidence.transfers.length > 0 && <ul className="mt-2 divide-y divide-white/10">{evidence.transfers.map((transfer, index) => <li key={index} className="py-2 space-y-1 font-mono break-all">
                          <p>{transfer.kind} · emitter {transfer.token}</p>
                          <p>From {transfer.from}</p><p>To {transfer.to}</p>
                          <p>{transfer.amountRaw !== undefined ? `Raw amount: ${transfer.amountRaw}` : `Raw token ID: ${transfer.tokenIdRaw}`}</p>
                        </li>)}</ul>}
                      </details>
                    </li>;
                  })}</ul> : <p className="text-sm text-subtle">{group.empty}</p>}
                </details>
              );
            })}
          </div>
        </section>
      ) : (
        <details className="border-y border-border py-3" open>
          <summary className="cursor-pointer text-sm font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-text">Legacy transaction breakdown</summary>
          {data.breakdown ? <TransactionBreakdown data={data.breakdown} /> : <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Warnings */}
          <div className="space-y-3 min-w-0">
            <h3 className="flex items-center gap-2.5 font-display text-base text-rose-400 font-bold">
              <ShieldAlert className="w-4.5 h-4.5" strokeWidth={1.7} /> Threat Vectors
            </h3>
            {data.warnings.length === 0 ? (
              <p className="text-subtle text-sm">No threats detected.</p>
            ) : (
              <ul className="space-y-3">
                {data.warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-3 py-3 border-b border-border break-words">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" strokeWidth={1.7} />
                    <span className="text-sm text-white/75 leading-relaxed"><JargonText text={w} /></span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Positives */}
          <div className="space-y-3 min-w-0">
            <h3 className="flex items-center gap-2.5 font-display text-base text-emerald-400 font-bold">
              <ShieldCheck className="w-4.5 h-4.5" strokeWidth={1.7} /> Trust Indicators
            </h3>
            {data.positives.length === 0 ? (
              <p className="text-subtle text-sm">No positive indicators found.</p>
            ) : (
              <ul className="space-y-3">
                {data.positives.map((p, i) => (
                  <li key={i} className="flex items-start gap-3 py-3 border-b border-border break-words">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" strokeWidth={1.7} />
                    <span className="text-sm text-white/75 leading-relaxed"><JargonText text={p} /></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>}
        </details>
      )}

      {/* ── RAW DETAILS ── */}
      {!validatedReport && data.details && Object.keys(data.details).length > 0 && (
        <details className="border-b border-border pb-3">
          <summary className="cursor-pointer text-sm font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-text">Execution Details</summary>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(data.details).map(([key, value]) => {
              if (value === undefined || value === null || key === 'rawData' || key === 'reputation' || key === 'validatedReport') return null;
              return (
                <div key={key} className="space-y-1 pb-3 border-b border-white/5 last:border-0">
                  <span className="text-[10px] text-white/25 font-mono uppercase tracking-widest">{key}</span>
                  <div className="text-sm text-white/70 font-mono break-all leading-snug">{String(value)}</div>
                </div>
              );
            })}
          </div>
        </details>
      )}
      <footer className="border-t border-border pt-4">
        <ShareButton data={data} />
      </footer>
    </div>
  );
}
