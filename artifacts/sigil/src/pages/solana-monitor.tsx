import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, ArrowRight, ExternalLink, FlaskConical, Loader2, ScanLine, Wallet } from 'lucide-react';
import { Link } from 'wouter';
import { LEGACY_TOKEN_PROGRAM, TOKEN_2022_PROGRAM, SOLANA_EXAMPLE_WALLET, parseSolanaReport, type SolanaReport, type SolanaCluster } from '@/lib/solana-report';

const titles = {review: 'Delegation needs review', no_delegates_found: 'No delegates found in checked scope', partial: 'Some checks could not be completed', unavailable: 'Wallet check unavailable'};
const shorten = (s: string) => `${s.slice(0, 8)}...${s.slice(-6)}`;
const explorer = (s: string, cluster: SolanaCluster) => `https://explorer.solana.com/address/${encodeURIComponent(s)}${cluster === 'devnet' ? '?cluster=devnet' : ''}`;

function exampleReport(unavailable: boolean): SolanaReport {
  const wallet = '11111111111111111111111111111111';
  return {
    reportVersion: 'solana-manual-v1', wallet, cluster: 'devnet', generatedAt: new Date().toISOString(), commitment: 'finalized',
    status: unavailable ? 'unavailable' : 'review', slotRange: unavailable ? null : {min: 100, max: 101}, accountsChecked: unavailable ? 0 : 1,
    coverage: [LEGACY_TOKEN_PROGRAM, TOKEN_2022_PROGRAM].map((program, i) => ({program,
      status: unavailable ? 'unavailable' : 'complete', reason: unavailable ? 'solana_rpc_unavailable' : i === 0 ? 'supported_scope_checked' : 'no_token2022_accounts_returned',
      slot: unavailable ? null : 100 + i, accountCount: unavailable ? null : i === 0 ? 1 : 0})),
    delegates: unavailable ? [] : [{account: 'So11111111111111111111111111111111111111112', mint: 'So11111111111111111111111111111111111111112', program: LEGACY_TOKEN_PROGRAM,
      delegate: 'Vote111111111111111111111111111111111111111', balanceRaw: '500', delegatedRaw: '250', spendableRaw: '250', state: 'initialized', slot: 100, reviewReason: 'ordinary_delegate_review'}],
    limitations: ['Synthetic example, not an observed wallet or malicious entity.', 'Only ordinary legacy SPL delegates are represented. No live threat intelligence, signing clearance or economic valuation.'],
  };
}

export default function SolanaMonitorPage() {
  const [wallet, setWallet] = useState('');
  const [cluster, setCluster] = useState<SolanaCluster>('devnet');
  const [report, setReport] = useState<SolanaReport | null>(null);
  const [example, setExample] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function scan(event: FormEvent) {
    event.preventDefault();
    const requestedWallet = wallet.trim(); const requestedCluster = cluster;
    setReport(null); setExample(false); setError('');
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(requestedWallet)) {setError('Enter a complete Solana public address.'); return;}
    const controller = new AbortController(); active.current?.abort(); active.current = controller; setBusy(true);
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}api/sigil/monitor/v2/solana/scan`, {method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({wallet: requestedWallet, cluster: requestedCluster}), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(22000)])});
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(response.status === 400 ? 'Address or cluster was rejected. Check the input.' : 'Wallet check unavailable. Please retry.');
      const accepted = parseSolanaReport(payload, requestedWallet, requestedCluster);
      if (!accepted) throw new Error('The response could not be validated. No wallet conclusion was established.');
      if (!controller.signal.aborted) setReport(accepted);
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error && e.name !== 'TimeoutError' ? e.message : 'Wallet check timed out. No wallet conclusion was established.');
    } finally {if (active.current === controller) {active.current = null; setBusy(false);}}
  }
  function showExample(unavailable: boolean) {
    active.current?.abort(); active.current = null; setBusy(false); setError(''); setExample(true);
    setReport(exampleReport(unavailable));
  }

  return <div className="w-full max-w-5xl mx-auto space-y-8">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-6">
      <div><p className="text-sm text-emerald-200 mb-2">Sigil / Solana</p><h1 className="font-display text-3xl font-bold">Solana Wallet Check</h1><p className="text-sm text-subtle mt-3">Manual snapshot. Public address only. No signatures.</p></div>
      <Link href="/monitor" className="inline-flex items-center gap-2 text-sm text-primary-text py-2">EVM Monitor <ArrowRight className="w-4 h-4" /></Link>
    </header>
    <form onSubmit={scan} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
        <div><label htmlFor="solana-wallet" className="block text-sm font-medium mb-2">Public wallet address</label><input id="solana-wallet" value={wallet} disabled={busy} onChange={e => {setWallet(e.target.value); setReport(null); setError('');}} autoComplete="off" spellCheck={false} maxLength={64} className="w-full min-w-0 rounded-md border border-white/20 bg-background px-3 py-3 font-mono text-sm" placeholder="Solana address" /></div>
        <div><label htmlFor="solana-cluster" className="block text-sm font-medium mb-2">Cluster</label><select id="solana-cluster" value={cluster} disabled={busy} onChange={e => {setCluster(e.target.value as SolanaCluster); setReport(null);}} className="w-full rounded-md border border-white/20 bg-background px-3 py-3 text-sm"><option value="devnet">Devnet</option><option value="mainnet-beta">Mainnet</option></select></div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}{busy ? 'Checking wallet' : 'Check wallet'}</button>
        <button type="button" disabled={busy} onClick={() => {setWallet(SOLANA_EXAMPLE_WALLET); setCluster('devnet'); setReport(null); setError('');}} className="inline-flex min-h-11 items-center gap-2 text-sm text-emerald-200 px-2"><FlaskConical className="w-4 h-4" />Load Devnet address</button>
      </div>
      <p className="text-xs text-subtle">An explicit scan sends this public address to Solana's public RPC. No wallet watch is saved on the server.</p>
    </form>
    {error && <p role="alert" className="border-l-2 border-amber-400 pl-4 py-2 text-sm text-amber-100">{error}</p>}
    {busy && <p role="status" className="text-sm text-subtle">Reading finalized token-account state...</p>}
    {report && <section aria-label="Solana check result" className="space-y-6 border-t border-white/10 pt-6">
      <div role="status" className="flex items-start gap-3">
        {report.status === 'no_delegates_found' ? <Wallet className="w-6 h-6 shrink-0 text-emerald-200 mt-1" /> : <AlertTriangle className="w-6 h-6 shrink-0 text-amber-200 mt-1" />}
        <div className="min-w-0"><p className="text-xs font-semibold uppercase text-amber-100 mb-2">{example ? 'Example data - not a live scan' : 'Live RPC snapshot'}</p><h2 className="text-xl font-semibold">{titles[report.status]}</h2><p className="mt-2 text-sm text-subtle">{report.delegates.length ? 'Delegate presence alone does not establish malicious intent. Review the authority and account evidence.' : 'This is not a wallet safety assessment. Missing or unsupported checks remain unknown.'}</p></div>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm border-y border-white/10 py-4">
        <div className="min-w-0"><dt className="text-subtle">Wallet / cluster</dt><dd className="mt-1 font-mono break-all">{shorten(report.wallet)} / {report.cluster}</dd></div>
        <div><dt className="text-subtle">Finalized slots</dt><dd className="mt-1 font-mono">{report.slotRange ? `${report.slotRange.min} - ${report.slotRange.max}` : 'Not established'}</dd></div>
        <div><dt className="text-subtle">Legacy accounts checked</dt><dd className="mt-1 font-mono">{report.accountsChecked}</dd></div>
      </dl>
      <div><h3 className="text-sm font-semibold mb-3">Coverage</h3>{report.coverage.map(c => <div key={c.program} className="flex flex-wrap justify-between gap-2 py-3 border-b border-white/10 text-sm"><span>{c.program === LEGACY_TOKEN_PROGRAM ? 'Legacy SPL delegates' : 'Token-2022 account query'}</span><span className="text-amber-100">{c.status} / {c.accountCount === null ? 'No count established' : `${c.accountCount} accounts`}</span><p className="w-full text-xs text-subtle break-all">{c.reason}</p></div>)}</div>
      {report.delegates.map(d => <article key={d.account} className="rounded-md border border-amber-300/25 bg-amber-400/5 p-4 space-y-3">
        <h3 className="font-semibold text-base">Delegate review</h3>
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">{[['Token account', d.account], ['Delegate', d.delegate], ['Mint', d.mint], ['Account state', d.state], ['Raw balance', d.balanceRaw], ['Raw delegated limit', d.delegatedRaw], ['Ordinary spendable bound (raw)', d.spendableRaw]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-subtle">{label}</dt><dd className="font-mono break-all mt-1">{value}</dd></div>)}</dl>
        <p className="text-sm text-amber-100">Review whether this delegate is expected. A zero bound or frozen state does not establish future safety.</p>
        {!example && <a href={explorer(d.account, report.cluster)} target="_blank" rel="noopener noreferrer" className="inline-flex gap-2 items-center text-sm text-emerald-200">Account evidence <ExternalLink className="w-4 h-4" /></a>}
      </article>)}
      <div><h3 className="text-sm font-semibold mb-3">Analysis limits</h3><ul className="space-y-2 text-sm text-subtle">{report.limitations.map(limit => <li key={limit}>{limit}</li>)}</ul></div>
      <p className="text-xs text-subtle break-all">{report.reportVersion} / {report.generatedAt}{example ? ' / Synthetic fixture' : ' / Public Solana RPC'}</p>
    </section>}
    <section aria-label="Synthetic examples" className="border-t border-white/10 pt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm">
      <button type="button" onClick={() => showExample(false)} className="inline-flex items-center gap-2 text-amber-100"><FlaskConical className="w-4 h-4" />Review example</button>
      <button type="button" onClick={() => showExample(true)} className="inline-flex items-center gap-2 text-amber-100"><FlaskConical className="w-4 h-4" />Unavailable example</button>
    </section>
  </div>;
}
