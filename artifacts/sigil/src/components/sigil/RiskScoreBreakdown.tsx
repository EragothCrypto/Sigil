import { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { JargonText } from './JargonTooltip';

interface ScoreFactor {
  label: string;
  delta: number;
  severity: 'critical' | 'high' | 'medium' | 'positive';
  category: string;
  detail?: string;
}

const SEVERITY_STYLE = {
  critical: { bar: '#f43f5e', text: 'text-rose-400',   badge: 'bg-rose-500/10 border-rose-500/20 text-rose-400' },
  high:     { bar: '#f97316', text: 'text-orange-400', badge: 'bg-orange-500/10 border-orange-500/20 text-orange-400' },
  medium:   { bar: '#f59e0b', text: 'text-amber-400',  badge: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
  positive: { bar: '#10b981', text: 'text-emerald-400', badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
};

function FactorRow({ factor, maxDelta }: { factor: ScoreFactor; maxDelta: number }) {
  const [showDetail, setShowDetail] = useState(false);
  const style = SEVERITY_STYLE[factor.severity];
  const isPositive = factor.delta < 0;
  const barPct = Math.min((Math.abs(factor.delta) / Math.max(maxDelta, 1)) * 100, 100);
  const sign = isPositive ? '−' : '+';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        {/* Delta badge */}
        <div className={`shrink-0 w-14 text-center font-mono text-xs font-bold px-2 py-1 rounded-lg border ${style.badge}`}>
          {sign}{Math.abs(factor.delta)}
        </div>

        {/* Label + bar */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-white/75 font-display leading-none truncate">{factor.label}</span>
            {factor.detail && (
              <button
                onClick={() => setShowDetail(!showDetail)}
                className="shrink-0 text-white/20 hover:text-white/50 transition-colors"
                aria-label="More info"
              >
                <Info className="w-3 h-3" />
              </button>
            )}
          </div>
          {/* Progress bar */}
          <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${barPct}%`,
                background: style.bar,
                opacity: 0.7,
              }}
            />
          </div>
        </div>
      </div>

      {showDetail && factor.detail && (
        <div className="ml-[4.25rem] px-3 py-2 rounded-lg bg-white/3 border border-white/6">
          <p className="text-xs text-white/45 leading-relaxed"><JargonText text={factor.detail} /></p>
        </div>
      )}
    </div>
  );
}

export function RiskScoreBreakdown({
  factors,
  riskScore,
}: {
  factors: ScoreFactor[];
  riskScore: number;
}) {
  const [expanded, setExpanded] = useState(true);

  if (!factors || factors.length === 0) return null;

  const raising = factors.filter((f) => f.delta > 0);
  const lowering = factors.filter((f) => f.delta < 0);
  const maxDelta = Math.max(...factors.map((f) => Math.abs(f.delta)), 1);

  const totalRaising = raising.reduce((s, f) => s + f.delta, 0);
  const totalLowering = Math.abs(lowering.reduce((s, f) => s + f.delta, 0));

  return (
    <div
      className="rounded-2xl border border-white/6 overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/2 transition-all group"
      >
        <div className="flex items-center gap-3">
          <span className="font-display font-semibold text-sm text-white/70">Score Breakdown</span>
          <div className="flex items-center gap-1.5">
            {raising.length > 0 && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-rose-500/8 border border-rose-500/15 text-rose-400">
                +{totalRaising} risk
              </span>
            )}
            {lowering.length > 0 && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/8 border border-emerald-500/15 text-emerald-400">
                −{totalLowering} mitigated
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-white/20 uppercase tracking-wider">
            {factors.length} factor{factors.length !== 1 ? 's' : ''}
          </span>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
            : <ChevronDown className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
          }
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/5 px-5 py-4 space-y-5">
          {/* How is this score calculated? */}
          <p className="text-xs text-white/25 leading-relaxed">
            Sigil's AI evaluates transaction intent and context to assign a risk score from 0 (safe) to 100 (critical). The factors below explain what drove the score to <span className="text-white/50 font-mono font-bold">{riskScore}</span>.
            Tap <Info className="inline w-3 h-3 relative -top-px" /> on any factor for details.
          </p>

          {/* Risk-raising factors */}
          {raising.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-mono uppercase tracking-widest text-white/25 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-rose-500/60" />
                Factors raising risk
              </h4>
              <div className="space-y-3">
                {raising.map((f, i) => (
                  <FactorRow key={i} factor={f} maxDelta={maxDelta} />
                ))}
              </div>
            </div>
          )}

          {/* Risk-lowering factors */}
          {lowering.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-mono uppercase tracking-widest text-white/25 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500/60" />
                Factors lowering risk
              </h4>
              <div className="space-y-3">
                {lowering.map((f, i) => (
                  <FactorRow key={i} factor={f} maxDelta={maxDelta} />
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] text-white/15 font-mono border-t border-white/5 pt-3">
            Final score is AI-determined. Factors are computed deterministically from on-chain data.
          </p>
        </div>
      )}
    </div>
  );
}
