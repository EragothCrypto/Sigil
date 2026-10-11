import { address, isSome } from '@solana/kit';
import { AccountState, getTokenDecoder, getTokenSize, TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';

export const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
export const MAX_ACCOUNTS = 100;
export type SolanaCluster = 'mainnet-beta' | 'devnet';
export type ProgramRead = {slot: number; accounts: unknown[]} | {reason: string};
export interface SolanaScanReport {
  reportVersion: 'solana-manual-v1';
  wallet: string;
  cluster: SolanaCluster;
  generatedAt: string;
  status: 'review' | 'no_delegates_found' | 'partial' | 'unavailable';
  commitment: 'finalized';
  slotRange: {min: number; max: number} | null;
  coverage: {program: string; status: 'complete' | 'partial' | 'unavailable' | 'unsupported'; reason: string; slot: number | null; accountCount: number | null}[];
  accountsChecked: number;
  delegates: {account: string; mint: string; program: string; delegate: string; balanceRaw: string; delegatedRaw: string; spendableRaw: string; state: 'initialized' | 'frozen'; slot: number; reviewReason: string}[];
  limitations: string[];
}
export function validSolanaAddress(value: unknown): value is string {
  if (typeof value !== 'string' || value.length < 32 || value.length > 44) return false;
  try { return address(value) === value; } catch { return false; }
}
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const validSlot = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

export function evaluateSolanaWallet(wallet: string, cluster: SolanaCluster, reads: {legacy: ProgramRead; token2022: ProgramRead}): SolanaScanReport {
  if (!validSolanaAddress(wallet) || !['devnet', 'mainnet-beta'].includes(cluster)) throw new Error('Invalid Solana scan context');
  const result: SolanaScanReport = {
    reportVersion: 'solana-manual-v1', wallet, cluster, generatedAt: new Date().toISOString(), status: 'unavailable', commitment: 'finalized',
    slotRange: null, coverage: [], accountsChecked: 0, delegates: [],
    limitations: ['Manual read-only snapshot; not signing clearance or continuous monitoring.',
      'Only ordinary legacy SPL token-account delegates are checked; mint authorities, protocol positions and Token-2022 semantics are not assessed.',
      'Raw token units are not economic value. Separate finalized reads are not an atomic wallet snapshot.',
      'No live threat intelligence was established; unknown delegates are review observations, not confirmed malicious entities.'],
  };
  const slots: number[] = [];
  for (const [program, read] of [[TOKEN_PROGRAM_ADDRESS, reads.legacy], [TOKEN_2022_PROGRAM, reads.token2022]] as const) {
    if (!read || 'reason' in read || !validSlot(read.slot) || !Array.isArray(read.accounts)) {
      result.coverage.push({program, status: 'unavailable', reason: 'reason' in (read ?? {}) ? (read as {reason: string}).reason : 'invalid_program_response', slot: null, accountCount: null});
      continue;
    }
    slots.push(read.slot);
    const coverage: SolanaScanReport['coverage'][number] = {program, status: 'complete', reason: 'supported_scope_checked', slot: read.slot, accountCount: read.accounts.length};
    result.coverage.push(coverage);
    if (read.accounts.length > MAX_ACCOUNTS) { coverage.status = 'partial'; coverage.reason = 'account_limit_exceeded'; continue; }
    if (program === TOKEN_2022_PROGRAM) {
      if (read.accounts.length) { coverage.status = 'unsupported'; coverage.reason = 'token2022_semantics_unsupported'; }
      else coverage.reason = 'no_token2022_accounts_returned';
      continue;
    }
    const seen = new Set<string>();
    for (const item of read.accounts) {
      try {
        if (!record(item) || !validSolanaAddress(item.pubkey) || seen.has(item.pubkey) || !record(item.account)) throw new Error();
        seen.add(item.pubkey);
        const account = item.account;
        if (account.owner !== program || account.executable !== false || !Array.isArray(account.data) || account.data.length !== 2 || account.data[1] !== 'base64' || typeof account.data[0] !== 'string') throw new Error();
        const bytes = Buffer.from(account.data[0], 'base64');
        if (bytes.length !== getTokenSize() || bytes.toString('base64') !== account.data[0]) throw new Error();
        // The official decoder treats noncanonical COption tags as None. Reject these before decoding.
        for (const offset of [72, 109, 129]) if (bytes.readUInt32LE(offset) > 1) throw new Error();
        const decoded = getTokenDecoder().decode(bytes);
        if (decoded.owner !== wallet || ![AccountState.Initialized, AccountState.Frozen].includes(decoded.state)) throw new Error();
        result.accountsChecked++;
        if (!isSome(decoded.delegate)) continue;
        const active = decoded.state === AccountState.Initialized;
        const spendable = active ? (decoded.amount < decoded.delegatedAmount ? decoded.amount : decoded.delegatedAmount) : 0n;
        result.delegates.push({account: item.pubkey, mint: decoded.mint, program, delegate: decoded.delegate.value,
          balanceRaw: decoded.amount.toString(), delegatedRaw: decoded.delegatedAmount.toString(), spendableRaw: spendable.toString(),
          state: active ? 'initialized' : 'frozen', slot: read.slot,
          reviewReason: !active ? 'frozen_account_review' : spendable === 0n ? 'delegate_present_no_current_spendable_units' : 'ordinary_delegate_review'});
      } catch { coverage.status = 'partial'; coverage.reason = 'token_account_not_established'; }
    }
  }
  result.delegates.sort((a, b) => a.account.localeCompare(b.account));
  if (slots.length) result.slotRange = {min: Math.min(...slots), max: Math.max(...slots)};
  const legacy = result.coverage[0];
  result.status = result.delegates.length ? 'review' : legacy.status === 'unavailable' ? 'unavailable'
    : result.coverage.some(c => c.status !== 'complete') ? 'partial' : 'no_delegates_found';
  return result;
}
