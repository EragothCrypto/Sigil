import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, ExternalLink, Loader2, ScanLine, CheckCircle2 } from 'lucide-react';
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

  return <div className="w-full max-w-5xl mx-auto space-y-6">
    <header className="border-b border-border pb-5">
      <h1 className="font-display text-3xl font-semibold">Check wallet permissions</h1>
      <p className="text-sm text-subtle mt-2">Solana token-account delegates. Public address only. No signatures.</p>
      <p className="text-sm text-subtle mt-2">For EVM, <Link href="/approvals" className="console-link">review recorded approval events</Link>. These are not current allowances.</p>
    </header>
    <form onSubmit={scan} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
        <div><label htmlFor="solana-wallet" className="block text-sm font-medium mb-2">Public wallet address</label><input id="solana-wallet" value={wallet} disabled={busy} onChange={e => {setWallet(e.target.value); setReport(null); setError('');}} autoComplete="off" spellCheck={false} maxLength={64} className="w-full min-w-0 rounded-md border border-border bg-card px-3 py-3 font-mono text-sm" placeholder="Solana address" /></div>
        <div><label htmlFor="solana-cluster" className="block text-sm font-medium mb-2">Cluster</label><select id="solana-cluster" value={cluster} disabled={busy} onChange={e => {setCluster(e.target.value as SolanaCluster); setReport(null);}} className="w-full rounded-md border border-border bg-card px-3 py-3 text-sm"><option value="devnet">Devnet</option><option value="mainnet-beta">Mainnet</option></select></div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="console-button inline-flex items-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <ScanLine className="w-4 h-4" aria-hidden="true" />}{busy ? 'Checking wallet' : 'Check wallet'}</button>
        <button type="button" disabled={busy} onClick={() => {setWallet(SOLANA_MAINNET_EXAMPLE); setCluster('mainnet-beta'); setReport(null); setError('');}} className="console-link inline-flex min-h-11 items-center text-sm px-2 disabled:text-subtle">Load Mainnet address</button>
        <button type="button" disabled={busy} onClick={() => {setWallet(SOLANA_EXAMPLE_WALLET); setCluster('devnet'); setReport(null); setError('');}} className="console-link inline-flex min-h-11 items-center text-sm px-2 disabled:text-subtle">Load Devnet address</button>
      </div>
      <p className="text-xs text-subtle">An explicit scan sends this public address to Solana's public RPC. No wallet watch is saved on the server.</p>
    </form>
    {error && <p role="alert" className="border-l-2 border-amber-400 pl-4 py-2 text-sm text-amber-200">{error}</p>}
    {busy && <p role="status" className="text-sm text-subtle">Reading finalized token-account state...</p>}
    {report && action && <section aria-label="Solana check result" className="space-y-6 border-t border-border pt-6">
      <div role="status" className={`border-l-2 pl-4 py-1 ${report.status === 'no_delegates_found' ? 'border-emerald-300' : 'border-amber-300'}`}>
        <p className={`text-sm font-semibold mb-3 ${example ? 'text-amber-200' : 'text-subtle'}`}>{example ? 'Example data - not a live scan' : report.status === 'unavailable' ? 'RPC check - legacy data unavailable' : 'Live RPC snapshot'}</p>
        <div className="flex items-start gap-2">
          {report.status === 'no_delegates_found' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-300 mt-1" aria-hidden="true" /> : <AlertTriangle className="w-5 h-5 shrink-0 text-amber-300 mt-1" aria-hidden="true" />}
          <h2 className="text-2xl font-semibold">{action.title}</h2>
        </div>
        <h3 className="mt-4 text-sm font-semibold">Next action</h3>
        <p className="mt-1 text-sm leading-relaxed max-w-3xl">{action.nextAction}</p>
        {action.incomplete && <p className="mt-3 text-sm text-amber-200">Coverage is incomplete. A missing check is not a negative finding.</p>}
      </div>
      <div className="border-y border-border py-4 space-y-4 text-sm">
        <div className="min-w-0"><p className="text-subtle">Wallet checked</p><p className="mt-1 font-mono break-all">{report.wallet}</p>{!example && <a href={solanaEvidenceUrl(report.wallet, report.cluster) ?? undefined} target="_blank" rel="noopener noreferrer" className="console-link inline-flex gap-2 items-center min-h-8">Wallet evidence <ExternalLink className="w-3 h-3" aria-hidden="true" /></a>}</div>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div><dt className="text-subtle">Cluster</dt><dd className="mt-1 font-mono">{report.cluster}</dd></div>
          <div><dt className="text-subtle">Finalized slots</dt><dd className="mt-1 font-mono">{report.slotRange ? `${report.slotRange.min} - ${report.slotRange.max}` : 'Not established'}</dd></div>
          <div><dt className="text-subtle">Legacy accounts checked</dt><dd className="mt-1 font-mono">{report.accountsChecked}</dd></div>
        </dl>
      </div>
      <div><h3 className="text-base font-semibold mb-2">Coverage</h3>{report.coverage.map(c => <div key={c.program} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 py-3 border-b border-border text-sm">
        <span>{c.program === LEGACY_TOKEN_PROGRAM ? 'Legacy SPL delegates' : 'Token-2022 account query'}</span>
        <span className={`font-medium ${c.status === 'complete' ? 'text-foreground' : 'text-amber-200'}`}>{c.status}</span>
        <p className="text-xs text-subtle">{c.accountCount === null ? 'No count established' : `${c.accountCount} ${c.accountCount === 1 ? 'account' : 'accounts'}`}</p>
        <details className="col-span-2 text-xs text-subtle"><summary className="min-h-8 inline-flex items-center console-link">Check details</summary><p className="font-mono break-all py-2">{c.reason}</p></details>
      </div>)}</div>
      {report.delegates.map(d => {
        const guidance = solanaPermissionAction(d);
        return <article key={d.account} aria-label={`Permission ${shorten(d.account)}`} className="border-t border-border pt-6 space-y-5">
          <div><h3 className="font-semibold text-lg">{guidance.title}</h3><p className="text-sm text-subtle mt-1">Token account <span className="font-mono" title={d.account}>{shorten(d.account)}</span></p></div>
          <div className="text-sm border-l-2 border-amber-300 pl-4"><h4 className="font-semibold">Next action</h4><p className="mt-2 max-w-3xl leading-relaxed">{guidance.nextAction}</p></div>
          <dl className="grid gap-4 sm:grid-cols-3 text-sm py-4 border-y border-border">
            {[['Account balance (raw)', d.balanceRaw], ['Delegated allowance (raw)', d.delegatedRaw], ['Ordinary upper bound (raw)', d.spendableRaw]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-subtle">{label}</dt><dd className="font-mono text-lg break-all mt-1">{value}</dd></div>)}
          </dl>
          <details className="permission-evidence text-sm">
            <summary>Why review this permission?</summary>
            <dl className="space-y-4">{[['What was detected', example ? 'Synthetic demonstration of a recorded delegate permission; no actual on-chain relationship was established.' : guidance.detected], ['Why it matters', guidance.why], ['Permission capability', guidance.capability], ['What could not be verified', guidance.limits]].map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd className="text-subtle mt-1 leading-relaxed">{value}</dd></div>)}</dl>
          </details>
          <details className="permission-evidence text-sm">
            <summary>{example ? 'Synthetic account evidence' : 'On-chain account evidence'}</summary>
            <dl className="grid gap-4 sm:grid-cols-2">{[['Token account', d.account], ['Delegate authority', d.delegate], ['Mint identity (symbol unverified)', d.mint], ['Token program', d.program], ['Account state', d.state], ['Recorded account balance (raw)', d.balanceRaw], ['Delegated allowance (raw)', d.delegatedRaw], ['Ordinary balance/allowance bound (raw)', d.spendableRaw], [example ? 'Example slot' : 'Finalized slot', String(d.slot)]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-subtle">{label}</dt><dd className="font-mono break-all mt-1">{value}</dd></div>)}</dl>
            <p className="mt-4 text-xs text-subtle leading-relaxed">{example ? 'Synthetic values; no provider call or on-chain relationship established.' : `${report.cluster} / getTokenAccountsByOwner / base64 / official legacy SPL decoder / ${report.generatedAt}. Explorer links show independently viewed current state, not a pinned historical snapshot.`}</p>
            {!example && <nav aria-label="Permission evidence" className="flex flex-wrap gap-x-4 gap-y-2 mt-3">{[['Account evidence', d.account], ['Delegate evidence', d.delegate], ['Mint evidence', d.mint], ['Program evidence', d.program]].map(([label, value]) => <a key={label} href={solanaEvidenceUrl(value, report.cluster) ?? undefined} target="_blank" rel="noopener noreferrer" className="console-link inline-flex gap-2 items-center min-h-8">{label}<ExternalLink className="w-3 h-3" aria-hidden="true" /></a>)}</nav>}
          </details>
          <p className="text-xs text-subtle leading-relaxed">Any change must be reviewed and signed separately by the account owner or its authorized signers. Re-check the account after a confirmed change; Sigil does not revoke permissions.</p>
          <a href="https://solana.com/docs/tokens/basics/revoke-delegate" target="_blank" rel="noopener noreferrer" className="console-link inline-flex min-h-8 gap-2 items-center text-sm">Official revocation reference <ExternalLink className="w-3 h-3" aria-hidden="true" /></a>
        </article>;
      })}
      <div className="border-t border-border pt-5"><h3 className="text-base font-semibold mb-3">Analysis limits</h3><ul className="space-y-2 text-sm text-subtle leading-relaxed">{report.limitations.map(limit => <li key={limit}>{limit}</li>)}</ul></div>
      <details className="permission-evidence text-xs text-subtle"><summary>Snapshot provenance</summary><p className="break-words">{report.reportVersion} / {SOLANA_GUIDANCE_VERSION} / {report.generatedAt}{example ? ' / Synthetic fixture' : ' / Public Solana RPC'}</p></details>
    </section>}
    <section aria-label="Synthetic examples" className="border-t border-border pt-5">
      <h2 className="text-sm font-semibold">Demonstration examples</h2>
      <p className="text-xs text-subtle mt-1">Synthetic data. No live scan or actual wallet exposure.</p>
      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm">
        {([['review', 'Review example'], ['negative', 'No-delegate example'], ['partial', 'Incomplete example'], ['unavailable', 'Unavailable example'], ['frozen', 'Frozen example'], ['zero', 'Zero-bound example']] as const).map(([kind, label]) => <button key={kind} type="button" onClick={() => showExample(kind)} className="console-link inline-flex min-h-11 items-center">{label}</button>)}
      </div>
    </section>
  </div>;
}
