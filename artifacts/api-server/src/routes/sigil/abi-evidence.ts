import { decodeFunctionData, encodeFunctionData, toFunctionSelector, toFunctionSignature } from 'viem';
import type { AbiFunction, AbiParameter, Hex } from 'viem';

export interface AbiProvenance {
  network: string;
  address: string;
  abiAddress?: string;
  blockTag: string;
  scope: 'historical_bound' | 'current_only';
  proxyResolved?: boolean;
}
export type NormalizedAbiValue = string | boolean | null | NormalizedAbiValue[] | { [key: string]: NormalizedAbiValue };
export interface InputEvidence {
  status: 'available' | 'partial' | 'unavailable';
  source: 'abi';
  provenance: AbiProvenance;
  historicalCertainty: boolean;
  reason: string | null;
  signature?: string;
  arguments?: { name: string; type: string; value: NormalizedAbiValue }[];
  subcalls?: InputEvidence[];
}
export interface TokenInterfaceInspection {
  status: 'available' | 'unavailable';
  erc20Candidate: boolean;
  allowance: boolean;
  semanticsGuaranteed: false;
  reason: string | null;
}

function parametersValid(value: unknown, depth = 0): boolean {
  if (!Array.isArray(value) || value.length > 32 || depth > 4) return false;
  return value.every(p => {
    if (!p || typeof p !== 'object' || typeof p.type !== 'string' || p.type.length > 128
      || (p.name !== undefined && (typeof p.name !== 'string' || p.name.length > 128))) return false;
    const match = /^(tuple|address|bool|string|bytes(?:[1-9]|[12][0-9]|3[0-2])?|u?int(?:[0-9]+)?)((?:\[[0-9]*\])*)$/.exec(p.type);
    if (!match) return false;
    if (/^u?int/.test(match[1])) {
      const bits = Number(match[1].replace(/^u?int/, '') || '256');
      if (bits < 8 || bits > 256 || bits % 8 !== 0) return false;
    }
    const dimensions = match[2].match(/\[[0-9]*\]/g) ?? [];
    if (depth + dimensions.length > 4 || dimensions.some(d => d !== '[]' && (Number(d.slice(1, -1)) < 1 || Number(d.slice(1, -1)) > 32))) return false;
    return match[1] !== 'tuple' || parametersValid(p.components, depth + dimensions.length + 1);
  });
}

function readAbi(input: unknown): { functions: AbiFunction[]; reason: null } | { functions: null; reason: string } {
  try {
    const text = typeof input === 'string' ? input : JSON.stringify(input);
    if (typeof text !== 'string') return { functions: null, reason: 'invalid_abi' };
    if (Buffer.byteLength(text, 'utf8') > 256 * 1024) return { functions: null, reason: 'abi_limit' };
    const abi: unknown = JSON.parse(text);
    if (!Array.isArray(abi)) return { functions: null, reason: 'invalid_abi' };
    if (abi.length > 256) return { functions: null, reason: 'abi_limit' };
    const functions: AbiFunction[] = [];
    for (const item of abi) {
      if (!item || typeof item !== 'object' || typeof item.type !== 'string') return { functions: null, reason: 'invalid_abi' };
      if (item.type !== 'function') continue;
      if (typeof item.name !== 'string' || !/^[A-Za-z_$][A-Za-z0-9_$]{0,127}$/.test(item.name)
        || !parametersValid(item.inputs) || !parametersValid(item.outputs)) return { functions: null, reason: 'invalid_abi' };
      // viem is the sole authority for signatures, selectors and encoding.
      toFunctionSelector(item);
      functions.push(item as AbiFunction);
    }
    return { functions, reason: null };
  } catch {
    return { functions: null, reason: 'invalid_abi' };
  }
}

type Budget = { children: number; nodes: number; textBytes: number };
function normalize(value: unknown, budget: Budget, limited: () => void, depth = 0): NormalizedAbiValue {
  if (++budget.nodes > 256) throw new Error('argument_limit');
  if (depth > 4) { limited(); return null; }
  if (typeof value === 'boolean' || value === null) return value;
  if (typeof value === 'bigint' || typeof value === 'number' || typeof value === 'string') {
    const text = String(value);
    const available = Math.max(0, Math.min(1024, 24 * 1024 - budget.textBytes));
    const bytes = Buffer.from(text, 'utf8');
    if (bytes.length > available) limited();
    const result = bytes.subarray(0, available).toString('utf8');
    budget.textBytes += Buffer.byteLength(result, 'utf8');
    return result;
  }
  if (Array.isArray(value)) {
    if (value.length > 32) limited();
    return value.slice(0, 32).map(v => normalize(v, budget, limited, depth + 1));
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length > 32) limited();
    return Object.fromEntries(entries.slice(0, 32).map(([key, v]) => [key, normalize(v, budget, limited, depth + 1)]));
  }
  limited();
  return null;
}

export function decodeInputEvidence(abi: unknown, calldata: string, provenance: AbiProvenance): InputEvidence {
  const base = (): InputEvidence => ({ status: 'unavailable', source: 'abi', provenance: { ...provenance }, historicalCertainty: false, reason: null });
  const failed = (reason: string): InputEvidence => ({ ...base(), reason });
  if (!provenance || typeof provenance.network !== 'string' || !provenance.network || provenance.network.length > 128
    || !/^0x[0-9a-fA-F]{40}$/.test(provenance.address)
    || (provenance.abiAddress !== undefined && !/^0x[0-9a-fA-F]{40}$/.test(provenance.abiAddress))
    || typeof provenance.blockTag !== 'string' || !provenance.blockTag || provenance.blockTag.length > 128
    || !['historical_bound', 'current_only'].includes(provenance.scope)
    || (provenance.proxyResolved !== undefined && typeof provenance.proxyResolved !== 'boolean')) return failed('invalid_provenance');
  const parsed = readAbi(abi);
  if (!parsed.functions) return failed(parsed.reason);
  const selectors = new Map<string, AbiFunction[]>();
  for (const f of parsed.functions) {
    const selector = toFunctionSelector(f).toLowerCase();
    selectors.set(selector, [...(selectors.get(selector) ?? []), f]);
  }
  const budget: Budget = { children: 0, nodes: 0, textBytes: 0 };
  function decode(data: string, depth: number): InputEvidence {
    if (typeof data !== 'string') return failed('invalid_calldata');
    if (data.length > 2 + 32 * 1024 * 2) return failed('calldata_limit');
    if (!/^0x(?:[0-9a-fA-F]{2}){4,}$/.test(data)) return failed('invalid_calldata');
    const matches = selectors.get(data.slice(0, 10).toLowerCase()) ?? [];
    if (!matches.length) return failed('unknown_selector');
    if (matches.length !== 1) return failed('ambiguous_selector');
    const f = matches[0];
    try {
      const decoded = decodeFunctionData({ abi: [f], data: data as Hex });
      const args = decoded.args ?? [];
      const canonical = encodeFunctionData({ abi: [f], functionName: decoded.functionName, args });
      if (canonical.toLowerCase() !== data.toLowerCase()) return failed('noncanonical_calldata');
      const historical = provenance.scope === 'historical_bound' && provenance.proxyResolved !== false;
      const result: InputEvidence = {
        ...base(), status: historical ? 'available' : 'partial', historicalCertainty: historical,
        reason: historical ? null : provenance.scope === 'current_only' ? 'current_abi_only' : 'unresolved_proxy',
        signature: toFunctionSignature(f),
      };
      const partial = (reason: string) => { result.status = 'partial'; result.reason = reason; };
      result.arguments = f.inputs.map((p: AbiParameter, i: number) => ({ name: p.name ?? '', type: p.type,
        value: normalize(args[i], budget, () => partial('argument_limit')) }));
      const childIndex = result.signature === 'multicall(bytes[])' ? 0 : result.signature === 'multicall(uint256,bytes[])' ? 1 : -1;
      if (childIndex >= 0) {
        const children = args[childIndex] as readonly string[];
        result.subcalls = [];
        for (const child of children.slice(0, 32)) {
          if (depth >= 4 || budget.children >= 16) { partial('subcall_limit'); break; }
          budget.children++;
          const evidence = decode(child, depth + 1);
          // A child overflow invalidates the whole shared argument budget.
          if (budget.nodes > 256) return failed('argument_limit');
          result.subcalls.push(evidence);
          if (evidence.status !== 'available') partial('partial_subcalls');
        }
        if (children.length > 32) partial('subcall_limit');
      }
      return result;
    } catch {
      return failed(budget.nodes > 256 ? 'argument_limit' : 'invalid_calldata');
    }
  }
  const result = decode(calldata, 0);
  return Buffer.byteLength(JSON.stringify(result), 'utf8') > 64 * 1024 ? failed('evidence_limit') : result;
}

export function inspectTokenInterface(abi: unknown): TokenInterfaceInspection {
  const parsed = readAbi(abi);
  if (!parsed.functions) return { status: 'unavailable', erc20Candidate: false, allowance: false, semanticsGuaranteed: false, reason: parsed.reason };
  const has = (signature: string, outputs?: string[]) => {
    const matches = parsed.functions.filter(f => toFunctionSelector(f) === toFunctionSelector(signature));
    return matches.length === 1 && toFunctionSignature(matches[0]) === signature
      && (!outputs || (matches[0].outputs.length === 1 && outputs.includes(matches[0].outputs[0].type)));
  };
  const candidate = has('transfer(address,uint256)') && has('balanceOf(address)', ['uint256']) && has('decimals()', ['uint8', 'uint256']);
  return { status: 'available', erc20Candidate: candidate, allowance: has('allowance(address,address)', ['uint256']),
    semanticsGuaranteed: false, reason: candidate ? null : 'interface_not_matched' };
}
