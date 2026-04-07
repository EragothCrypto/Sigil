import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck, Activity, Cpu, Zap, X } from 'lucide-react';

export type StreamPhase =
  | { kind: 'idle' }
  | { kind: 'step1'; label: string }
  | { kind: 'streaming'; estimatedScore: number; signalCount: number; riskSignals: string[]; summaryText: string; stepLabel: string }
  | { kind: 'error'; message: string };

interface Props {
  phase: StreamPhase;
  onCancel: () => void;
}

function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score > 75 ? '#f87171' : score > 50 ? '#fb923c' : score > 25 ? '#facc15' : '#4ade80';

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={6} fill="none" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={color} strokeWidth={6} fill="none"
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - fill }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}

function VerdictIcon({ score }: { score: number }) {
  if (score > 60) return <ShieldAlert className="w-5 h-5 text-rose-400" />;
  if (score > 25) return <Shield className="w-5 h-5 text-orange-400" />;
  return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
}

function verdictFromScore(score: number) {
  if (score > 60) return { label: 'DANGEROUS', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/25' };
  if (score > 25) return { label: 'CAUTION', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/25' };
  return { label: 'SAFE', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25' };
}

function BlinkingCursor() {
  return (
    <motion.span
      className="inline-block w-0.5 h-4 bg-violet-400 ml-0.5 align-middle"
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
    />
  );
}

export function StreamingAnalysisView({ phase, onCancel }: Props) {
  const summaryRef = useRef<HTMLDivElement>(null);

  // Auto-scroll summary as tokens arrive
  useEffect(() => {
    if (summaryRef.current) {
      summaryRef.current.scrollTop = summaryRef.current.scrollHeight;
    }
  }, [phase.kind === 'streaming' ? (phase as Extract<StreamPhase, { kind: 'streaming' }>).summaryText : null]);

  if (phase.kind === 'idle') return null;

  return (
    <motion.div
      key="streaming-view"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-2xl mx-auto"
    >
      <div
        className="relative rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(10, 6, 24, 0.95)',
          boxShadow: '0 0 0 1px rgba(139,92,246,0.15), 0 30px 80px -10px rgba(139,92,246,0.18), 0 0 80px -20px rgba(139,92,246,0.08)',
        }}
      >
        {/* Top shimmer */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

        {/* Cancel button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/4 hover:bg-white/8 flex items-center justify-center text-white/30 hover:text-white/60 transition-all z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-8 space-y-7">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <motion.div
                className="absolute inset-0 rounded-2xl border border-primary/30"
                animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
              />
            </div>
            <div>
              <h2 className="font-display font-bold text-white text-lg leading-tight">Analyzing</h2>
              <p className="text-xs text-white/35 font-mono">Sigil Security Engine</p>
            </div>
          </div>

          {/* Step pills */}
          <div className="flex items-center gap-2">
            {[
              { n: 1, label: 'Gather signals', icon: Cpu },
              { n: 2, label: 'Generate verdict', icon: Zap },
            ].map(({ n, label, icon: Icon }) => {
              const currentStep = phase.kind === 'step1' ? 1 : phase.kind === 'streaming' ? 2 : 0;
              const isDone = n < currentStep;
              const isActive = n === currentStep;
              return (
                <div
                  key={n}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono transition-all duration-500 ${
                    isActive
                      ? 'bg-primary/12 border-primary/30 text-primary'
                      : isDone
                      ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400/70'
                      : 'bg-white/3 border-white/8 text-white/25'
                  }`}
                >
                  {isDone ? (
                    <span className="text-emerald-400 text-[10px]">✓</span>
                  ) : isActive ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Icon className="w-3 h-3" />
                    </motion.div>
                  ) : (
                    <Icon className="w-3 h-3 opacity-30" />
                  )}
                  {label}
                </div>
              );
            })}
          </div>

          {/* Step 1 state */}
          <AnimatePresence mode="wait">
            {phase.kind === 'step1' && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 text-sm text-white/40 font-mono">
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-primary"
                    animate={{ opacity: [1, 0.3] }}
                    transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
                  />
                  {phase.label}
                </div>
                {/* Shimmer placeholder rows */}
                <div className="space-y-2">
                  {[80, 60, 90, 50].map((w, i) => (
                    <motion.div
                      key={i}
                      className="h-2.5 rounded-full bg-white/4"
                      style={{ width: `${w}%` }}
                      animate={{ opacity: [0.4, 0.8, 0.4] }}
                      transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Streaming state */}
            {phase.kind === 'streaming' && (
              <motion.div
                key="streaming"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-5"
              >
                {/* Verdict + score */}
                <div className="flex items-center gap-5">
                  <div className="relative flex items-center justify-center">
                    <ScoreRing score={phase.estimatedScore} size={88} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-mono font-bold text-xl text-white leading-none">
                        {phase.estimatedScore}
                      </span>
                      <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest mt-0.5">
                        Risk
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 flex-1 min-w-0">
                    {(() => {
                      const v = verdictFromScore(phase.estimatedScore);
                      return (
                        <motion.div
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4 }}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${v.bg} ${v.border}`}
                        >
                          <VerdictIcon score={phase.estimatedScore} />
                          <span className={`font-mono font-bold text-sm ${v.color}`}>{v.label}</span>
                        </motion.div>
                      );
                    })()}
                    {phase.signalCount > 0 && (
                      <p className="text-xs text-white/30 font-mono">
                        {phase.signalCount} security signal{phase.signalCount !== 1 ? 's' : ''} identified
                      </p>
                    )}
                  </div>
                </div>

                {/* Risk signal preview */}
                {phase.riskSignals.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                    className="space-y-1.5"
                  >
                    {phase.riskSignals.slice(0, 2).map((sig, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                        className="flex items-start gap-2 text-xs text-white/35 font-mono"
                      >
                        <span className="text-rose-400/50 mt-0.5 shrink-0">⚑</span>
                        <span className="leading-relaxed line-clamp-2">{sig}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {/* Streaming summary */}
                <div
                  ref={summaryRef}
                  className="rounded-2xl border border-white/6 bg-white/2 p-4 min-h-[60px] max-h-[120px] overflow-hidden"
                >
                  {phase.summaryText ? (
                    <p className="text-sm text-white/75 leading-relaxed font-sans">
                      {phase.summaryText}
                      <BlinkingCursor />
                    </p>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-white/25 font-mono">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                      >
                        <Zap className="w-3 h-3 text-primary/50" />
                      </motion.div>
                      Generating verdict…
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Error state */}
            {phase.kind === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 bg-rose-500/8 border border-rose-500/20 rounded-xl text-rose-400/80 font-mono text-sm"
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                {phase.message}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
