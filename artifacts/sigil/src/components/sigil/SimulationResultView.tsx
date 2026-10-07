import type { SimulationResultV2 } from '@workspace/api-client-react';
import { AlertTriangle, FlaskConical } from 'lucide-react';

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const QUANTITY = /^0x(?:0|[1-9a-fA-F][0-9a-fA-F]{0,63})$/;
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
export function isExecutionReport(value: unknown): value is SimulationResultV2 {
  if (!object(value) || value.reportVersion !== 'execution-check-v2') return false;
  if (!['call_check', 'advisory_only', 'unavailable'].includes(String(value.assessmentStatus))) return false;
  const keys = ['reportVersion', 'network', 'assessmentStatus', 'summary', 'capabilities', 'limitations'];
  if (value.assessmentStatus === 'call_check') keys.push('callCheck');
  if (Object.keys(value).length !== keys.length || Object.keys(value).some(key => !keys.includes(key))) return false;
  if (typeof value.network !== 'string' || typeof value.summary !== 'string' || value.summary.length > 2048
    || !Array.isArray(value.limitations) || value.limitations.length > 8
    || !value.limitations.every(item => typeof item === 'string' && item.length <= 2048)) return false;
  const caps = value.capabilities;
  const missing = ['internalTraces', 'walletBalanceDeltas', 'storageSimulation', 'permissionState', 'historicalArchive'];
  if (!object(caps) || Object.keys(caps).length !== 6 || typeof caps.readOnlyCall !== 'boolean'
    || !missing.every(key => caps[key] === false)) return false;
  if (value.assessmentStatus === 'call_check') {
    const call = value.callCheck;
    if (!object(call) || call.outcome !== 'success' || typeof call.blockNumber !== 'string' || !QUANTITY.test(call.blockNumber)
      || typeof call.to !== 'string' || !ADDRESS.test(call.to)
      || (call.from !== undefined && (typeof call.from !== 'string' || !ADDRESS.test(call.from)))
      || Object.keys(call).length !== (call.from === undefined ? 3 : 4)) return false;
  }
  return true;
}

export function SimulationResultView({ data }: { data: unknown }) {
  if (!isExecutionReport(data)) return (
    <div role="alert" className="py-6 text-amber-400">
      Execution evidence unavailable. No remote outcome or signing clearance established.
    </div>
  );
  const title = data.assessmentStatus === 'call_check' ? 'Read-only call completed'
    : data.assessmentStatus === 'advisory_only' ? 'Advisory only' : 'Check unavailable';
  return (
    <div className="space-y-6 text-white/80">
      <section className="border-b border-white/10 py-6 space-y-3">
        <h2 className="flex items-center gap-3 text-xl font-semibold text-white"><FlaskConical className="w-5 h-5" />{title}</h2>
        <p>{data.summary}</p>
        <p className="text-sm text-white/50">{data.network} | {data.reportVersion}</p>
        {data.assessmentStatus === 'call_check' && (
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm font-mono">
            <dt>Outcome</dt><dd>{data.callCheck.outcome}</dd>
            <dt>Pinned block</dt><dd className="break-all">{data.callCheck.blockNumber}</dd>
            <dt>Destination</dt><dd className="break-all">{data.callCheck.to}</dd>
            <dt>Caller</dt><dd className="break-all">{data.callCheck.from || 'Provider default (not wallet-bound)'}</dd>
          </dl>
        )}
      </section>
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 font-semibold text-amber-400"><AlertTriangle className="w-4 h-4" />Coverage limits</h3>
        <ul className="list-disc pl-5 space-y-2 text-sm">{data.limitations.map((item, i) => <li key={i}>{item}</li>)}</ul>
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 text-sm">
          {Object.entries(data.capabilities).map(([key, available]) => (
            <div key={key} className="contents"><dt className="break-words">{key}</dt><dd>{available ? 'Supported check' : 'Unavailable'}</dd></div>
          ))}
        </dl>
      </section>
    </div>
  );
}
