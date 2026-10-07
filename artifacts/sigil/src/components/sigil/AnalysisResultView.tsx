import { ShieldCheck, ShieldAlert, CheckCircle2, Copy, CheckCircle, AlertTriangle, XCircle, ExternalLink, BadgeCheck, Zap, RefreshCw } from 'lucide-react';
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
    {input.subcalls?.map((subcall, index) => <details key={index} className="border-l border-white/10 pl-3"><summary>Subcall {index + 1}</summary><DecodedIntent input={subcall} /></details>)}
  </div>;
}

function AdditionalEvidence({ evidence }: { evidence: ReportEvidence }) {
  return <>
    {evidence.incident && <div className="mt-3 space-y-2">
      <p>{evidence.incident.name} - {evidence.incident.role}; {evidence.incident.date}. Reviewed {evidence.incident.reviewedAt}.</p>
      <p className="font-mono break-all">{evidence.incident.network}: {evidence.incident.hash}</p>
      <ul className="space-y-2">{evidence.incident.sources.map((source, index) => <li key={index}>
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline break-all">{source.title}<ExternalLink className="w-3 h-3 shrink-0" /></a>
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

const CATEGORY_ICONS: Record<string, string> = {
  "DEX": "⚡",
  "Lending": "🏦",
  "NFT Marketplace": "🖼️",
  "Bridge": "🌉",
  "Stablecoin": "💵",
  "Wrapped Token": "🔀",
  "Derivatives": "📈",
  "Yield": "🌱",
  "DAO": "🏛️",
  "Oracle": "🔮",
  "Wallet / Multisig": "🔐",
  "Token": "🪙",
};

function KnownEntityBadge({ entity }: { entity: KnownEntity }) {
  const icon = CATEGORY_ICONS[entity.category] ?? "🔷";
  return (
    <a
      href={entity.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-4 bg-primary/5 border border-primary/15 hover:border-primary/35 hover:bg-primary/8 transition-all rounded-2xl px-5 py-4 group w-full"
    >
      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/12 border border-primary/20 flex items-center justify-center text-xl font-bold text-primary font-mono">
        {entity.logoLetter}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="font-display font-semibold text-white text-base leading-tight">{entity.name}</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/15">
            {icon} {entity.category}
          </span>
          {entity.trustLevel === "trusted" && (
            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <BadgeCheck className="w-3 h-3" /> Trusted
            </span>
          )}
        </div>
        <p className="text-xs text-white/35 truncate">{entity.description}</p>
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
    ring: '#10b981',
    badge: 'bg-emerald-500/12 text-emerald-300 border-emerald-500/20',
    emoji: '✅',
  },
  caution: {
    icon: AlertTriangle,
    label: 'Proceed with Caution',
    bg: 'bg-amber-500/8',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    ring: '#f59e0b',
    badge: 'bg-amber-500/12 text-amber-300 border-amber-500/20',
    emoji: '⚠️',
  },
  dangerous: {
    icon: XCircle,
    label: 'Do Not Sign',
    bg: 'bg-rose-500/8',
    border: 'border-rose-500/20',
    text: 'text-rose-400',
    ring: '#f43f5e',
    badge: 'bg-rose-500/12 text-rose-300 border-rose-500/20',
    emoji: '🚨',
  },
} as const;

export function AnalysisResultView({ data }: { data: AnalysisResult }) {
  const { toast } = useToast();
  const validatedReport = parseValidatedReport(data.details);
  const reportV2 = validatedReport?.version === 'findings-v2' ? validatedReport : null;
  const verdict = (reportV2 ? reportV2.decisionScore <= 25 ? 'safe' : reportV2.decisionScore <= 60 ? 'caution' : 'dangerous' : data.verdict ?? 'caution') as keyof typeof VERDICT_CONFIG;
  const config = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.caution;
  const VerdictIcon = config.icon;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Address copied to clipboard" });
  };

  if (data.details && typeof data.details === 'object' && 'validatedReport' in data.details && !validatedReport) {
    return <p role="alert" className="border-l-2 border-amber-400 pl-4 py-3 text-sm text-amber-200">Analysis unavailable: this report's evidence could not be validated. Run a fresh analysis. No risk verdict or score is shown.</p>;
  }

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-500">

      {!validatedReport && (
        <p role="status" className="border-l-2 border-amber-400 pl-4 py-2 text-sm text-amber-200/80">
          Legacy report: these statements were not checked by the current finding validator. Run a fresh analysis before relying on them.
        </p>
      )}
      {validatedReport?.version === 'findings-v1' && <p role="status" className="border-l-2 border-amber-400 pl-4 py-2 text-sm text-amber-200/80">Legacy validated report (findings-v1): narrower coverage. Separate evidence risk, uncertainty and adapter capabilities were not recorded. Run a fresh analysis for current supported checks.</p>}

      {/* ── VERDICT BANNER ── */}
      <div className={`relative overflow-hidden rounded-2xl border ${config.bg} ${config.border} p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5`}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 0% 50%, ${config.ring}18 0%, transparent 70%)` }} />

        <div className={`relative flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center border ${config.border} ${config.bg}`}>
          <VerdictIcon className={`w-8 h-8 ${config.text}`} strokeWidth={1.5} />
        </div>

        <div className="relative flex-1 text-center sm:text-left space-y-1.5">
          <span className={`text-[10px] font-mono font-bold tracking-widest uppercase px-3 py-1 rounded-full border inline-block ${config.badge}`}>
            Should I sign this?
          </span>
          <p className={`text-xl md:text-2xl font-display font-bold ${config.text}`}>
            {config.emoji} {config.label}
          </p>
          <p className="text-white/55 text-sm leading-relaxed">
            <JargonText text={data.verdictReason} />
          </p>
        </div>
      </div>

      {/* ── SHARE BUTTON ── */}
      <ShareButton data={data} />

      {/* ── KNOWN ENTITY ── */}
      {!validatedReport && data.knownEntity && <KnownEntityBadge entity={data.knownEntity} />}

      {/* ── APPROVAL INSPECTOR ── */}
      {!validatedReport && data.approvalInfo?.isApproval && <ApprovalInspector info={data.approvalInfo} />}

      {/* ── HEADER PANEL ── */}
      <div
        className="rounded-2xl border border-white/6 p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center"
        style={{ background: 'rgba(139,92,246,0.04)' }}
      >
        {reportV2 ? <dl className="grid grid-cols-1 gap-3 w-full md:w-56 shrink-0 text-sm">
          <div><dt className="text-white/50">Evidence-backed risk</dt><dd className="text-white/90 font-semibold">{reportV2.evidenceRiskScore === null ? 'No concrete risk established' : `${reportV2.evidenceRiskScore}/100`}</dd></div>
          <div><dt className="text-white/50">Uncertainty</dt><dd className="text-amber-300 font-mono">{reportV2.uncertaintyScore}/100</dd></div>
          <div><dt className="text-white/50">Decision score</dt><dd className="text-white/90 font-mono">{reportV2.decisionScore}/100</dd></div>
        </dl> : <RiskRing score={data.riskScore} level={data.riskLevel} />}

        <div className="flex-1 space-y-4 text-center md:text-left">
          <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
            <span className="px-3 py-1 bg-primary/8 border border-primary/15 text-primary rounded-full font-mono text-[10px] font-bold tracking-wider uppercase">
              {data.network}
            </span>
            <span className="px-3 py-1 bg-white/4 border border-white/8 rounded-full font-mono text-[10px] text-white/35 tracking-wider uppercase">
              {data.inputType}
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-display font-semibold text-white/90 leading-snug">
            <JargonText text={data.summary} />
          </h2>

          <div className="inline-flex items-center gap-2.5 text-white/30 bg-white/3 border border-white/6 px-4 py-2 rounded-xl mx-auto md:mx-0">
            <span className="font-mono text-xs break-all">
              {data.input.length > 22
                ? `${data.input.slice(0, 10)}…${data.input.slice(-8)}`
                : data.input}
            </span>
            <button
              onClick={() => handleCopy(data.input)}
              className="hover:text-primary transition-colors shrink-0"
              aria-label="Copy"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── SCORE BREAKDOWN ── */}
      {!validatedReport && data.scoreFactors && data.scoreFactors.length > 0 && (
        <RiskScoreBreakdown factors={data.scoreFactors} riskScore={data.riskScore} />
      )}

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

      {/* ── STRUCTURED BREAKDOWN ── */}
      {validatedReport ? (
        <section className="space-y-5 border-y border-white/10 py-6">
          <p className="text-xs text-white/50">Assessed evidence only, not signing clearance. {reportV2 ? 'Decision score uses dual evidence-risk and uncertainty floors v2; a product heuristic, not a loss probability. No concrete risk established does not mean safe.' : 'Score policy: maximum evidence floor v1; a product heuristic, not a loss probability.'}</p>
          {reportV2 && <div className="space-y-3">
            <p className="text-sm text-white/75">Coverage: <strong>{reportV2.coverage === 'complete_for_supported_checks' ? 'Complete for supported checks only' : reportV2.coverage === 'partial' ? 'Partial' : 'Unavailable'}</strong>. Not a complete audit or full execution assessment.</p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs">
              {([
                ['sourceVerification', 'Source verification'], ['receiptEvents', 'Receipt events'], ['incidentLookup', 'Incident lookup'], ['inputDecoding', 'Input decoding'],
                ['reportedTokenState', 'Reported token state'], ['reportedPermissionState', 'Reported permission state'], ['internalTraces', 'Internal traces'], ['isolatedBalanceDeltas', 'Isolated balance deltas'],
              ] as const).map(([key, label]) => <div key={key} className="flex justify-between gap-3 border-b border-white/5 pb-2"><dt className="text-white/60">{label}</dt><dd className={reportV2.capabilities[key] ? 'text-white/80' : 'text-amber-300'}>{reportV2.capabilities[key] ? 'Available' : 'Not established'}</dd></div>)}
            </dl>
          </div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
            {([
              { category: 'risk', label: 'Risk Findings', icon: ShieldAlert, color: 'text-rose-400', empty: 'No concrete risk findings in the acquired data.' },
              { category: 'limitation', label: 'Analysis Limits', icon: AlertTriangle, color: 'text-amber-300', empty: 'No additional recorded limitations.' },
              { category: 'observation', label: 'Observations', icon: CheckCircle2, color: 'text-white/70', empty: 'No observations recorded.' },
              { category: 'supported_indicator', label: 'Supporting Evidence', icon: ShieldCheck, color: 'text-emerald-300', empty: 'No supporting indicators established.' },
            ] as const).map(group => {
              const entries = validatedReport.findings.filter(f => f.category === group.category);
              const Icon = group.icon;
              return (
                <div key={group.category} className="min-w-0 space-y-3">
                  <h3 className={`flex items-center gap-2 text-sm font-semibold ${group.color}`}><Icon className="w-4 h-4 shrink-0" />{group.label}</h3>
                  {entries.length ? <ul className="divide-y divide-white/5">{entries.map(f => {
                    const evidence = validatedReport.evidence.find(e => e.id === f.evidenceRefs[0])!;
                    return <li key={f.id} className="py-3 text-sm leading-relaxed text-white/75 break-words">
                      {f.text}
                      <details className="mt-2 text-xs text-white/50">
                        <summary className="cursor-pointer hover:text-white/80">Recorded evidence</summary>
                        <dl className="mt-2 space-y-1 break-all">
                          <div><dt className="inline text-white/35">Subject: </dt><dd className="inline font-mono">{evidence.subject}</dd></div>
                          <div><dt className="inline text-white/35">Observation: </dt><dd className="inline">{evidence.value}</dd></div>
                        </dl>
                        <AdditionalEvidence evidence={evidence} />
                        {evidence.transfers && evidence.transfers.length > 0 && <ul className="mt-2 divide-y divide-white/10">{evidence.transfers.map((transfer, index) => <li key={index} className="py-2 space-y-1 font-mono break-all">
                          <p>{transfer.kind} · emitter {transfer.token}</p>
                          <p>From {transfer.from}</p><p>To {transfer.to}</p>
                          <p>{transfer.amountRaw !== undefined ? `Raw amount: ${transfer.amountRaw}` : `Raw token ID: ${transfer.tokenIdRaw}`}</p>
                        </li>)}</ul>}
                      </details>
                    </li>;
                  })}</ul> : <p className="text-sm text-white/40">{group.empty}</p>}
                </div>
              );
            })}
          </div>
        </section>
      ) : data.breakdown ? (
        <TransactionBreakdown data={data.breakdown} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Warnings */}
          <div className="rounded-2xl border border-rose-500/12 bg-rose-500/4 p-6 space-y-4">
            <h3 className="flex items-center gap-2.5 font-display text-base text-rose-400 font-bold">
              <ShieldAlert className="w-4.5 h-4.5" strokeWidth={1.7} /> Threat Vectors
            </h3>
            {data.warnings.length === 0 ? (
              <p className="text-white/25 text-sm font-mono p-3 rounded-xl border border-white/5 bg-white/2">No threats detected.</p>
            ) : (
              <ul className="space-y-3">
                {data.warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-3 p-3 rounded-xl border border-rose-500/8 bg-rose-500/4">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" strokeWidth={1.7} />
                    <span className="text-sm text-white/75 leading-relaxed"><JargonText text={w} /></span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Positives */}
          <div className="rounded-2xl border border-emerald-500/12 bg-emerald-500/4 p-6 space-y-4">
            <h3 className="flex items-center gap-2.5 font-display text-base text-emerald-400 font-bold">
              <ShieldCheck className="w-4.5 h-4.5" strokeWidth={1.7} /> Trust Indicators
            </h3>
            {data.positives.length === 0 ? (
              <p className="text-white/25 text-sm font-mono p-3 rounded-xl border border-white/5 bg-white/2">No positive indicators found.</p>
            ) : (
              <ul className="space-y-3">
                {data.positives.map((p, i) => (
                  <li key={i} className="flex items-start gap-3 p-3 rounded-xl border border-emerald-500/8 bg-emerald-500/4">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" strokeWidth={1.7} />
                    <span className="text-sm text-white/75 leading-relaxed"><JargonText text={p} /></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── RAW DETAILS ── */}
      {!validatedReport && data.details && Object.keys(data.details).length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-white/2 p-6">
          <h3 className="font-display text-sm font-bold text-white/50 uppercase tracking-widest mb-5">Execution Details</h3>
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
        </div>
      )}
    </div>
  );
}
