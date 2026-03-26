import { ShieldCheck, ShieldAlert, CheckCircle2, Copy, CheckCircle, AlertTriangle, XCircle, ExternalLink, BadgeCheck } from 'lucide-react';
import type { AnalysisResult, KnownEntity } from '@workspace/api-client-react';
import { RiskRing } from './RiskRing';
import { ApprovalInspector } from './ApprovalInspector';
import { TransactionBreakdown } from './TransactionBreakdown';
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
      className="flex items-center gap-4 bg-primary/5 border border-primary/25 hover:border-primary/50 hover:bg-primary/10 transition-all rounded-2xl px-6 py-4 group w-full"
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-2xl font-bold text-primary font-mono">
        {entity.logoLetter}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display font-semibold text-white text-lg leading-tight">{entity.name}</span>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
            {icon} {entity.category}
          </span>
          {entity.trustLevel === "trusted" && (
            <span className="flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              <BadgeCheck className="w-3 h-3" /> Trusted Protocol
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5 truncate">{entity.description}</p>
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
    </a>
  );
}

const VERDICT_CONFIG = {
  safe: {
    icon: CheckCircle,
    label: 'Safe to Sign',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/20',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    emoji: '✅',
  },
  caution: {
    icon: AlertTriangle,
    label: 'Proceed with Caution',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/20',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    emoji: '⚠️',
  },
  dangerous: {
    icon: XCircle,
    label: 'Do Not Sign',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    glow: 'shadow-red-500/20',
    badge: 'bg-red-500/20 text-red-300 border-red-500/30',
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
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in zoom-in duration-700 fill-mode-both">

      {/* ── VERDICT BANNER ── */}
      <div className={`relative overflow-hidden rounded-3xl border ${config.bg} ${config.border} shadow-2xl ${config.glow} p-8 flex flex-col sm:flex-row items-center gap-6`}>
        {/* Subtle radial glow behind icon */}
        <div className={`absolute -top-8 -left-8 w-40 h-40 rounded-full blur-3xl opacity-20 ${verdict === 'safe' ? 'bg-emerald-400' : verdict === 'dangerous' ? 'bg-red-500' : 'bg-amber-400'}`} />

        <div className={`relative flex-shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center border ${config.border} ${config.bg}`}>
          <VerdictIcon className={`w-10 h-10 ${config.text}`} strokeWidth={1.5} />
        </div>

        <div className="relative flex-1 text-center sm:text-left space-y-2">
          <div className="flex items-center gap-3 justify-center sm:justify-start flex-wrap">
            <span className={`text-xs font-mono font-bold tracking-widest uppercase px-3 py-1 rounded-full border ${config.badge}`}>
              Should I sign this?
            </span>
          </div>
          <p className={`text-2xl md:text-3xl font-display font-bold ${config.text}`}>
            {config.emoji} {config.label}
          </p>
          <p className="text-white/70 text-base leading-relaxed font-sans">
            {data.verdictReason}
          </p>
        </div>
      </div>

      {/* ── KNOWN ENTITY BANNER ── */}
      {data.knownEntity && (
        <KnownEntityBadge entity={data.knownEntity} />
      )}

      {/* ── APPROVAL INSPECTOR ── */}
      {data.approvalInfo?.isApproval && (
        <ApprovalInspector info={data.approvalInfo} />
      )}

      {/* ── HEADER PANEL (summary + ring) ── */}
      <div className="bg-card/80 border border-card-border p-8 md:p-10 rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col md:flex-row gap-10 items-center">
        <RiskRing score={data.riskScore} level={data.riskLevel} />
        
        <div className="flex-1 space-y-6 text-center md:text-left">
          <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
            <span className="px-4 py-1.5 bg-primary/10 border border-primary/20 text-primary rounded-full font-mono text-xs font-semibold tracking-wider">
              {data.network.toUpperCase()}
            </span>
            <span className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full font-mono text-xs text-muted-foreground tracking-wider">
              {data.inputType.toUpperCase()}
            </span>
          </div>
          
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-semibold text-white leading-tight">
            {data.summary}
          </h2>
          
          <div className="flex items-center justify-center md:justify-start gap-3 text-muted-foreground bg-black/40 w-fit px-4 py-2 rounded-lg border border-white/5 mx-auto md:mx-0">
            <span className="font-mono text-sm break-all">
              {data.input.length > 20
                ? `${data.input.slice(0, 10)}...${data.input.slice(-8)}`
                : data.input}
            </span>
            <button 
              onClick={() => handleCopy(data.input)} 
              className="hover:text-primary transition-colors p-1 rounded-md hover:bg-white/5"
              aria-label="Copy address"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── STRUCTURED BREAKDOWN ── */}
      {data.breakdown ? (
        <TransactionBreakdown data={data.breakdown} />
      ) : (
        /* Fallback: old two-column threat/trust panels if no breakdown data */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-destructive/5 border border-destructive/20 rounded-3xl p-8 space-y-6 shadow-xl shadow-destructive/5">
            <h3 className="flex items-center gap-3 font-display text-xl text-destructive font-bold">
              <ShieldAlert className="w-6 h-6" /> Threat Vectors
            </h3>
            {data.warnings.length === 0 ? (
              <p className="text-muted-foreground text-sm font-mono bg-black/40 p-4 rounded-xl border border-white/5">No threats detected.</p>
            ) : (
              <ul className="space-y-4">
                {data.warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-4 bg-black/40 p-4 rounded-xl border border-destructive/10">
                    <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <span className="text-sm text-white/90 leading-relaxed">{w}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="bg-success/5 border border-success/20 rounded-3xl p-8 space-y-6 shadow-xl shadow-success/5">
            <h3 className="flex items-center gap-3 font-display text-xl text-success font-bold">
              <ShieldCheck className="w-6 h-6" /> Trust Indicators
            </h3>
            {data.positives.length === 0 ? (
              <p className="text-muted-foreground text-sm font-mono bg-black/40 p-4 rounded-xl border border-white/5">No positive indicators found.</p>
            ) : (
              <ul className="space-y-4">
                {data.positives.map((p, i) => (
                  <li key={i} className="flex items-start gap-4 bg-black/40 p-4 rounded-xl border border-success/10">
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                    <span className="text-sm text-white/90 leading-relaxed">{p}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── RAW DETAILS ── */}
      {data.details && Object.keys(data.details).length > 0 && (
        <div className="bg-card/50 border border-card-border rounded-3xl p-8 overflow-hidden backdrop-blur-sm">
          <h3 className="font-display text-xl text-white font-bold mb-8">Execution Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-8">
            {Object.entries(data.details).map(([key, value]) => {
              if (value === undefined || value === null || key === 'rawData') return null;
              return (
                <div key={key} className="flex flex-col border-b border-white/10 pb-3 group">
                  <span className="text-xs text-muted-foreground font-mono uppercase tracking-[0.15em] mb-2 group-hover:text-primary transition-colors">{key}</span>
                  <span className="text-sm text-white font-mono break-all leading-tight">{String(value)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
