import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, ArrowRight, ExternalLink, FlaskConical, Loader2, ScanLine, Wallet } from 'lucide-react';
import { Link } from 'wouter';
import { LEGACY_TOKEN_PROGRAM, SOLANA_EXAMPLE_WALLET, parseSolanaReport, type SolanaReport, type SolanaCluster } from '@/lib/solana-report';
import { SOLANA_MAINNET_EXAMPLE, SOLANA_GUIDANCE_VERSION, solanaAction, solanaPermissionAction, solanaEvidenceUrl, solanaExample, type SolanaExample } from '@/lib/solana-actions';

const shorten = (s: string) => `${s.slice(0, 8)}...${s.slice(-6)}`;

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
  function showExample(kind: SolanaExample) {
    active.current?.abort(); active.current = null; setBusy(false); setError(''); setExample(true);
    setReport(solanaExample(kind));
  }
  const action = report ? solanaAction(report) : null;

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
        <button type="button" disabled={busy} onClick={() => {setWallet(SOLANA_MAINNET_EXAMPLE); setCluster('mainnet-beta'); setReport(null); setError('');}} className="inline-flex min-h-11 items-center gap-2 text-sm text-emerald-200 px-2"><FlaskConical className="w-4 h-4" />Load Mainnet address</button>
      </div>
      <p className="text-xs text-subtle">An explicit scan sends this public address to Solana's public RPC. No wallet watch is saved on the server.</p>
    </form>
    {error && <p role="alert" className="border-l-2 border-amber-400 pl-4 py-2 text-sm text-amber-100">{error}</p>}
    {busy && <p role="status" className="text-sm text-subtle">Reading finalized token-account state...</p>}
    {report && action && <section aria-label="Solana check result" className="space-y-6 border-t border-white/10 pt-6">
      <div role="status" className="flex items-start gap-3">
        {report.status === 'no_delegates_found' ? <Wallet className="w-6 h-6 shrink-0 text-emerald-200 mt-1" /> : <AlertTriangle className="w-6 h-6 shrink-0 text-amber-200 mt-1" />}
        <div className="min-w-0"><p className="text-xs font-semibold uppercase text-amber-100 mb-2">{example ? 'Example data - not a live scan' : report.status === 'unavailable' ? 'RPC check - legacy data unavailable' : 'Live RPC snapshot'}</p><h2 className="text-xl font-semibold">{action.title}</h2><p className="mt-3 text-sm font-semibold text-emerald-200">Next action</p><p className="mt-1 text-sm">{action.nextAction}</p>{action.incomplete && <p className="mt-3 text-sm text-amber-100">Coverage is incomplete. A missing check is not a negative finding.</p>}</div>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm border-y border-white/10 py-4">
        <div className="min-w-0"><dt className="text-subtle">Wallet / cluster</dt><dd className="mt-1 font-mono break-all">{report.wallet} / {report.cluster}</dd>{!example && <a href={solanaEvidenceUrl(report.wallet, report.cluster) ?? undefined} target="_blank" rel="noopener noreferrer" className="inline-flex gap-2 items-center min-h-8 text-emerald-200">Wallet evidence <ExternalLink className="w-3 h-3" /></a>}</div>
        <div><dt className="text-subtle">Finalized slots</dt><dd className="mt-1 font-mono">{report.slotRange ? `${report.slotRange.min} - ${report.slotRange.max}` : 'Not established'}</dd></div>
        <div><dt className="text-subtle">Legacy accounts checked</dt><dd className="mt-1 font-mono">{report.accountsChecked}</dd></div>
      </dl>
      <div><h3 className="text-sm font-semibold mb-3">Coverage</h3>{report.coverage.map(c => <div key={c.program} className="flex flex-wrap justify-between gap-2 py-3 border-b border-white/10 text-sm"><span>{c.program === LEGACY_TOKEN_PROGRAM ? 'Legacy SPL delegates' : 'Token-2022 account query'}</span><span className="text-amber-100">{c.status} / {c.accountCount === null ? 'No count established' : `${c.accountCount} accounts`}</span><p className="w-full text-xs text-subtle break-all">{c.reason}</p></div>)}</div>
      {report.delegates.map(d => {
        const guidance = solanaPermissionAction(d);
        return <article key={d.account} aria-label={`Permission ${shorten(d.account)}`} className="rounded-md border border-amber-300/25 bg-amber-400/5 p-4 sm:p-5 space-y-5">
          <h3 className="font-semibold text-base">{guidance.title}</h3>
          <div className="text-sm"><h4 className="font-semibold text-emerald-200">Next action</h4><p className="mt-2">{guidance.nextAction}</p><p className="mt-2 text-subtle">Any change must be reviewed and signed separately by the account owner or its authorized signers. Re-check the account after a confirmed change; Sigil does not revoke permissions.</p></div>
          <dl className="space-y-4 text-sm">{[['What was detected', example ? 'Synthetic demonstration of a recorded delegate permission; no actual on-chain relationship was established.' : guidance.detected], ['Why it matters', guidance.why], ['Permission capability', guidance.capability], ['What could not be verified', guidance.limits]].map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd className="text-subtle mt-1">{value}</dd></div>)}</dl>
          <div className="border-t border-white/10 pt-4"><h4 className="font-semibold text-sm mb-3">{example ? 'Synthetic account evidence' : 'On-chain account evidence'}</h4>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">{[['Token account', d.account], ['Delegate authority', d.delegate], ['Mint identity (symbol unverified)', d.mint], ['Token program', d.program], ['Account state', d.state], ['Recorded account balance (raw)', d.balanceRaw], ['Delegated allowance (raw)', d.delegatedRaw], ['Ordinary balance/allowance bound (raw)', d.spendableRaw], [example ? 'Example slot' : 'Finalized slot', String(d.slot)]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-subtle">{label}</dt><dd className="font-mono break-all mt-1">{value}</dd></div>)}</dl>
            <p className="mt-3 text-xs text-subtle">{example ? 'Synthetic values; no provider call or on-chain relationship established.' : `${report.cluster} / getTokenAccountsByOwner / base64 / official legacy SPL decoder / ${report.generatedAt}. Explorer links show independently viewed current state, not a pinned historical snapshot.`}</p>
            {!example && <nav aria-label="Permission evidence" className="flex flex-wrap gap-x-4 gap-y-2 mt-3">{[['Account evidence', d.account], ['Delegate evidence', d.delegate], ['Mint evidence', d.mint], ['Program evidence', d.program]].map(([label, value]) => <a key={label} href={solanaEvidenceUrl(value, report.cluster) ?? undefined} target="_blank" rel="noopener noreferrer" className="inline-flex gap-2 items-center min-h-8 text-sm text-emerald-200">{label}<ExternalLink className="w-3 h-3" /></a>)}</nav>}
          </div>
          <a href="https://solana.com/docs/tokens/basics/revoke-delegate" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 gap-2 items-center text-sm text-emerald-200">Official revocation reference <ExternalLink className="w-3 h-3" /></a>
        </article>;
      })}
      <div><h3 className="text-sm font-semibold mb-3">Analysis limits</h3><ul className="space-y-2 text-sm text-subtle">{report.limitations.map(limit => <li key={limit}>{limit}</li>)}</ul></div>
      <p className="text-xs text-subtle break-words">{report.reportVersion} / {SOLANA_GUIDANCE_VERSION} / {report.generatedAt}{example ? ' / Synthetic fixture' : ' / Public Solana RPC'}</p>
    </section>}
    <section aria-label="Synthetic examples" className="border-t border-white/10 pt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm">
      {([['review', 'Review example'], ['negative', 'No-delegate example'], ['partial', 'Incomplete example'], ['unavailable', 'Unavailable example'], ['frozen', 'Frozen example'], ['zero', 'Zero-bound example']] as const).map(([kind, label]) => <button key={kind} type="button" onClick={() => showExample(kind)} className="inline-flex min-h-9 items-center gap-2 text-amber-100"><FlaskConical className="w-4 h-4" />{label}</button>)}
    </section>
  </div>;
}
