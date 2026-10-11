const { test } = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const vm = require('node:vm');
const ts = require('typescript');
const localRequire = createRequire(__filename);
const file = `${__dirname}/wallet-state.ts`;
const WALLET = '11111111111111111111111111111111';
const MINT = 'So11111111111111111111111111111111111111112';
const DELEGATE = 'Vote111111111111111111111111111111111111111';
let moduleExports;
function load() {
  if (moduleExports) return moduleExports;
  assert.ok(existsSync(file), 'wallet-state implementation must exist');
  const output = ts.transpileModule(readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  moduleExports = {};
  vm.runInNewContext(output, {exports: moduleExports, require: localRequire, Buffer, Date, Set, Map});
  return moduleExports;
}
function fixture(overrides = {}) {
  const kit = localRequire('@solana/kit');
  const token = localRequire('@solana-program/token');
  const data = token.getTokenEncoder().encode({mint: kit.address(MINT), owner: kit.address(WALLET), amount: 500n,
    delegate: kit.some(kit.address(DELEGATE)), state: token.AccountState.Initialized,
    isNative: kit.none(), delegatedAmount: 250n, closeAuthority: kit.none(), ...overrides});
  return {pubkey: MINT, account: {owner: token.TOKEN_PROGRAM_ADDRESS, executable: false, data: [Buffer.from(data).toString('base64'), 'base64']}};
}
test('address validation is chain-native and rejects hex, malformed base58 and non-string values', () => {
  const {validSolanaAddress} = load();
  assert.equal(validSolanaAddress(WALLET), true);
  for (const input of ['0x' + '1'.repeat(40), 'O0bad', '1'.repeat(33), null, 1]) assert.equal(validSolanaAddress(input), false);
});
test('ordinary delegate produces review only and exact raw integer bound', () => {
  const report = load().evaluateSolanaWallet(WALLET, 'devnet', {legacy: {slot: 100, accounts: [fixture()]}, token2022: {slot: 101, accounts: []}});
  assert.equal(report.status, 'review');
  assert.equal(report.delegates[0].delegate, DELEGATE);
  assert.equal(report.delegates[0].spendableRaw, '250');
  assert.equal(report.delegates[0].delegatedRaw, '250');
  assert.equal(report.slotRange.min, 100);
  assert.equal(report.slotRange.max, 101);
});
test('u64 amounts retain precision; frozen and empty accounts have no ordinary spendable claim', () => {
  const token = localRequire('@solana-program/token');
  const evaluate = load().evaluateSolanaWallet;
  const max = 18446744073709551615n;
  const report = evaluate(WALLET, 'devnet', {legacy: {slot: 1, accounts: [fixture({amount: max, delegatedAmount: max})]}, token2022: {slot: 1, accounts: []}});
  assert.equal(report.delegates[0].spendableRaw, max.toString());
  for (const overrides of [{state: token.AccountState.Frozen}, {amount: 0n}, {delegatedAmount: 0n}]) {
    const result = evaluate(WALLET, 'devnet', {legacy: {slot: 1, accounts: [fixture(overrides)]}, token2022: {slot: 1, accounts: []}});
    assert.equal(result.delegates[0].spendableRaw, '0');
  }
});
test('complete empty supported scope differs from RPC failure and unsupported Token-2022', () => {
  const evaluate = load().evaluateSolanaWallet;
  assert.equal(evaluate(WALLET, 'devnet', {legacy: {slot: 1, accounts: []}, token2022: {slot: 1, accounts: []}}).status, 'no_delegates_found');
  assert.equal(evaluate(WALLET, 'devnet', {legacy: {reason: 'rpc_unavailable'}, token2022: {slot: 1, accounts: []}}).status, 'unavailable');
  assert.equal(evaluate(WALLET, 'devnet', {legacy: {slot: 1, accounts: []}, token2022: {reason: 'rpc_unavailable'}}).status, 'partial');
  assert.equal(evaluate(WALLET, 'devnet', {legacy: {slot: 1, accounts: []}, token2022: {slot: 1, accounts: [fixture()]}}).status, 'partial');
});
test('wrong outer owner, decoded authority owner, corrupt bytes and account cap cannot yield clean negative', () => {
  const kit = localRequire('@solana/kit');
  const evaluate = load().evaluateSolanaWallet;
  const wrongProgram = fixture(); wrongProgram.account.owner = DELEGATE;
  const corrupt = fixture(); corrupt.account.data[0] = 'AAAA';
  const wrongAuthority = fixture({owner: kit.address(DELEGATE)});
  for (const accounts of [[wrongProgram], [corrupt], [wrongAuthority], Array.from({length: 101}, () => fixture())]) {
    const report = evaluate(WALLET, 'devnet', {legacy: {slot: 1, accounts}, token2022: {slot: 1, accounts: []}});
    assert.notEqual(report.status, 'no_delegates_found');
    assert.notEqual(report.coverage[0].status, 'complete');
  }
});
test('malformed COption discriminants are not interpreted as absent delegate or valid authority state', () => {
  for (const offset of [72, 109, 129]) for (const tag of [2, 256, 0xffffffff]) {
    const account = fixture(); const bytes = Buffer.from(account.account.data[0], 'base64');
    bytes.writeUInt32LE(tag, offset); account.account.data[0] = bytes.toString('base64');
    const report = load().evaluateSolanaWallet(WALLET, 'devnet', {legacy: {slot: 1, accounts: [account]}, token2022: {slot: 1, accounts: []}});
    assert.equal(report.status, 'partial', `invalid COption at ${offset} with ${tag}`);
    assert.equal(report.accountsChecked, 0);
  }
});
