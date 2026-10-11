import { LEGACY_TOKEN_PROGRAM, TOKEN_2022_PROGRAM, type SolanaReport, type SolanaCluster } from './solana-report';

export const SOLANA_MAINNET_EXAMPLE = 'HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ';
export const SOLANA_GUIDANCE_VERSION = 'solana-delegate-review-v1';
export type SolanaExample = 'review' | 'negative' | 'partial' | 'unavailable' | 'frozen' | 'zero';
type Delegate = SolanaReport['delegates'][number];

export function solanaEvidenceUrl(value: string, cluster: SolanaCluster): string | null {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value) || !['devnet', 'mainnet-beta'].includes(cluster)) return null;
  return `https://explorer.solana.com/address/${encodeURIComponent(value)}${cluster === 'devnet' ? '?cluster=devnet' : ''}`;
}

// Presentation only: reports must pass parseSolanaReport before reaching this layer.
export function solanaAction(report: SolanaReport) {
  const incomplete = report.coverage.some(c => c.status !== 'complete');
  if (report.delegates.length) return {outcome: 'REVIEW_PERMISSION', incomplete, title: 'Delegation needs review',
    nextAction: `Review ${report.delegates.length} token-account permission${report.delegates.length === 1 ? '' : 's'}. Confirm each delegate matches your intended use before deciding on any change.`};
  if (report.status === 'unavailable') return {outcome: 'UNAVAILABLE', incomplete, title: 'Wallet check unavailable',
    nextAction: 'Retry the read-only check. No absence of delegation was established; do not make a permission decision from this failed check.'};
  if (incomplete) return {outcome: 'INCOMPLETE', incomplete, title: 'Some checks could not be completed',
    nextAction: 'Review the missing coverage below. No delegate observation was returned in decoded accounts, but unsupported or failed checks remain unknown.'};
  return {outcome: 'NO_DELEGATE_IN_CHECKED_SCOPE', incomplete, title: 'No delegates found in checked scope',
    nextAction: 'No ordinary legacy SPL delegate was found in the accounts returned and decoded at these slots. No delegate change is indicated by this narrow check; it is not wallet safety clearance.'};
}

export function solanaPermissionAction(delegate: Delegate) {
  const bound = delegate.spendableRaw;
  const capability = delegate.state === 'frozen'
    ? 'The account was frozen at the recorded slot. Its ordinary transfer/burn bound is zero in this state. Thawing or other state changes can change that bound.'
    : bound === '0'
      ? 'A delegate is recorded, but the observed balance or delegated limit makes the current ordinary bound zero. Future deposits or allowance changes can change that bound.'
      : `Under ordinary legacy SPL rules, this delegation permits transfers and non-native-token burns from this token account, up to its allowance. The observed balance/allowance upper bound is ${bound} raw units, not a guaranteed executable amount.`;
  return {title: delegate.state === 'frozen' ? 'Review a frozen account permission' : bound === '0' ? 'Review a zero-bound permission' : 'Review a nonzero-bound permission',
    detected: 'A delegate and delegated amount were decoded from this legacy SPL token account at the recorded finalized slot.',
    why: 'Delegation grants another authority a limited permission over this account. Its presence alone does not identify an attacker or establish an incident.',
    capability,
    nextAction: 'Confirm this exact token account, mint and delegate against the application you intended to use. If you do not recognize or no longer need the permission, review manual revocation in your trusted wallet; do not sign an unfamiliar remediation prompt.',
    limits: 'Mint state, token decimals/value, control of the delegate and actual instruction success were not verified or simulated. This is not authority over all wallet assets; frozen or zero-bound state does not establish future safety.'};
}

export function solanaExample(kind: SolanaExample): SolanaReport {
  const unavailable = kind === 'unavailable';
  const review = ['review', 'frozen', 'zero'].includes(kind);
  return {
    reportVersion: 'solana-manual-v1', wallet: '11111111111111111111111111111111', cluster: 'devnet', generatedAt: new Date().toISOString(), commitment: 'finalized',
    status: unavailable ? 'unavailable' : review ? 'review' : kind === 'partial' ? 'partial' : 'no_delegates_found',
    slotRange: unavailable ? null : {min: 100, max: 101}, accountsChecked: review ? 1 : 0,
    coverage: [LEGACY_TOKEN_PROGRAM, TOKEN_2022_PROGRAM].map((program, i) => ({program,
      status: unavailable ? 'unavailable' : kind === 'partial' && i === 1 ? 'unsupported' : 'complete',
      reason: unavailable ? 'solana_rpc_unavailable' : kind === 'partial' && i === 1 ? 'token2022_semantics_unsupported' : i === 0 ? 'supported_scope_checked' : 'no_token2022_accounts_returned',
      slot: unavailable ? null : 100 + i, accountCount: unavailable ? null : i === 0 ? review ? 1 : 0 : kind === 'partial' ? 1 : 0})),
    delegates: review ? [{account: 'So11111111111111111111111111111111111111112', mint: 'So11111111111111111111111111111111111111112', program: LEGACY_TOKEN_PROGRAM,
      delegate: 'Vote111111111111111111111111111111111111111', balanceRaw: kind === 'zero' ? '0' : '500', delegatedRaw: '250',
      spendableRaw: kind === 'review' ? '250' : '0', state: kind === 'frozen' ? 'frozen' : 'initialized', slot: 100,
      reviewReason: kind === 'frozen' ? 'frozen_account_review' : kind === 'zero' ? 'delegate_present_no_current_spendable_units' : 'ordinary_delegate_review'}] : [],
    limitations: ['Synthetic example, not an observed wallet, token-account relationship, incident victim or malicious entity.',
      'Only ordinary legacy SPL delegates are represented. No live threat intelligence, signing clearance or economic valuation.'],
  };
}
