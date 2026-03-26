import {
  ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Key,
  Flame, Coins, Anchor, Sprout, Zap, Package,
  GitMerge, LogOut, LogIn, Hammer, HelpCircle,
  ShieldCheck, AlertTriangle, AlertOctagon, Info, CheckCircle2,
} from 'lucide-react';
import type { TransactionBreakdown as TBreakdown, BreakdownRiskFactor } from '@workspace/api-client-react';

// ── Action type config ────────────────────────────────────────────────────────
const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  swap:     { icon: ArrowLeftRight, color: "text-primary",    bg: "bg-primary/10",    border: "border-primary/25"    },
  approve:  { icon: Key,            color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/25"  },
  transfer: { icon: ArrowUpRight,   color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20"   },
  mint:     { icon: Hammer,         color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  burn:     { icon: Flame,          color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20"    },
  bridge:   { icon: GitMerge,       color: "text-cyan-400",   bg: "bg-cyan-500/10",   border: "border-cyan-500/20"   },
  stake:    { icon: Anchor,         color: "text-emerald-400",bg: "bg-emerald-500/10",border: "border-emerald-500/20"},
  deposit:  { icon: LogIn,          color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20"  },
  withdraw: { icon: LogOut,         color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  revoke:   { icon: ShieldCheck,    color: "text-emerald-400",bg: "bg-emerald-500/10",border: "border-emerald-500/20"},
  deploy:   { icon: Package,        color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
  other:    { icon: HelpCircle,     color: "text-muted-foreground", bg: "bg-white/5", border: "border-white/10"      },
};

// ── Risk factor severity config ───────────────────────────────────────────────
const SEVERITY_CONFIG = {
  critical: { icon: AlertOctagon, color: "text-red-400",     bg: "bg-red-500/8",     border: "border-red-500/20",     dot: "bg-red-400"     },
  high:     { icon: AlertTriangle,color: "text-amber-400",   bg: "bg-amber-500/8",   border: "border-amber-500/20",   dot: "bg-amber-400"   },
  medium:   { icon: Info,         color: "text-yellow-400",  bg: "bg-yellow-500/8",  border: "border-yellow-500/15",  dot: "bg-yellow-400"  },
  low:      { icon: Info,         color: "text-blue-400",    bg: "bg-blue-500/8",    border: "border-blue-500/15",    dot: "bg-blue-400"    },
  positive: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/8", border: "border-emerald-500/20", dot: "bg-emerald-400" },
};

// ── Panel shell ───────────────────────────────────────────────────────────────
function Panel({ title, icon: Icon, iconColor, children }: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card/60 border border-card-border rounded-2xl overflow-hidden flex flex-col backdrop-blur-sm">
      <div className="px-5 py-3.5 border-b border-white/6 flex items-center gap-2.5 bg-white/2">
        <Icon className={`w-4 h-4 ${iconColor}`} strokeWidth={1.8} />
        <span className="text-xs font-mono font-bold tracking-widest uppercase text-muted-foreground">{title}</span>
      </div>
      <div className="p-5 flex-1">{children}</div>
    </div>
  );
}

// ── Asset row ─────────────────────────────────────────────────────────────────
function AssetRow({ asset, amount, usdValue, direction }: {
  asset: string; amount: string; usdValue?: string; direction: "in" | "out";
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono border ${
          direction === "out"
            ? "bg-red-500/10 border-red-500/20 text-red-300"
            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
        }`}>
          {direction === "out" ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
        </div>
        <div>
          <span className={`text-sm font-semibold ${direction === "out" ? "text-red-200" : "text-emerald-200"}`}>
            {direction === "out" ? "−" : "+"}{amount}
          </span>
          <span className="text-sm text-white ml-1.5">{asset}</span>
        </div>
      </div>
      {usdValue && (
        <span className="text-xs font-mono text-muted-foreground shrink-0">{usdValue}</span>
      )}
    </div>
  );
}

// ── Risk factor row ───────────────────────────────────────────────────────────
function RiskRow({ factor }: { factor: BreakdownRiskFactor }) {
  const sev = (factor.severity in SEVERITY_CONFIG ? factor.severity : "low") as keyof typeof SEVERITY_CONFIG;
  const cfg = SEVERITY_CONFIG[sev];
  const Icon = cfg.icon;
  return (
    <div className={`flex items-start gap-3 px-3.5 py-3 rounded-xl border ${cfg.bg} ${cfg.border}`}>
      <Icon className={`w-4 h-4 ${cfg.color} shrink-0 mt-0.5`} strokeWidth={1.8} />
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className={`text-xs font-mono font-bold ${cfg.color} uppercase tracking-wide`}>{factor.severity}</span>
          <span className="text-sm font-semibold text-white">{factor.label}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{factor.detail}</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function TransactionBreakdown({ data }: { data: TBreakdown }) {
  const actionCfg = ACTION_CONFIG[data.actionType] ?? ACTION_CONFIG.other;
  const ActionIcon = actionCfg.icon;
  const hasAssets = data.assetsOut.length > 0 || data.assetsIn.length > 0;
  const hasPermissions = data.permissions.length > 0;
  const hasRiskFactors = data.riskFactors.length > 0;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-px flex-1 bg-white/8" />
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest px-2">Transaction Breakdown</span>
        <div className="h-px flex-1 bg-white/8" />
      </div>

      {/* 2-col top row: Action + Assets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Action panel */}
        <Panel title="Action" icon={Zap} iconColor="text-primary">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${actionCfg.bg} ${actionCfg.border} shrink-0`}>
              <ActionIcon className={`w-7 h-7 ${actionCfg.color}`} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xl font-display font-bold text-white leading-tight">{data.actionLabel}</p>
              <span className={`text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border mt-1.5 inline-block ${actionCfg.bg} ${actionCfg.border} ${actionCfg.color}`}>
                {data.actionType}
              </span>
            </div>
          </div>
        </Panel>

        {/* Assets In / Out */}
        <Panel title="Assets" icon={Coins} iconColor="text-blue-400">
          {!hasAssets ? (
            <p className="text-sm text-muted-foreground font-mono py-2">No asset transfers detected</p>
          ) : (
            <div className="divide-y divide-white/5">
              {data.assetsOut.map((a, i) => (
                <AssetRow key={`out-${i}`} {...a} direction="out" />
              ))}
              {data.assetsIn.map((a, i) => (
                <AssetRow key={`in-${i}`} {...a} direction="in" />
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* 2-col bottom row: Permissions + Risk Factors */}
      <div className={`grid grid-cols-1 gap-4 ${hasPermissions ? "md:grid-cols-2" : ""}`}>

        {/* Permissions — only render if there are any */}
        {hasPermissions && (
          <Panel title="Permissions Granted" icon={Key} iconColor="text-amber-400">
            <div className="space-y-3">
              {data.permissions.map((perm, i) => (
                <div key={i} className="flex flex-col gap-1 bg-amber-500/5 border border-amber-500/15 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-amber-300 font-bold uppercase tracking-wide">{perm.asset}</span>
                    <span className="text-xs text-muted-foreground">→</span>
                    <span className="text-sm font-semibold text-white">{perm.spender}</span>
                  </div>
                  <span className={`text-xs font-mono font-bold ${
                    perm.amount.toLowerCase().includes("unlimited") ? "text-red-300" : "text-amber-300"
                  }`}>
                    {perm.amount.toLowerCase().includes("unlimited") ? "∞ UNLIMITED" : perm.amount}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Risk Factors */}
        {hasRiskFactors && (
          <Panel title="Risk Factors" icon={Sprout} iconColor="text-emerald-400">
            <div className="space-y-2.5">
              {data.riskFactors.map((factor, i) => (
                <RiskRow key={i} factor={factor} />
              ))}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
