import { getEvidenceEndpoints } from './ethereum.js';

export interface EvidenceRpc {
  call(method: string, params: unknown[], acceptResult?: (value: unknown) => boolean): Promise<unknown>;
  readonly attempts: number;
}
const METHODS = new Set(['eth_blockNumber', 'eth_getCode', 'eth_getStorageAt', 'eth_call', 'eth_chainId']);
const MAX_BYTES = 512 * 1024;
// 32KiB calldata is hex-encoded; reserve bounded JSON/address/quantity overhead.
const MAX_INPUT_BYTES = 68 * 1024;
export async function boundedRpcJson(response: Response): Promise<unknown> {
  if (!response.ok || !response.body) throw new Error('Evidence response unavailable');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0; let body = '';
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) throw new Error('Evidence response exceeds budget');
      body += decoder.decode(value, {stream: true});
    }
    body += decoder.decode();
    return JSON.parse(body) as unknown;
  } finally { await reader.cancel().catch(() => {}); }
}
export function createEvidenceRpc(network: string, signal?: AbortSignal): EvidenceRpc {
  const endpoints = getEvidenceEndpoints(network).slice(0, 2);
  const deadline = AbortSignal.timeout(20000);
  let attempts = 0;
  return {
    get attempts() { return attempts; },
    async call(method, params, acceptResult) {
      if (!METHODS.has(method) || !Array.isArray(params)) throw new Error('Unsupported evidence query');
      const serialized = JSON.stringify(params);
      if (new TextEncoder().encode(serialized).byteLength > MAX_INPUT_BYTES) throw new Error('Evidence input exceeds budget');
      for (const endpoint of endpoints) {
        if (attempts >= 32 || deadline.aborted || signal?.aborted) throw new Error('Evidence request budget exhausted');
        const id = ++attempts;
        try {
          const response = await fetch(endpoint, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({jsonrpc: '2.0', id, method, params}),
            signal: AbortSignal.any([deadline, AbortSignal.timeout(6000), ...(signal ? [signal] : [])]),
          });
          const data = await boundedRpcJson(response);
          if (!data || typeof data !== 'object' || Array.isArray(data)) continue;
          const envelope = data as Record<string, unknown>;
          if (envelope.jsonrpc !== '2.0' || envelope.id !== id || envelope.error || !Object.hasOwn(envelope, 'result')) continue;
          if (acceptResult && !acceptResult(envelope.result)) continue;
          return envelope.result;
        } catch { /* An upstream failure is missing evidence, never a successful empty result. */ }
      }
      throw new Error('Evidence query unavailable');
    },
  };
}
