import { CheckCircle, AlertTriangle, XCircle, ArrowDownLeft, ArrowUpRight, Key, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import type { SimulationResult, SimulationAssetChange } from '@workspace/api-client-react';

const VERDICT_CONFIG = {
  safe: {
    icon: CheckCircle,
    label: 'Safe to Sign',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    glow: 'bg-emerald-400',
    emoji: '✅',
  },
  caution: {
    icon: AlertTriangle,
    label: 'Proceed with Caution',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    glow: 'bg-amber-400',
    emoji: '⚠️',
  },
  dangerous: {
    icon: XCircle,
    label: 'Do Not Sign',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    glow: 'bg-red-500',
    emoji: '🚨',
  },
} as const;

const DIRECTION_CONFIG = {
  lose: {
    icon: ArrowUpRight,
    label: 'You will lose',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    iconColor: 'text-red-400',
  },
  receive: {
    icon: ArrowDownLeft,
    label: 'You will receive',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    iconColor: 'text-emerald-400',
  },
  approve: {
    icon: Key,
    label: 'Permission granted',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    iconColor: 'text-amber-400',
  },
} as const;

function AssetChangeRow({ change, index }: { change: SimulationAssetChange; index: number }) {
  const dir = (change.direction as keyof typeof DIRECTION_CONFIG) in DIRECTION_CONFIG
    ? (change.direction as keyof typeof DIRECTION_CONFIG)
    : 'lose';
  const cfg = DIRECTION_CONFIG[dir];
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 + index * 0.08 }}
      className={`flex items-center gap-5 p-5 rounded-2xl border ${cfg.bg} ${cfg.border}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.bg} border ${cfg.border} shrink-0`}>
        <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <span className={`text-xs font-mono font-semibold uppercase tracking-wider ${cfg.color} block mb-1`}>
          {cfg.label}
        </span>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-white font-display font-bold text-xl">{change.amount}</span>
          <span className={`font-mono font-semibold text-base ${cfg.color}`}>{change.asset}</span>
          {change.usdValue && (
            <span className="text-white/40 font-mono text-sm">≈ {change.usdValue}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function SimulationResultView({ data }: { data: SimulationResult }) {
  const verdict = (data.verdict ?? 'caution') as keyof typeof VERDICT_CONFIG;
  const config = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.caution;
  const VerdictIcon = config.icon;

  const loses = data.assetChanges.filter(c => c.direction === 'lose');
  const receives = data.assetChanges.filter(c => c.direction === 'receive');
  const approves = data.assetChanges.filter(c => c.direction === 'approve');

  return (
    <div className="w-full space-y-6 animate-in fade-in zoom-in duration-700 fill-mode-both">

      {/* ── VERDICT BANNER ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative overflow-hidden rounded-3xl border ${config.bg} ${config.border} shadow-2xl p-8 flex flex-col sm:flex-row items-center gap-6`}
      >
        <div className={`absolute -top-8 -left-8 w-40 h-40 rounded-full blur-3xl opacity-20 ${config.glow}`} />
        <div className={`relative flex-shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center border ${config.border} ${config.bg}`}>
          <VerdictIcon className={`w-10 h-10 ${config.text}`} strokeWidth={1.5} />
        </div>
        <div className="relative flex-1 space-y-2 text-center sm:text-left">
          <span className={`text-xs font-mono font-bold tracking-widest uppercase px-3 py-1 rounded-full border inline-block ${config.border} ${config.bg} ${config.text}`}>
            Should I sign this?
          </span>
          <p className={`text-2xl md:text-3xl font-display font-bold ${config.text}`}>
            {config.emoji} {config.label}
          </p>
          <p className="text-white/70 text-base leading-relaxed">{data.verdictReason}</p>
        </div>
      </motion.div>

      {/* ── SUMMARY & INPUT TYPE ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card/80 border border-card-border rounded-3xl p-8 space-y-4 backdrop-blur-xl"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary rounded-full font-mono text-xs font-semibold tracking-wider">
            {data.inputType}
          </span>
          <span className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full font-mono text-xs text-muted-foreground tracking-wider">
            SIMULATION
          </span>
        </div>
        <p className="text-white text-xl md:text-2xl font-display font-semibold leading-snug">
          {data.summary}
        </p>
      </motion.div>

      {/* ── AFTER THIS TRANSACTION ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card/60 border border-card-border rounded-3xl p-8 space-y-5 backdrop-blur-sm"
      >
        <h3 className="font-display text-xl font-bold text-white flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          After this transaction
        </h3>

        {data.assetChanges.length === 0 ? (
          <p className="text-muted-foreground font-mono text-sm bg-black/40 p-4 rounded-xl border border-white/5">
            No direct asset changes detected.
          </p>
        ) : (
          <div className="space-y-3">
            {loses.length > 0 && loses.map((c, i) => (
              <AssetChangeRow key={`lose-${i}`} change={c} index={i} />
            ))}
            {receives.length > 0 && receives.map((c, i) => (
              <AssetChangeRow key={`receive-${i}`} change={c} index={loses.length + i} />
            ))}
            {approves.length > 0 && approves.map((c, i) => (
              <AssetChangeRow key={`approve-${i}`} change={c} index={loses.length + receives.length + i} />
            ))}
          </div>
        )}
      </motion.div>

      {/* ── PERMISSIONS GRANTED ── */}
      {data.permissionsGranted.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-8 space-y-5"
        >
          <h3 className="font-display text-xl font-bold text-amber-400 flex items-center gap-3">
            <Key className="w-5 h-5" /> Permissions Granted
          </h3>
          <ul className="space-y-3">
            {data.permissionsGranted.map((p, i) => (
              <li key={i} className="flex items-start gap-4 bg-black/40 p-4 rounded-xl border border-amber-500/10">
                <Key className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="text-sm text-white/90 font-mono leading-relaxed">{p}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* ── WARNINGS ── */}
      {data.warnings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-destructive/5 border border-destructive/20 rounded-3xl p-8 space-y-5"
        >
          <h3 className="font-display text-xl font-bold text-destructive flex items-center gap-3">
            <ShieldAlert className="w-5 h-5" /> Threat Vectors
          </h3>
          <ul className="space-y-3">
            {data.warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-4 bg-black/40 p-4 rounded-xl border border-destructive/10">
                <ShieldAlert className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <span className="text-sm text-white/90 leading-relaxed">{w}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}
