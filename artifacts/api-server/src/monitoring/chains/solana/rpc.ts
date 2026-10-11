import { TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';
import { validSolanaAddress, TOKEN_2022_PROGRAM, type SolanaCluster, type ProgramRead } from './wallet-state.js';

export const SOLANA_CLUSTERS = {
  'mainnet-beta': {endpoint: 'https://api.mainnet.solana.com', genesis: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d'},
  devnet: {endpoint: 'https://api.devnet.solana.com', genesis: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG'},
} as const;
const METHODS = new Set(['getGenesisHash', 'getTokenAccountsByOwner']);
const MAX_BYTES = 512 * 1024;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

async function boundedJson(response: Response): Promise<unknown> {
  if (!response.ok || !response.body) throw new Error('solana_rpc_unavailable');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0; let body = '';
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw new Error('solana_response_limit');
      body += decoder.decode(value, {stream: true});
    }
    return JSON.parse(body + decoder.decode()) as unknown;
  } finally { await reader.cancel().catch(() => {}); }
}

export function createSolanaRpc(cluster: SolanaCluster, signal?: AbortSignal) {
  if (!Object.hasOwn(SOLANA_CLUSTERS, cluster)) throw new Error('unsupported_solana_cluster');
  const config = SOLANA_CLUSTERS[cluster];
  const deadline = AbortSignal.timeout(18000);
  let attempts = 0; let verified = false;
  const call = async (method: string, params: unknown[]): Promise<unknown> => {
    if (!METHODS.has(method) || !Array.isArray(params) || JSON.stringify(params).length > 2048 || attempts >= 3 || deadline.aborted || signal?.aborted) throw new Error('solana_request_not_supported');
    const id = ++attempts;
    const response = await fetch(config.endpoint, {method: 'POST', redirect: 'error', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({jsonrpc: '2.0', id, method, params}),
      signal: AbortSignal.any([deadline, AbortSignal.timeout(6000), ...(signal ? [signal] : [])]),
    });
    const envelope = await boundedJson(response);
    if (!record(envelope) || envelope.jsonrpc !== '2.0' || envelope.id !== id || Object.hasOwn(envelope, 'error') || !Object.hasOwn(envelope, 'result')) throw new Error('solana_invalid_rpc_response');
    return envelope.result;
  };
  return {
    call,
    async verifyCluster() {
      if (await call('getGenesisHash', []) !== config.genesis) throw new Error('solana_cluster_mismatch');
      verified = true;
    },
    async readAccounts(wallet: string, program: string): Promise<ProgramRead> {
      if (!verified || !validSolanaAddress(wallet) || ![TOKEN_PROGRAM_ADDRESS as string, TOKEN_2022_PROGRAM].includes(program)) throw new Error('solana_invalid_account_query');
      const result = await call('getTokenAccountsByOwner', [wallet, {programId: program}, {encoding: 'base64', commitment: 'finalized'}]);
      if (!record(result) || !record(result.context) || typeof result.context.slot !== 'number' || !Number.isSafeInteger(result.context.slot) || result.context.slot < 0 || !Array.isArray(result.value)) throw new Error('solana_invalid_program_response');
      return {slot: result.context.slot, accounts: result.value};
    },
  };
}
