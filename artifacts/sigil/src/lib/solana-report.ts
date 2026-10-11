import { ScanSolanaWalletResponse } from '@workspace/api-zod';
import { z } from 'zod';

export const LEGACY_TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const schema = ScanSolanaWalletResponse.extend({generatedAt: z.string().datetime()});
export type SolanaReport = z.infer<typeof schema>;
export type SolanaCluster = 'mainnet-beta' | 'devnet';
export const SOLANA_EXAMPLE_WALLET = 'A1TMhSGzQxMr1TboBKtgixKz1sS6REASMxPo1qsyTSJd';

export function parseSolanaReport(value: unknown, wallet: string, cluster: SolanaCluster): SolanaReport | null {
  const parsed = schema.safeParse(value);
  if (!parsed.success) return null;
  const r = parsed.data;
  const age = Date.now() - Date.parse(r.generatedAt);
  if (r.wallet !== wallet || r.cluster !== cluster || age < -60000 || age > 120000) return null;
  const [legacy, token2022] = r.coverage;
  if (legacy.program !== LEGACY_TOKEN_PROGRAM || token2022.program !== TOKEN_2022_PROGRAM) return null;
  for (const c of r.coverage) {
    if (c.status === 'unavailable' ? c.slot !== null || c.accountCount !== null : c.slot === null || c.accountCount === null) return null;
  }
  if (legacy.status === 'unsupported' || (legacy.status === 'complete' && legacy.accountCount !== r.accountsChecked)) return null;
  if (r.accountsChecked > (legacy.accountCount ?? 0) || r.delegates.length > r.accountsChecked) return null;
  if (token2022.status === 'complete' && token2022.accountCount !== 0) return null;
  if (token2022.status === 'unsupported' && !token2022.accountCount) return null;
  const slots = r.coverage.flatMap(c => c.slot === null ? [] : [c.slot]);
  if (slots.length ? !r.slotRange || r.slotRange.min !== Math.min(...slots) || r.slotRange.max !== Math.max(...slots) : r.slotRange !== null) return null;
  const expected = r.delegates.length ? 'review' : legacy.status === 'unavailable' ? 'unavailable' : r.coverage.some(c => c.status !== 'complete') ? 'partial' : 'no_delegates_found';
  if (r.status !== expected || new Set(r.delegates.map(d => d.account)).size !== r.delegates.length) return null;
  const max = 18446744073709551615n;
  for (const d of r.delegates) {
    if (d.program !== LEGACY_TOKEN_PROGRAM || d.slot !== legacy.slot || [d.balanceRaw, d.delegatedRaw, d.spendableRaw].some(n => BigInt(n) > max)) return null;
    const balance = BigInt(d.balanceRaw); const delegated = BigInt(d.delegatedRaw);
    const spendable = d.state === 'frozen' ? 0n : balance < delegated ? balance : delegated;
    const reason = d.state === 'frozen' ? 'frozen_account_review' : spendable === 0n ? 'delegate_present_no_current_spendable_units' : 'ordinary_delegate_review';
    if (BigInt(d.spendableRaw) !== spendable || d.reviewReason !== reason) return null;
  }
  return r;
}
