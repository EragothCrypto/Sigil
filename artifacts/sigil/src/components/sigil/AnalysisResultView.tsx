import { ShieldCheck, ShieldAlert, CheckCircle2, Copy, CheckCircle, AlertTriangle, XCircle, ExternalLink, BadgeCheck } from 'lucide-react';
import type { AnalysisResult, KnownEntity } from '@workspace/api-client-react';
import { RiskRing } from './RiskRing';
import { ApprovalInspector } from './ApprovalInspector';
import { TransactionBreakdown } from './TransactionBreakdown';
import { ContractReputationCard } from './ContractReputationCard';
import { useToast } from '@/hooks/use-toast';

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
    label: 'Safe to Sign',
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
  const verdict = (data.verdict ?? 'caution') as keyof typeof VERDICT_CONFIG;
  const config = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.caution;
  const VerdictIcon = config.icon;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Address copied to clipboard" });
  };

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-500">

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
            {data.verdictReason}
          </p>
        </div>
      </div>

      {/* ── KNOWN ENTITY ── */}
      {data.knownEntity && <KnownEntityBadge entity={data.knownEntity} />}

      {/* ── APPROVAL INSPECTOR ── */}
      {data.approvalInfo?.isApproval && <ApprovalInspector info={data.approvalInfo} />}

      {/* ── HEADER PANEL ── */}
      <div
        className="rounded-2xl border border-white/6 p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center"
        style={{ background: 'rgba(139,92,246,0.04)' }}
      >
        <RiskRing score={data.riskScore} level={data.riskLevel} />

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
            {data.summary}
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

      {/* ── CONTRACT REPUTATION ── */}
      {data.reputation && <ContractReputationCard data={data.reputation} />}

      {/* ── STRUCTURED BREAKDOWN ── */}
      {data.breakdown ? (
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
                    <span className="text-sm text-white/75 leading-relaxed">{w}</span>
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
                    <span className="text-sm text-white/75 leading-relaxed">{p}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── RAW DETAILS ── */}
      {data.details && Object.keys(data.details).length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-white/2 p-6">
          <h3 className="font-display text-sm font-bold text-white/50 uppercase tracking-widest mb-5">Execution Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(data.details).map(([key, value]) => {
              if (value === undefined || value === null || key === 'rawData' || key === 'reputation') return null;
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
