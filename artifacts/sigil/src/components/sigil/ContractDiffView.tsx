import { useState } from 'react';
import { GitCompare, ChevronDown, ChevronRight, Plus, Minus, Minus as Equal, ShieldAlert, AlertTriangle, Info, Loader2 } from 'lucide-react';

interface AbiFunction {
  name: string;
  signature: string;
  stateMutability: string;
  inputs: { name: string; type: string }[];
}

type DiffRisk = 'critical' | 'high' | 'medium' | 'low' | 'info';

interface DiffEntry {
  status: 'added' | 'removed' | 'unchanged';
  fn: AbiFunction;
  risk: DiffRisk;
  riskReason?: string;
}

interface UpgradeEvent {
  implementation: string;
  txHash: string;
  blockNumber: string;
}

interface DiffResult {
  isProxy: boolean;
  proxyAddress: string;
  currentImplementation?: string;
  previousImplementation?: string;
  currentImplName?: string;
  previousImplName?: string;
  upgradeHistory: UpgradeEvent[];
  diff: DiffEntry[];
  addedCount: number;
  removedCount: number;
  riskySummary: string[];
  analysisNote: string;
}

const RISK_CONFIG: Record<DiffRisk, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'Critical', color: 'text-rose-400', bg: 'bg-rose-500/8', border: 'border-rose-500/25' },
  high:     { label: 'High',     color: 'text-orange-400', bg: 'bg-orange-500/8', border: 'border-orange-500/25' },
  medium:   { label: 'Medium',   color: 'text-amber-400', bg: 'bg-amber-500/8', border: 'border-amber-500/25' },
  low:      { label: 'Low',      color: 'text-blue-400', bg: 'bg-blue-500/8', border: 'border-blue-500/25' },
  info:     { label: '',         color: 'text-white/30', bg: '', border: '' },
};

function shortAddr(addr: string) {
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

function FnRow({ entry, showUnchanged }: { entry: DiffEntry; showUnchanged: boolean }) {
  const [open, setOpen] = useState(false);
  if (entry.status === 'unchanged' && !showUnchanged) return null;

  const isAdded = entry.status === 'added';
  const isRemoved = entry.status === 'removed';
  const risk = RISK_CONFIG[entry.risk];

  const rowBg = isAdded
    ? 'bg-emerald-500/4 border-emerald-500/12 hover:bg-emerald-500/7'
    : isRemoved
    ? 'bg-rose-500/4 border-rose-500/12 hover:bg-rose-500/7'
    : 'bg-white/2 border-white/5 hover:bg-white/3';

  const prefixColor = isAdded ? 'text-emerald-400' : isRemoved ? 'text-rose-400' : 'text-white/20';
  const prefix = isAdded ? '+' : isRemoved ? '−' : ' ';

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all text-left ${rowBg}`}
      >
        <span className={`font-mono text-sm font-bold w-4 shrink-0 ${prefixColor}`}>{prefix}</span>
        <span className="font-mono text-sm text-white/80 flex-1 truncate">{entry.fn.signature}</span>

        <span className={`shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider border ${risk.bg} ${risk.border} ${risk.color}`}>
          {entry.fn.stateMutability}
        </span>

        {entry.risk !== 'info' && (
          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${risk.bg} ${risk.border} ${risk.color}`}>
            {risk.label}
          </span>
        )}

        {(entry.riskReason || entry.fn.inputs.length > 0) && (
          open ? <ChevronDown className="w-3.5 h-3.5 text-white/20 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-white/20 shrink-0" />
        )}
      </button>

      {open && (
        <div className="mx-4 mb-1 px-4 py-3 rounded-b-xl bg-white/2 border border-t-0 border-white/5 space-y-2">
          {entry.riskReason && (
            <div className={`flex items-start gap-2 text-xs ${risk.color}`}>
              <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{entry.riskReason}</span>
            </div>
          )}
          {entry.fn.inputs.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] text-white/25 uppercase tracking-widest font-mono">Parameters</span>
              {entry.fn.inputs.map((inp, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="font-mono text-xs text-primary/70">{inp.type}</span>
                  <span className="font-mono text-xs text-white/40">{inp.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ContractDiffView({ address, network }: { address: string; network: string }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiffResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUnchanged, setShowUnchanged] = useState(false);

  const load = async () => {
    if (result) { setExpanded(!expanded); return; }
    setExpanded(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sigil/contract-diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, network }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as DiffResult;
      setResult(data);
    } catch (err) {
      setError('Failed to load upgrade diff. The contract may not be an upgradeable proxy.');
    } finally {
      setLoading(false);
    }
  };

  const addedEntries = result?.diff.filter(e => e.status === 'added') ?? [];
  const removedEntries = result?.diff.filter(e => e.status === 'removed') ?? [];
  const unchangedEntries = result?.diff.filter(e => e.status === 'unchanged') ?? [];

  const hasHighRisk = addedEntries.some(e => e.risk === 'critical' || e.risk === 'high');

  return (
    <div className="rounded-2xl border border-white/6 overflow-hidden" style={{ background: 'rgba(139,92,246,0.03)' }}>
      <button
        onClick={load}
        className="w-full flex items-center gap-3 px-6 py-4 hover:bg-white/3 transition-all group text-left"
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center">
          <GitCompare className="w-4.5 h-4.5 text-primary" strokeWidth={1.7} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-white/85 text-sm">What Changed?</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/8 border border-primary/15 text-primary uppercase tracking-wider">Upgrade Diff</span>
          </div>
          <p className="text-xs text-white/30 mt-0.5">Compare proxy implementations · Highlight risky changes</p>
        </div>
        {loading ? (
          <Loader2 className="w-4 h-4 text-white/30 animate-spin shrink-0" />
        ) : expanded ? (
          <ChevronDown className="w-4 h-4 text-white/30 shrink-0 group-hover:text-white/50 transition-colors" />
        ) : (
          <ChevronRight className="w-4 h-4 text-white/30 shrink-0 group-hover:text-white/50 transition-colors" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-white/5 px-6 py-5 space-y-5">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-8 text-white/30">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Checking proxy storage slots and fetching upgrade history…</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/3 border border-white/8">
              <Info className="w-4 h-4 text-white/30 mt-0.5 shrink-0" />
              <p className="text-sm text-white/40">{error}</p>
            </div>
          )}

          {result && !result.isProxy && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/3 border border-white/8">
              <Info className="w-4 h-4 text-white/30 mt-0.5 shrink-0" />
              <p className="text-sm text-white/50">{result.analysisNote}</p>
            </div>
          )}

          {result && result.isProxy && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-white/3 border border-white/6 space-y-1">
                  <span className="text-[10px] text-white/25 font-mono uppercase tracking-widest">Previous Implementation</span>
                  <div className="font-mono text-xs text-white/50">
                    {result.previousImplementation ? shortAddr(result.previousImplementation) : <span className="text-white/20">First deployment</span>}
                  </div>
                  {result.previousImplName && (
                    <div className="text-xs text-primary/70 font-display">{result.previousImplName}</div>
                  )}
                </div>
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 space-y-1">
                  <span className="text-[10px] text-white/25 font-mono uppercase tracking-widest">Current Implementation</span>
                  <div className="font-mono text-xs text-white/70">
                    {result.currentImplementation ? shortAddr(result.currentImplementation) : '—'}
                  </div>
                  {result.currentImplName && (
                    <div className="text-xs text-primary font-display">{result.currentImplName}</div>
                  )}
                </div>
              </div>

              {result.upgradeHistory.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] text-white/25 font-mono uppercase tracking-widest">Upgrade History ({result.upgradeHistory.length} total)</h4>
                  <div className="space-y-1.5 max-h-[14vh] overflow-y-auto pr-1">
                    {result.upgradeHistory.map((ev, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/2 border border-white/5">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${i === result.upgradeHistory.length - 1 ? 'bg-primary' : 'bg-white/15'}`} />
                        <span className="font-mono text-xs text-white/50 truncate flex-1">{shortAddr(ev.implementation)}</span>
                        <span className="font-mono text-[10px] text-white/25 shrink-0">block {ev.blockNumber}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.riskySummary.length > 0 && (
                <div className={`p-4 rounded-xl border space-y-2 ${hasHighRisk ? 'bg-rose-500/5 border-rose-500/15' : 'bg-amber-500/5 border-amber-500/15'}`}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 ${hasHighRisk ? 'text-rose-400' : 'text-amber-400'}`} strokeWidth={1.7} />
                    <span className={`text-xs font-bold font-display ${hasHighRisk ? 'text-rose-400' : 'text-amber-400'}`}>Security Analysis</span>
                  </div>
                  {result.riskySummary.map((note, i) => (
                    <p key={i} className="text-xs text-white/55 leading-relaxed">{note}</p>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] text-white/25 font-mono uppercase tracking-widest">
                    Function Diff — {addedEntries.length} added · {removedEntries.length} removed
                  </h4>
                  {unchangedEntries.length > 0 && (
                    <button
                      onClick={() => setShowUnchanged(!showUnchanged)}
                      className="text-[10px] text-white/30 hover:text-white/50 font-mono transition-colors"
                    >
                      {showUnchanged ? 'Hide' : 'Show'} {unchangedEntries.length} unchanged
                    </button>
                  )}
                </div>

                {result.diff.length === 0 && (
                  <p className="text-xs text-white/30 text-center py-4">{result.analysisNote || 'No function-level diff available — implementations may not be verified.'}</p>
                )}

                <div className="space-y-1.5">
                  {result.diff.map((entry, i) => (
                    <FnRow key={i} entry={entry} showUnchanged={showUnchanged} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
