import { encodeFunctionData, formatUnits, type Abi } from 'viem';
import { decodeInputEvidence, inspectTokenInterface } from './abi-evidence.js';
import { createEvidenceRpc, type EvidenceRpc } from './evidence-rpc.js';
import { fetchContract, type ContractData, type TransactionData } from './ethereum.js';

export interface TokenState {
  address: string; status: 'available' | 'unavailable'; blockTag: string;
  authority: 'contract_reported_interface'; decimals?: number; balanceRaw?: string; reason?: string;
}
export interface PermissionState {
  token: string; owner?: string; caller?: string; spender?: string; blockTag: string;
  kind: 'erc20_allowance' | 'erc721_approval' | 'operator_approval'; rawValue: string; tokenIdRaw?: string;
  authority: 'contract_reported_interface';
}
export interface AnalysisEvidence {
  version: 'adapters-v1'; network: string; subject: string; blockTag: string;
  input: ReturnType<typeof decodeInputEvidence>;
  tokenStates: TokenState[]; permissionStates: PermissionState[];
  coverage: 'partial' | 'unavailable'; limits: string[]; attempts: number;
  capabilities: { inputDecoding: boolean; reportedTokenState: boolean; reportedPermissionState: boolean; internalTraces: false; isolatedBalanceDeltas: false };
}
const ADDRESS = /^0x[\da-f]{40}$/i;
const WORD = /^0x[\da-f]{64}$/i;
const CODE = /^0x(?:[\da-f]{2})+$/i;
function parsedAbi(metadata: ContractData): Abi | undefined {
  if (metadata.verificationStatus !== 'verified' || !metadata.abi || Buffer.byteLength(metadata.abi, 'utf8') > 262144) return;
  try { const abi: unknown = JSON.parse(metadata.abi); if (inspectTokenInterface(abi).status === 'available') return abi as Abi; } catch { /* No ABI means no decoded semantics. */ }
  return undefined;
}
function has(abi: Abi, name: string, inputs: string[], outputs?: string[]): boolean {
  return abi.some(f => f.type === 'function' && f.name === name && f.inputs.map(p => p.type).join(',') === inputs.join(',')
    && (!outputs || f.outputs.map(p => p.type).join(',') === outputs.join(',')));
}
function erc20Candidate(abi: Abi): boolean {
  return inspectTokenInterface(abi).erc20Candidate && !has(abi, 'ownerOf', ['uint256']);
}
export function formatReportedAmount(raw: string, decimals: number): string {
  if (!/^\d{1,78}$/.test(raw) || BigInt(raw) >= 2n ** 256n || !Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw new Error('Invalid declared token units');
  return formatUnits(BigInt(raw), decimals);
}
export async function collectAnalysisEvidence(tx: TransactionData, network: string, options: {
  rpc?: EvidenceRpc; fetchContract?: (address: string) => Promise<ContractData>; signal?: AbortSignal;
} = {}): Promise<AnalysisEvidence> {
  const signal = AbortSignal.any([AbortSignal.timeout(20000), ...(options.signal ? [options.signal] : [])]);
  const rpc = options.rpc ?? createEvidenceRpc(network, signal);
  const blockTag = /^0x[\da-f]+$/i.test(tx.blockNumber) ? tx.blockNumber : 'latest';
  const limits = ['internal_traces_unavailable', 'isolated_balance_deltas_unavailable'];
  if (blockTag === 'latest') limits.push('current_state_not_historical');
  const cache = new Map<string, Promise<ContractData>>();
  const metadata = (address: string) => {
    signal.throwIfAborted();
    const key = address.toLowerCase();
    if (!cache.has(key)) cache.set(key, (options.fetchContract ? options.fetchContract(key) : fetchContract(key, network, false, signal)).then(value => {
      if (value.address?.toLowerCase() !== key) throw new Error('Metadata identity mismatch');
      return value;
    }));
    return cache.get(key)!;
  };
  let destination: ContractData | undefined;
  try { if (ADDRESS.test(tx.to)) destination = await metadata(tx.to); } catch { limits.push('destination_metadata_unavailable'); }
  let abi = destination ? parsedAbi(destination) : undefined;
  let abiAddress = tx.to;
  if (destination?.isProxy && destination.implementation && ADDRESS.test(destination.implementation)) {
    let implementation: ContractData | undefined;
    try { implementation = await metadata(destination.implementation); } catch { limits.push('implementation_metadata_unavailable'); }
    abi = implementation ? parsedAbi(implementation) : undefined;
    if (abi) abiAddress = destination.implementation.toLowerCase();
    limits.push('current_proxy_implementation_not_historical');
  }
  const input = decodeInputEvidence(abi ?? [], tx.input, {network, address: tx.to, abiAddress, blockTag, scope: 'current_only', proxyResolved: false});
  if (input.status !== 'available') limits.push('input_decoding_incomplete');
  const transfers = tx.receiptEvidence?.transfers ?? [];
  const emitters = [...new Set(transfers.map(t => t.token.toLowerCase()).filter(a => ADDRESS.test(a)))];
  if (emitters.length > 8) limits.push('token_emitter_cap');
  const tokenStates: TokenState[] = [];
  for (const address of emitters.slice(0, 8)) {
    const state: TokenState = {address, blockTag, status: 'unavailable', authority: 'contract_reported_interface'};
    tokenStates.push(state);
    try {
      if (signal.aborted || !ADDRESS.test(tx.from)) throw new Error();
      if (transfers.some(t => t.token.toLowerCase() === address && t.kind === 'erc721-shaped')) { state.reason = 'nft_semantics'; continue; }
      const contract = await metadata(address);
      const tokenAbi = parsedAbi(contract);
      if (!tokenAbi || !erc20Candidate(tokenAbi) || contract.isProxy) { state.reason = 'token_interface_not_established'; continue; }
      const code = await rpc.call('eth_getCode', [address, blockTag], v => typeof v === 'string' && CODE.test(v));
      if (typeof code !== 'string' || !CODE.test(code)) throw new Error();
      const decimals = await rpc.call('eth_call', [{to: address, data: encodeFunctionData({abi: tokenAbi, functionName: 'decimals'})}, blockTag], v => typeof v === 'string' && WORD.test(v));
      const balance = await rpc.call('eth_call', [{to: address, data: encodeFunctionData({abi: tokenAbi, functionName: 'balanceOf', args: [tx.from]})}, blockTag], v => typeof v === 'string' && WORD.test(v));
      if (typeof decimals !== 'string' || !WORD.test(decimals) || typeof balance !== 'string' || !WORD.test(balance) || BigInt(decimals) > 36n) throw new Error();
      state.decimals = Number(BigInt(decimals)); state.balanceRaw = BigInt(balance).toString(); state.status = 'available';
    } catch { state.reason ??= 'token_state_unavailable'; }
  }
  const permissionStates: PermissionState[] = [];
  try {
    signal.throwIfAborted();
    if (abi && ADDRESS.test(tx.to) && ADDRESS.test(tx.from) && !destination?.isProxy && tx.input.toLowerCase().startsWith('0x095ea7b3') && tx.input.length === 138
      && erc20Candidate(abi) && inspectTokenInterface(abi).allowance) {
      const spenderWord = tx.input.slice(10, 74);
      if (!/^0{24}[\da-f]{40}$/i.test(spenderWord)) throw new Error();
      const spender = `0x${spenderWord.slice(24)}`;
      const state = tokenStates.find(t => t.address.toLowerCase() === tx.to.toLowerCase());
      if (state && state.status !== 'available') throw new Error();
      if (!state) {
        const code = await rpc.call('eth_getCode', [tx.to, blockTag], v => typeof v === 'string' && CODE.test(v));
        if (typeof code !== 'string' || !CODE.test(code)) throw new Error();
        const decimals = await rpc.call('eth_call', [{to: tx.to, data: encodeFunctionData({abi, functionName: 'decimals'})}, blockTag], v => typeof v === 'string' && WORD.test(v));
        const balance = await rpc.call('eth_call', [{to: tx.to, data: encodeFunctionData({abi, functionName: 'balanceOf', args: [tx.from]})}, blockTag], v => typeof v === 'string' && WORD.test(v));
        if (typeof decimals !== 'string' || !WORD.test(decimals) || BigInt(decimals) > 36n || typeof balance !== 'string' || !WORD.test(balance)) throw new Error();
      }
      const result = await rpc.call('eth_call', [{to: tx.to, data: encodeFunctionData({abi, functionName: 'allowance', args: [tx.from, spender]})}, blockTag], v => typeof v === 'string' && WORD.test(v));
      if (typeof result !== 'string' || !WORD.test(result)) throw new Error();
      permissionStates.push({token: tx.to, owner: tx.from, spender, blockTag, kind: 'erc20_allowance', rawValue: BigInt(result).toString(), authority: 'contract_reported_interface'});
    }
    else if (abi && ADDRESS.test(tx.to) && ADDRESS.test(tx.from) && !destination?.isProxy
      && has(abi, 'supportsInterface', ['bytes4'], ['bool'])) {
      const approve = /^0x095ea7b3[\da-f]{128}$/i.test(tx.input) && has(abi, 'getApproved', ['uint256'], ['address']) && has(abi, 'ownerOf', ['uint256'], ['address']);
      const operator = /^0xa22cb465[\da-f]{128}$/i.test(tx.input) && has(abi, 'isApprovedForAll', ['address', 'address'], ['bool']);
      if (approve || operator) {
        const spenderWord = tx.input.slice(10, 74);
        if (!/^0{24}[\da-f]{40}$/i.test(spenderWord)) throw new Error();
        const spender = `0x${spenderWord.slice(24).toLowerCase()}`;
        const code = await rpc.call('eth_getCode', [tx.to, blockTag], v => typeof v === 'string' && CODE.test(v));
        if (typeof code !== 'string' || !CODE.test(code)) throw new Error();
        const booleanWord = (v: unknown) => typeof v === 'string' && /^0x0{63}[01]$/.test(v);
        const supports = async (id: `0x${string}`) => {
          const result = await rpc.call('eth_call', [{to: tx.to, data: encodeFunctionData({abi: abi!, functionName: 'supportsInterface', args: [id]})}, blockTag], booleanWord);
          if (!booleanWord(result)) throw new Error();
          return BigInt(result as string) === 1n;
        };
        const nft721 = has(abi, 'ownerOf', ['uint256'], ['address']);
        if (!await supports('0x01ffc9a7') || await supports('0xffffffff') || !await supports(nft721 ? '0x80ac58cd' : '0xd9b67a26')) throw new Error();
        const tokenIdRaw = BigInt(`0x${tx.input.slice(74)}`).toString();
        const data = approve ? encodeFunctionData({abi, functionName: 'getApproved', args: [BigInt(tokenIdRaw)]})
          : encodeFunctionData({abi, functionName: 'isApprovedForAll', args: [tx.from, spender]});
        const valid = approve ? (v: unknown) => typeof v === 'string' && /^0x0{24}[\da-f]{40}$/i.test(v) : booleanWord;
        const result = await rpc.call('eth_call', [{to: tx.to, data}, blockTag], valid);
        if (!valid(result)) throw new Error();
        permissionStates.push({token: tx.to, ...(approve ? {caller: tx.from} : {owner: tx.from}), spender, blockTag, kind: approve ? 'erc721_approval' : 'operator_approval',
          rawValue: approve ? `0x${(result as string).slice(-40).toLowerCase()}` : BigInt(result as string).toString(),
          ...(approve ? {tokenIdRaw} : {}), authority: 'contract_reported_interface'});
      }
    }
  } catch { limits.push('permission_state_unavailable'); }
  limits.push('permission_effectiveness_not_verified');
  const result: AnalysisEvidence = {
    version: 'adapters-v1', network, subject: tx.to, blockTag, input, tokenStates, permissionStates, limits,
    coverage: 'partial', attempts: rpc.attempts,
    capabilities: {inputDecoding: input.status === 'available', reportedTokenState: tokenStates.some(t => t.status === 'available'), reportedPermissionState: permissionStates.length > 0, internalTraces: false, isolatedBalanceDeltas: false},
  };
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength > 65536) {
    result.input = decodeInputEvidence([], '0x', {network, address: tx.to, blockTag, scope: 'current_only'});
    result.tokenStates = []; result.permissionStates = []; result.limits.push('persisted_evidence_cap'); result.capabilities.inputDecoding = false; result.capabilities.reportedTokenState = false; result.capabilities.reportedPermissionState = false;
  }
  return result;
}
