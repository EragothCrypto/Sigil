import { useState } from 'react';
import { ChevronDown, ChevronUp, ShieldAlert, Bug, Skull, Flame, Zap, AlertTriangle, Eye } from 'lucide-react';
import type { PatternMatch, PatternType, PatternConfidence } from '@workspace/api-client-react';
import { JargonText } from './JargonTooltip';

// ── Config ─────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<PatternType, {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
}> = {
  drainer: {
    label: 'Wallet Drainer',
    icon: Skull,
    color: 'text-rose-400',
    bg: 'bg-rose-500/8',
    border: 'border-rose-500/20',
  },
  honeypot: {
    label: 'Honeypot',
    icon: Bug,
    color: 'text-orange-400',
    bg: 'bg-orange-500/8',
    border: 'border-orange-500/20',
  },
  fake_approval: {
    label: 'Fake Approval',
    icon: ShieldAlert,
    color: 'text-rose-400',
    bg: 'bg-rose-500/8',
    border: 'border-rose-500/20',
  },
  rug_pull: {
    label: 'Rug Pull',
    icon: Flame,
    color: 'text-amber-400',
    bg: 'bg-amber-500/8',
    border: 'border-amber-500/20',
  },
  phishing: {
    label: 'Phishing',
    icon: Eye,
    color: 'text-purple-400',
    bg: 'bg-purple-500/8',
    border: 'border-purple-500/20',
  },
  flash_loan: {
    label: 'Flash Loan Attack',
    icon: Zap,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/8',
    border: 'border-yellow-500/20',
  },
  suspicious: {
    label: 'Suspicious',
    icon: AlertTriangle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/8',
    border: 'border-amber-500/20',
  },
};

const CONFIDENCE_CONFIG: Record<PatternConfidence, {
  label: string;
  barWidth: string;
  color: string;
  barColor: string;
}> = {
  confirmed: { label: 'Confirmed', barWidth: 'w-full',  color: 'text-rose-400',   barColor: 'bg-rose-500' },
  high:      { label: 'High',      barWidth: 'w-3/4',   color: 'text-orange-400', barColor: 'bg-orange-500' },
  medium:    { label: 'Medium',    barWidth: 'w-1/2',   color: 'text-amber-400',  barColor: 'bg-amber-500' },
  low:       { label: 'Low',       barWidth: 'w-1/4',   color: 'text-yellow-400', barColor: 'bg-yellow-500' },
};

// ── Single pattern row ──────────────────────────────────────────────────────

function PatternRow({ pattern }: { pattern: PatternMatch }) {
  const [expanded, setExpanded] = useState(false);
  const typeCfg = TYPE_CONFIG[pattern.type] ?? TYPE_CONFIG.suspicious;
  const confCfg = CONFIDENCE_CONFIG[pattern.confidence] ?? CONFIDENCE_CONFIG.medium;
  const Icon = typeCfg.icon;

  return (
    <div className={`rounded-xl border ${typeCfg.border} ${typeCfg.bg} overflow-hidden`}>
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:brightness-110 transition-all group"
      >
        {/* Icon */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${typeCfg.border} ${typeCfg.bg}`}>
          <Icon className={`w-4 h-4 ${typeCfg.color}`} strokeWidth={1.7} />
        </div>

        {/* Name + type badge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-semibold text-white/90 text-sm">{pattern.name}</span>
            <span className={`text-[9px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border ${typeCfg.border} ${typeCfg.color} ${typeCfg.bg}`}>
              {typeCfg.label}
            </span>
          </div>

          {/* Confidence bar */}
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 max-w-[80px] h-1 bg-white/5 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${confCfg.barWidth} ${confCfg.barColor} transition-all`} />
            </div>
            <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${confCfg.color}`}>
              {confCfg.label}
            </span>
          </div>
        </div>

        {/* Expand toggle */}
        <div className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center border border-white/8 bg-white/3 group-hover:border-white/15 transition-colors`}>
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5 text-white/40" />
            : <ChevronDown className="w-3.5 h-3.5 text-white/40" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          {/* Description */}
          <p className="text-sm text-white/65 leading-relaxed"><JargonText text={pattern.description} /></p>

          {/* Indicators */}
          {pattern.indicators.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-mono font-bold text-white/25 uppercase tracking-widest">Matched Signals</p>
              <ul className="space-y-1">
                {pattern.indicators.map((ind, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className={`text-xs mt-0.5 ${typeCfg.color} flex-shrink-0`}>›</span>
                    <span className="text-xs text-white/55 leading-snug font-mono">{ind}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Historical context */}
          {pattern.historicalContext && (
            <div className={`rounded-lg px-3 py-2.5 border ${typeCfg.border} ${typeCfg.bg}`}>
              <p className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-widest mb-1">Historical Context</p>
              <p className="text-xs text-white/55 leading-relaxed italic">{pattern.historicalContext}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────

export function PatternDetectionCard({ patterns }: { patterns: PatternMatch[] }) {
  if (!patterns || patterns.length === 0) return null;

  // Severity summary
  const hasCritical = patterns.some((p) =>
    p.confidence === 'confirmed' || p.type === 'drainer' || p.type === 'fake_approval'
  );
  const hasHoneypot = patterns.some((p) => p.type === 'honeypot');

  return (
    <div className="rounded-2xl border border-rose-500/15 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-3 bg-rose-500/5 border-b border-rose-500/12">
        <div className="w-8 h-8 rounded-lg bg-rose-500/12 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
          <ShieldAlert className="w-4 h-4 text-rose-400" strokeWidth={1.7} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-rose-300 text-sm">Pattern Detection</h3>
            <span className="text-[9px] font-mono bg-rose-500/15 border border-rose-500/25 text-rose-400 px-2 py-0.5 rounded-full font-bold tracking-wider">
              {patterns.length} {patterns.length === 1 ? 'MATCH' : 'MATCHES'}
            </span>
          </div>
          <p className="text-xs text-white/30 mt-0.5">
            {hasCritical
              ? 'Signatures matching known wallet-draining exploits detected'
              : hasHoneypot
              ? 'Behavioral patterns consistent with honeypot token schemes detected'
              : 'Suspicious behavioral patterns detected — review carefully'}
          </p>
        </div>
      </div>

      {/* Pattern rows */}
      <div className="p-3 space-y-2 bg-rose-500/2">
        {patterns.map((pattern) => (
          <PatternRow key={pattern.id} pattern={pattern} />
        ))}
      </div>
    </div>
  );
}
