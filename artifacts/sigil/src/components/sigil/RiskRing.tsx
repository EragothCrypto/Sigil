import { motion } from 'framer-motion';

const RISK_CONFIG = {
  low:      { color: '#10b981', label: 'LOW',      shadow: 'rgba(16,185,129,0.3)' },
  medium:   { color: '#f59e0b', label: 'MEDIUM',   shadow: 'rgba(245,158,11,0.3)' },
  high:     { color: '#f97316', label: 'HIGH',     shadow: 'rgba(249,115,22,0.3)' },
  critical: { color: '#f43f5e', label: 'CRITICAL', shadow: 'rgba(244,63,94,0.3)' },
};

function getRiskConfig(score: number, level: string) {
  const levelKey = level?.toLowerCase() as keyof typeof RISK_CONFIG;
  if (RISK_CONFIG[levelKey]) return RISK_CONFIG[levelKey];
  if (score <= 25) return RISK_CONFIG.low;
  if (score <= 50) return RISK_CONFIG.medium;
  if (score <= 75) return RISK_CONFIG.high;
  return RISK_CONFIG.critical;
}

export function RiskRing({ score, level }: { score: number; level: string }) {
  const R = 52;
  const strokeW = 7;
  const circ = 2 * Math.PI * R;
  const offset = circ - (score / 100) * circ;
  const cfg = getRiskConfig(score, level);
  const cx = 70;

  return (
    <div className="relative flex flex-col items-center gap-3 shrink-0">
      <div className="relative">
        {/* Outer glow ring */}
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-20"
          style={{ background: cfg.color }}
        />
        <svg width={cx * 2} height={cx * 2} viewBox={`0 0 ${cx * 2} ${cx * 2}`} className="relative">
          {/* Track */}
          <circle
            cx={cx} cy={cx} r={R}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={strokeW}
          />
          {/* Progress */}
          <motion.circle
            cx={cx} cy={cx} r={R}
            fill="none"
            stroke={cfg.color}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            transform={`rotate(-90 ${cx} ${cx})`}
            style={{ filter: `drop-shadow(0 0 8px ${cfg.shadow})` }}
          />

          {/* Score label */}
          <text
            x={cx} y={cx - 4}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="26"
            fontWeight="700"
            fontFamily="'Space Grotesk', sans-serif"
          >
            {score}
          </text>
          <text
            x={cx} y={cx + 16}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(255,255,255,0.3)"
            fontSize="8"
            fontWeight="600"
            fontFamily="'JetBrains Mono', monospace"
            letterSpacing="1.5"
          >
            RISK SCORE
          </text>
        </svg>
      </div>

      <div
        className="px-3 py-1 rounded-full font-mono text-xs font-bold tracking-widest uppercase border"
        style={{ color: cfg.color, borderColor: `${cfg.color}30`, background: `${cfg.color}12` }}
      >
        {cfg.label} RISK
      </div>
    </div>
  );
}
