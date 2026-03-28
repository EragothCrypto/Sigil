import { ShieldCheck, ShieldAlert, ShieldX, Clock, Code2, Activity, BadgeCheck, AlertOctagon, TrendingUp } from 'lucide-react';
import type { ContractReputation, ReputationFactor } from '@workspace/api-client-react';

// ── Tier config ───────────────────────────────────────────────────────────────
const TIER_CONFIG = {
  new:         { color: "text-red-400",     ring: "#ef4444",  bg: "bg-red-500/10",     border: "border-red-500/25",     glow: "shadow-red-500/15",    icon: ShieldX },
  unproven:    { color: "text-orange-400",  ring: "#f97316",  bg: "bg-orange-500/10",  border: "border-orange-500/25",  glow: "shadow-orange-500/15", icon: ShieldAlert },
  emerging:    { color: "text-yellow-400",  ring: "#eab308",  bg: "bg-yellow-500/10",  border: "border-yellow-500/25",  glow: "shadow-yellow-500/15", icon: ShieldAlert },
  established: { color: "text-blue-400",    ring: "#3b82f6",  bg: "bg-blue-500/10",    border: "border-blue-500/25",    glow: "shadow-blue-500/15",   icon: ShieldCheck },
  trusted:     { color: "text-emerald-400", ring: "#10b981",  bg: "bg-emerald-500/10", border: "border-emerald-500/25", glow: "shadow-emerald-500/15",icon: ShieldCheck },
  exploited:   { color: "text-red-500",     ring: "#dc2626",  bg: "bg-red-600/15",     border: "border-red-600/30",     glow: "shadow-red-600/20",    icon: ShieldX },
};

const FACTOR_ICONS = {
  "Contract Age": Clock,
  "Source Verification": Code2,
  "On-Chain Activity": Activity,
  "Protocol Recognition": BadgeCheck,
  "Security History": AlertOctagon,
};

// ── Circular gauge (SVG arc) ──────────────────────────────────────────────────
function ScoreGauge({ score, ringColor }: { score: number; ringColor: string }) {
  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const r = 48;
  const strokeWidth = 8;

  // Arc from 135° to 405° (270° sweep for the full gauge)
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const startDeg = 135;
  const sweepDeg = 270;
  const endDeg = startDeg + sweepDeg;

  function arcPath(start: number, end: number) {
    const s = { x: cx + r * Math.cos(toRad(start)), y: cy + r * Math.sin(toRad(start)) };
    const e = { x: cx + r * Math.cos(toRad(end)), y: cy + r * Math.sin(toRad(end)) };
    const large = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const filledEnd = startDeg + (sweepDeg * Math.min(score, 100)) / 100;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      {/* Track */}
      <path
        d={arcPath(startDeg, endDeg)}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Filled arc */}
      {score > 0 && (
        <path
          d={arcPath(startDeg, filledEnd)}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={0.9}
        />
      )}
      {/* Score label */}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize="22"
        fontWeight="bold"
        fontFamily="'JetBrains Mono', monospace"
      >
        {score}
      </text>
      <text
        x={cx}
        y={cy + 16}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="rgba(255,255,255,0.4)"
        fontSize="9"
        fontWeight="600"
        fontFamily="'Inter', sans-serif"
        letterSpacing="1"
      >
        TRUST SCORE
      </text>
    </svg>
  );
}

// ── Factor row ────────────────────────────────────────────────────────────────
function FactorRow({ factor }: { factor: ReputationFactor }) {
  const IconComp = FACTOR_ICONS[factor.name as keyof typeof FACTOR_ICONS] ?? ShieldCheck;
  const pct = factor.max > 0 ? Math.round((factor.earned / factor.max) * 100) : 0;
  const barColor =
    factor.verdict === "positive" ? "#10b981"
    : factor.verdict === "neutral" ? "#3b82f6"
    : "#ef4444";

  return (
    <div className="space-y-1.5 py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <IconComp
            className={`w-3.5 h-3.5 shrink-0 ${
              factor.verdict === "positive" ? "text-emerald-400"
              : factor.verdict === "neutral" ? "text-blue-400"
              : "text-red-400"
            }`}
            strokeWidth={1.8}
          />
          <span className="text-xs font-semibold text-white/80 truncate">{factor.name}</span>
        </div>
        <span className="text-xs font-mono font-bold text-white/50 shrink-0">
          {factor.earned}/{factor.max}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-white/6 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-snug pl-6">{factor.label}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ContractReputationCard({ data }: { data: ContractReputation }) {
  const tier = (data.tier in TIER_CONFIG ? data.tier : "new") as keyof typeof TIER_CONFIG;
  const cfg = TIER_CONFIG[tier];
  const TierIcon = cfg.icon;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-px flex-1 bg-white/8" />
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest px-2">
          Contract Reputation
        </span>
        <div className="h-px flex-1 bg-white/8" />
      </div>

      {/* Exploit banner — shown instead of full card */}
      {data.isExploited && data.exploitInfo && (
        <div className="bg-red-600/10 border border-red-600/30 rounded-2xl p-6 flex items-start gap-4">
          <div className="w-12 h-12 bg-red-600/15 border border-red-600/30 rounded-xl flex items-center justify-center shrink-0">
            <AlertOctagon className="w-6 h-6 text-red-500" strokeWidth={1.7} />
          </div>
          <div>
            <p className="text-base font-bold text-red-300 mb-1">⛔ Known Exploit Registry</p>
            <p className="text-sm font-semibold text-white mb-0.5">{data.exploitInfo.name}</p>
            <p className="text-sm text-red-200/70">
              {data.exploitInfo.lostUSD} lost · {data.exploitInfo.date}
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{data.summary}</p>
          </div>
        </div>
      )}

      {/* Main card — score + factors */}
      {!data.isExploited && (
        <div className={`bg-card/60 border ${cfg.border} rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl ${cfg.glow}`}>
          {/* Top section: gauge + tier */}
          <div className="flex items-center gap-6 p-6 border-b border-white/6">
            <ScoreGauge score={data.trustScore} ringColor={cfg.ring} />

            <div className="flex-1 min-w-0">
              {/* Tier badge */}
              <div className={`inline-flex items-center gap-2 ${cfg.bg} border ${cfg.border} rounded-full px-3 py-1 mb-3`}>
                <TierIcon className={`w-3.5 h-3.5 ${cfg.color}`} strokeWidth={1.8} />
                <span className={`text-xs font-mono font-black tracking-widest uppercase ${cfg.color}`}>
                  {data.tierLabel}
                </span>
              </div>

              <p className="text-xs text-muted-foreground mb-3 leading-snug">{data.tierDescription}</p>

              {/* Meta info pills */}
              <div className="flex flex-wrap gap-2">
                {data.deployedAt && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-white/5 border border-white/8 text-muted-foreground rounded-md px-2 py-1">
                    <Clock className="w-2.5 h-2.5" />
                    {data.ageInDays !== undefined
                      ? data.ageInDays < 365
                        ? `${Math.floor(data.ageInDays / 30) || data.ageInDays} ${data.ageInDays < 30 ? 'days' : 'months'} old`
                        : `${(data.ageInDays / 365).toFixed(1)}y old`
                      : new Date(data.deployedAt).getFullYear()}
                  </span>
                )}
                {data.txCountEstimate !== undefined && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-white/5 border border-white/8 text-muted-foreground rounded-md px-2 py-1">
                    <Activity className="w-2.5 h-2.5" />
                    {data.txCountEstimate >= 200 ? "200+" : data.txCountEstimate} txs
                  </span>
                )}
                {data.hasRecentActivity && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-emerald-500/8 border border-emerald-500/15 text-emerald-400 rounded-md px-2 py-1">
                    <TrendingUp className="w-2.5 h-2.5" />
                    Active
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Summary callout */}
          <div className="px-6 py-4 border-b border-white/5 bg-white/2">
            <p className="text-sm text-white/75 leading-relaxed italic">
              "{data.summary}"
            </p>
          </div>

          {/* Factor bars */}
          <div className="px-6 py-2">
            {data.factors.map((factor, i) => (
              <FactorRow key={i} factor={factor} />
            ))}
          </div>

          {/* Footer legend */}
          <div className="flex items-center gap-4 px-6 py-3 bg-white/1 border-t border-white/5">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Score breakdown</span>
            <div className="flex items-center gap-3 ml-auto">
              {[["positive", "#10b981", "Strong"], ["neutral", "#3b82f6", "Moderate"], ["negative", "#ef4444", "Weak"]].map(([v, c, l]) => (
                <div key={v} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
                  <span className="text-[10px] text-muted-foreground">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
