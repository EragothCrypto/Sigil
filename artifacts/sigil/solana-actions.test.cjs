const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {createRequire} = require('node:module');
const ts = require('typescript');
const vm = require('node:vm');
const zodRequire = createRequire(`${__dirname}/../../lib/api-zod/package.json`);
function compile(file, require) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText, {exports, require, Date, Set, Map, Buffer, BigInt, URL});
  return exports;
}
function load() {
  const api = compile(`${__dirname}/../../lib/api-zod/src/generated/api.ts`, zodRequire);
  const reports = compile(`${__dirname}/src/lib/solana-report.ts`, name => name === '@workspace/api-zod' ? api : zodRequire(name));
  return {...reports, ...compile(`${__dirname}/src/lib/solana-actions.ts`, () => reports)};
}
test('action summary separates complete absence, partial and unavailable; known permission review wins without hiding gaps', () => {
  const m = load();
  for (const [kind, expected] of [['review', 'REVIEW_PERMISSION'], ['negative', 'NO_DELEGATE_IN_CHECKED_SCOPE'], ['partial', 'INCOMPLETE'], ['unavailable', 'UNAVAILABLE']]) {
    const r = m.solanaExample(kind);
    assert.ok(m.parseSolanaReport(r, r.wallet, r.cluster), kind);
    assert.equal(m.solanaAction(r).outcome, expected);
  }
  const r = m.solanaExample('review'); r.coverage[1].status = 'unsupported'; r.coverage[1].accountCount = 1;
  assert.equal(m.solanaAction(r).outcome, 'REVIEW_PERMISSION');
  assert.equal(m.solanaAction(r).incomplete, true);
});
test('permission guidance preserves exact u64 bounds and explains frozen/zero without claiming safety or malicious intent', () => {
  const m = load();
  for (const kind of ['review', 'frozen', 'zero']) {
    const r = m.solanaExample(kind); assert.ok(m.parseSolanaReport(r, r.wallet, r.cluster));
    const guidance = m.solanaPermissionAction(r.delegates[0]);
    assert.match(guidance.nextAction, /expected|recognize/i);
    assert.match(guidance.limits, /mint|simulation/i);
    assert.doesNotMatch(guidance.title, /malicious|safe|attack/i);
  }
  assert.match(m.solanaPermissionAction(m.solanaExample('frozen').delegates[0]).capability, /frozen/i);
  assert.match(m.solanaPermissionAction(m.solanaExample('zero').delegates[0]).capability, /zero/i);
  const r = m.solanaExample('review'); r.delegates[0].balanceRaw = r.delegates[0].delegatedRaw = r.delegates[0].spendableRaw = '18446744073709551615';
  assert.ok(m.parseSolanaReport(r, r.wallet, r.cluster));
  assert.match(m.solanaPermissionAction(r.delegates[0]).capability, /18446744073709551615/);
});
test('evidence links are fixed-host, cluster-bound and never constructed from untrusted provider URLs', () => {
  const m = load(); const address = m.solanaExample('review').delegates[0].account;
  assert.equal(new URL(m.solanaEvidenceUrl(address, 'mainnet-beta')).hostname, 'explorer.solana.com');
  assert.equal(new URL(m.solanaEvidenceUrl(address, 'devnet')).searchParams.get('cluster'), 'devnet');
  for (const bad of ['https://evil.invalid', 'javascript:alert(1)', '1'.repeat(64)]) assert.equal(m.solanaEvidenceUrl(bad, 'devnet'), null);
  assert.equal(m.solanaEvidenceUrl(address, 'evil'), null);
});
test('action-first UI answers permission questions and keeps examples and remediation read-only', () => {
  const page = readFileSync(`${__dirname}/src/pages/solana-monitor.tsx`, 'utf8');
  for (const text of ['Next action', 'What was detected', 'Why it matters', 'Permission capability', 'What could not be verified', 'Load Mainnet address', 'No-delegate example', 'Incomplete example']) assert.ok(page.includes(text), text);
  assert.match(page, /solanaAction\(report\)/);
  assert.match(page, /!example/);
  assert.match(page, /example \? 'Synthetic account evidence' : 'On-chain account evidence'/);
  assert.match(page, /Synthetic values; no provider call or on-chain relationship established/);
  assert.match(page, /Synthetic demonstration of a recorded delegate permission/);
  assert.doesNotMatch(page, /signTransaction|sendTransaction|window\.solana|setInterval|dangerouslySetInnerHTML/);
});
test('official token codec -> actual evaluator -> generated client contract -> action report preserves supported negative and failure branches', () => {
  const m = load(); const backendRequire = createRequire(`${__dirname}/../api-server/package.json`);
  const kit = backendRequire('@solana/kit'); const token = backendRequire('@solana-program/token');
  const evaluate = compile(`${__dirname}/../api-server/src/monitoring/chains/solana/wallet-state.ts`, backendRequire).evaluateSolanaWallet;
  const wallet = m.solanaExample('review').wallet;
  const bytes = token.getTokenEncoder().encode({mint: kit.address('So11111111111111111111111111111111111111112'), owner: kit.address(wallet), amount: 500n,
    delegate: kit.some(kit.address('Vote111111111111111111111111111111111111111')), state: token.AccountState.Initialized,
    isNative: kit.none(), delegatedAmount: 250n, closeAuthority: kit.none()});
  const account = {pubkey: 'So11111111111111111111111111111111111111112', account: {owner: token.TOKEN_PROGRAM_ADDRESS, executable: false, data: [Buffer.from(bytes).toString('base64'), 'base64']}};
  for (const [legacy, token2022, expected] of [
    [{slot: 1, accounts: [account]}, {slot: 2, accounts: []}, 'REVIEW_PERMISSION'],
    [{slot: 1, accounts: []}, {slot: 2, accounts: []}, 'NO_DELEGATE_IN_CHECKED_SCOPE'],
    [{slot: 1, accounts: []}, {reason: 'solana_rpc_unavailable'}, 'INCOMPLETE'],
    [{reason: 'solana_rpc_unavailable'}, {reason: 'solana_rpc_unavailable'}, 'UNAVAILABLE'],
    [{slot: 1, accounts: [{...account, account: {...account.account, data: ['AAAA', 'base64']}}]}, {slot: 2, accounts: []}, 'INCOMPLETE'],
  ]) {
    const report = evaluate(wallet, 'devnet', {legacy, token2022});
    const parsed = m.parseSolanaReport(report, wallet, 'devnet'); assert.ok(parsed);
    assert.equal(m.solanaAction(parsed).outcome, expected);
  }
});
test('malformed or inflated permission data cannot enter the actionable presenter through the report gate', () => {
  const m = load();
  for (const mutate of [r => r.delegates[0].spendableRaw = '501', r => r.delegates[0].delegate = 'javascript:alert(1)',
    r => r.delegates[0].slot = 101, r => r.delegates[0].program = m.TOKEN_2022_PROGRAM, r => r.status = 'no_delegates_found',
    r => r.delegates[0].balanceRaw = '18446744073709551616']) {
    const r = m.solanaExample('review'); mutate(r); assert.equal(m.parseSolanaReport(r, r.wallet, r.cluster), null);
  }
});
