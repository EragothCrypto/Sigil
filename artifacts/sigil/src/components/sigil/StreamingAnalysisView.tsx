import { Activity, CheckCircle2, LoaderCircle, ShieldAlert, X } from 'lucide-react';

export type StreamPhase =
  | { kind: 'idle' }
  | { kind: 'step1'; label: string }
  | { kind: 'validating'; label: string }
  | { kind: 'error'; message: string };

interface Props { phase: StreamPhase; onCancel: () => void }

export function StreamingAnalysisView({ phase, onCancel }: Props) {
  if (phase.kind === 'idle') return null;
  const currentStep = phase.kind === 'step1' ? 1 : phase.kind === 'validating' ? 2 : 0;
  return (
    <section className="relative w-full max-w-2xl mx-auto border-y border-white/10 py-8 space-y-6" aria-live="polite" aria-busy={phase.kind !== 'error'}>
      <button onClick={onCancel} aria-label="Cancel analysis" title="Cancel analysis" className="absolute top-6 right-0 w-8 h-8 flex items-center justify-center text-white/40 hover:text-white">
        <X className="w-4 h-4" />
      </button>
      <h2 className="flex items-center gap-3 text-lg font-semibold text-white"><Activity className="w-5 h-5 text-primary" />Analyzing</h2>
      <ol className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
        {[{step: 1, label: 'Check evidence'}, {step: 2, label: 'Validate findings'}].map(item => (
          <li key={item.step} className={`flex items-center gap-2 ${item.step === currentStep ? 'text-white/80' : 'text-white/35'}`}>
            {item.step < currentStep ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <LoaderCircle className={`w-4 h-4 ${item.step === currentStep ? 'animate-spin' : ''}`} />}
            {item.label}
          </li>
        ))}
      </ol>
      {phase.kind === 'error' ? (
        <p role="alert" className="flex items-start gap-3 text-sm text-rose-300 break-words"><ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />{phase.message}</p>
      ) : <p className="text-sm text-white/50">{phase.label}</p>}
    </section>
  );
}
