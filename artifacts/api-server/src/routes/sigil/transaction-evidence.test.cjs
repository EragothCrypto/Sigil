const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');
const vm = require('node:vm');
const { test } = require('node:test');
function load(file, globals = {}) {
  const context = vm.createContext(globals);
  vm.runInContext(stripTypeScriptTypes(readFileSync(`${__dirname}/${file}.ts`, 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, ''), { mode: 'transform' }), context);
  return context;
}
function loadEthereum(tx, receipt, explorer = { status: '0', result: 'NOTOK' }, code = '0x6000') {
  const api = load('transaction-evidence');
  Object.assign(api, {
    URL, AbortSignal, logger: { warn() {} }, getEtherscanApiKey: () => 'test-only',
    fetch: async (url, options) => ({ ok: true, json: async () => options?.body
      ? { result: JSON.parse(options.body).method === 'eth_getTransactionByHash' ? tx : JSON.parse(options.body).method === 'eth_getCode' ? code : receipt }
      : explorer }),
  });
  vm.runInContext(stripTypeScriptTypes(readFileSync(`${__dirname}/ethereum.ts`, 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '')), api);
  return api;
}

test('transaction lookup falls back after null, malformed and mismatched results', async () => {
  const hash = `0x${'aa'.repeat(32)}`;
  const tx = { hash, from: address, to: address, value: '0x0', input: '0x', blockNumber: '0x1', blockHash: hash };
  for (const first of [null, [], {}, { ...tx, hash: `0x${'bb'.repeat(32)}` }, { ...tx, input: 'invalid' }]) {
    const api = loadEthereum(tx, null);
    const fetch = api.fetch;
    let calls = 0;
    api.fetch = async (url, options) => {
      if (options?.body && JSON.parse(options.body).method === 'eth_getTransactionByHash' && ++calls === 1) return { ok: true, json: async () => ({ result: first }) };
      return fetch(url, options);
    };
    const result = await api.fetchTransaction(hash, 'mainnet');
    assert.equal(result?.hash, hash);
    assert.equal(calls, 2);
  }
});

test('unavailable transaction tries only existing endpoints and never queries receipt or explorer', async () => {
  const api = loadEthereum(null, null);
  const methods = [];
  api.fetch = async (_url, options) => {
    methods.push(options?.body ? JSON.parse(options.body).method : 'explorer');
    return { ok: true, json: async () => ({ result: null }) };
  };
  assert.equal(await api.fetchTransaction(`0x${'aa'.repeat(32)}`, 'mainnet'), null);
  assert.equal(methods.length, 4);
  assert.ok(methods.every(method => method === 'eth_getTransactionByHash'));
});

test('valid contract creation is accepted and does not request destination metadata', async () => {
  const hash = `0x${'aa'.repeat(32)}`;
  const tx = { hash, from: address, to: null, value: '0x0', input: '0x6000', blockNumber: '0x1', blockHash: hash };
  const receipt = { transactionHash: hash, blockNumber: '0x1', blockHash: hash, status: '0x1', logs: [] };
  const api = loadEthereum(tx, receipt);
  const fetch = api.fetch;
  const methods = [];
  api.fetch = async (url, options) => { methods.push(options?.body ? JSON.parse(options.body).method : 'explorer'); return fetch(url, options); };
  const result = await api.fetchTransaction(hash, 'mainnet');
  assert.equal(result.to, 'contract creation');
  assert.equal(result.status, '0x1');
  assert.deepEqual(methods, ['eth_getTransactionByHash', 'eth_getTransactionReceipt']);
});

test('fresh cache namespace cannot reuse legacy missing-evidence verdicts', () => {
  const api = load('analysis-cache', { setInterval() {} });
  const oldKey = 'evidence-v2:mainnet:hash';
  vm.runInContext(`analysisCache.set('${oldKey}', { riskScore: 35 })`, api);
  assert.equal(api.cacheKey('HASH', 'MAINNET'), 'findings-v1:mainnet:hash');
  assert.equal(vm.runInContext("analysisCache.get(cacheKey('hash', 'mainnet'))", api), null);
});

test('mined transaction recovers receipt from a fallback after an empty response', async () => {
  const hash = `0x${'aa'.repeat(32)}`;
  const tx = { hash, from: address, to: address, value: '0x0', input: '0x', blockNumber: '0x1', blockHash: hash };
  const receipt = { transactionHash: hash, blockNumber: '0x1', blockHash: hash, status: '0x1', logs: [log] };
  const api = loadEthereum(tx, receipt);
  let calls = 0;
  const originalFetch = api.fetch;
  api.fetch = async (url, options) => {
    if (options?.body && JSON.parse(options.body).method === 'eth_getTransactionReceipt' && ++calls === 1) return { ok: true, json: async () => ({ result: null }) };
    return originalFetch(url, options);
  };
  const result = await api.fetchTransaction(hash, 'mainnet');
  assert.equal(result.status, '0x1');
  assert.equal(result.inclusionStatus, 'mined');
  assert.equal(result.receiptEvidence.transfers.length, 1);
  assert.equal(calls, 2);
});

test('missing mined receipt preserves inclusion and a sanitized diagnostic', async () => {
  const hash = `0x${'aa'.repeat(32)}`;
  const tx = { hash, from: address, to: address, value: '0x0', input: '0x', blockNumber: '0x1', blockHash: hash };
  const result = await loadEthereum(tx, null).fetchTransaction(hash, 'mainnet');
  assert.equal(result.inclusionStatus, 'mined');
  assert.equal(result.status, undefined);
  assert.equal(result.receiptIssue, 'not_returned');
  const pending = await loadEthereum({ ...tx, blockNumber: null, blockHash: null }, null).fetchTransaction(hash, 'mainnet');
  assert.equal(pending.inclusionStatus, 'pending');
  assert.equal(pending.receiptIssue, 'not_returned');
});

test('pending null receipt stops after one endpoint; mismatched mined receipts are rejected', async () => {
  const hash = `0x${'aa'.repeat(32)}`;
  const tx = { hash, from: address, to: address, value: '0x0', input: '0x', blockNumber: null, blockHash: null };
  const api = loadEthereum(tx, null);
  let calls = 0;
  const fetch = api.fetch;
  api.fetch = async (url, options) => {
    if (options?.body && JSON.parse(options.body).method === 'eth_getTransactionReceipt') calls++;
    return fetch(url, options);
  };
  const pending = await api.fetchTransaction(hash, 'mainnet');
  assert.equal(pending.inclusionStatus, 'pending');
  assert.equal(calls, 1);
  const mined = { ...tx, blockNumber: '0x1', blockHash: hash };
  const invalid = await loadEthereum(mined, { transactionHash: `0x${'bb'.repeat(32)}`, blockNumber: '0x1', blockHash: hash, status: '0x1', logs: [log] }).fetchTransaction(hash, 'mainnet');
  assert.equal(invalid.receiptIssue, 'identity_mismatch');
  assert.equal(invalid.status, undefined);
  assert.equal(invalid.receiptEvidence.transfers.length, 0);
});

test('missing JSON-RPC result and malformed receipt use fallback rather than ending evidence gathering', async () => {
  const hash = `0x${'aa'.repeat(32)}`;
  const tx = { hash, from: address, to: address, value: '0x0', input: '0x', blockNumber: '0x1', blockHash: hash };
  const receipt = { transactionHash: hash, blockNumber: '0x1', blockHash: hash, status: '0x1', logs: [] };
  const api = loadEthereum(tx, receipt);
  let calls = 0;
  const fetch = api.fetch;
  api.fetch = async (url, options) => {
    if (options?.body && JSON.parse(options.body).method === 'eth_getTransactionReceipt') {
      calls++;
      if (calls === 1) return { ok: true, json: async () => ({ jsonrpc: '2.0', id: 1 }) };
      if (calls === 2) return { ok: true, json: async () => ({ result: { ...receipt, status: 'unexpected' } }) };
    }
    return fetch(url, options);
  };
  const result = await api.fetchTransaction(hash, 'mainnet');
  assert.equal(calls, 3);
  assert.equal(result.status, '0x1');
  assert.equal(result.receiptIssue, undefined);
});
const topic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const address = `0x${'11'.repeat(20)}`;
const word = `0x${'0'.repeat(24)}${'22'.repeat(20)}`;
const log = { address, topics: [topic, word, word], data: `0x${'0'.repeat(63)}1` };
test('receipt evidence separates ERC20 quantities and ERC721 token IDs', () => {
  const api = load('transaction-evidence');
  const result = api.summarizeReceipt({ status: '0x1', logs: [log, { ...log, topics: [...log.topics, log.data], data: '0x' }] });
  assert.equal(result.complete, true);
  assert.equal(result.transfers[0].amountRaw, '1');
  assert.equal(result.transfers[1].tokenIdRaw, '1');
  assert.equal(result.transfers[1].amountRaw, undefined);
});
test('missing, reverted and malformed evidence never implies no asset movement', () => {
  const api = load('transaction-evidence');
  for (const receipt of [null, {}, { status: '0x1' }, { status: '0x0', logs: [log] }]) {
    const result = api.summarizeReceipt(receipt);
    assert.equal(result.complete, false);
    assert.equal(result.transfers.length, 0);
  }
  const result = api.summarizeReceipt({ status: '0x1', logs: [{ ...log, data: '0x1' }, log] });
  assert.equal(result.complete, false);
  assert.equal(result.transfers.length, 1);
});
test('receipt processing and persisted transfers are bounded', () => {
  const api = load('transaction-evidence');
  const result = api.summarizeReceipt({ status: '0x1', logs: Array(250).fill(log) });
  assert.equal(result.complete, false);
  assert.equal(result.logsExamined, 200);
  assert.equal(result.transfers.length, 50);
});

test('empty receipts and self/mint/burn events remain observations without net-loss inference', () => {
  const api = load('transaction-evidence');
  const empty = api.summarizeReceipt({ status: '0x1', logs: [] });
  assert.equal(empty.status, 'available');
  assert.equal(empty.complete, true);
  const zero = `0x${'0'.repeat(64)}`;
  const result = api.summarizeReceipt({ status: '0x1', logs: [log, { ...log, topics: [topic, zero, word] }, { ...log, topics: [topic, word, zero] }, log] });
  assert.equal(result.transfers.length, 4);
  assert.equal(result.transfers[0].from, result.transfers[0].to);
  assert.equal(result.transfers[1].from, `0x${'0'.repeat(40)}`);
  assert.equal(result.transfers[2].to, `0x${'0'.repeat(40)}`);
  assert.equal(result.netLoss, undefined);
});
test('explorer errors are not token metadata or unverified evidence', () => {
  const api = load('transaction-evidence');
  for (const envelope of [{ status: '0', result: 'NOTOK' }, { status: '1', result: [null] }, { status: '1', result: [{ ContractName: 'Name' }] }]) {
    assert.equal(api.readContractMetadata(address, envelope, envelope).verificationStatus, 'unknown');
    assert.equal(api.readContractMetadata(address, envelope, envelope).isToken, undefined);
  }
  assert.equal(api.readContractMetadata(address, { status: '1', result: [{ ABI: '[]' }] }, null).verificationStatus, 'verified');
  assert.equal(api.readContractMetadata(address, { status: '1', result: [{ ABI: 'Contract source code not verified' }] }, null).verificationStatus, 'unverified');
});
test('historical example labels match the full hash and network only', () => {
  const api = load('transaction-evidence');
  const hash = '0xc310a0affe2169d1f6feec1c63dbc7f7c62a887fa48795d327d4d2da2d6b111d';
  assert.equal(api.historicalExample(hash.toUpperCase(), 'mainnet').name, 'Euler exploit example');
  assert.equal(api.historicalExample(hash, 'base'), undefined);
  assert.equal(api.historicalExample(`${hash.slice(0, -1)}0`, 'mainnet'), undefined);
});

test('acquisition binds receipt identity and preserves unknown explorer status', async () => {
  const hash = `0x${'aa'.repeat(32)}`;
  const tx = { hash, from: address, to: address, value: '0x0', input: '0x', blockNumber: '0x1', blockHash: hash };
  const receipt = { transactionHash: hash, blockNumber: '0x1', blockHash: hash, status: '0x1', logs: [log] };
  const good = await loadEthereum(tx, receipt).fetchTransaction(hash, 'mainnet');
  assert.equal(good.destinationVerification, 'unknown');
  assert.equal(good.receiptEvidence.transfers.length, 1);
  for (const bad of [{ ...receipt, transactionHash: `0x${'bb'.repeat(32)}` }, { ...receipt, blockHash: 'other' }, null]) {
    assert.equal((await loadEthereum(tx, bad).fetchTransaction(hash, 'mainnet')).receiptEvidence.status, 'unavailable');
  }
  assert.equal(await loadEthereum({ ...tx, hash: 'other' }, receipt).fetchTransaction(hash, 'mainnet'), null);
});

test('unsupported networks never fall back to mainnet and zero increases are not revokes', async () => {
  const api = loadEthereum(null, null);
  await assert.rejects(api.rpcCall('unsupported', 'method', []), /Unsupported network/);
  await assert.rejects(api.etherscanFetch('unsupported', {}), /Unsupported network/);
  assert.equal(api.decodeApprovalCalldata(`0x39509351${word.slice(2)}${'0'.repeat(64)}`).isRevoke, false);
  const approval = api.decodeApprovalCalldata(`0x095ea7b3${word.slice(2)}${'0'.repeat(63)}1`);
  assert.match(api.formatApprovalAmount(approval), /raw units.*decimals unknown/);
});

test('valid token metadata, invalid ABI and malformed address topics are distinguished', () => {
  const api = load('transaction-evidence');
  const token = { status: '1', result: [{ tokenName: 'Token', symbol: 'TOK', totalSupply: '1000' }] };
  assert.equal(api.readContractMetadata(address, { status: '1', result: [{ ABI: '{bad' }] }, token).isToken, true);
  assert.equal(api.readContractMetadata(address, { status: '1', result: [{ ABI: '{}' }] }, token).verificationStatus, 'unknown');
  const result = api.summarizeReceipt({ status: '0x1', logs: [{ ...log, topics: [topic, `0x${'ff'.repeat(32)}`, word] }, { ...log, removed: true }] });
  assert.equal(result.malformedTransferLogs, 2);
  assert.equal(result.complete, false);
});

test('invalid ABI entries do not establish verification', () => {
  const api = load('transaction-evidence');
  for (const abi of ['[null]', '[123]', '[{}]', '[{"type":"function","name":"f","inputs":[null]}]', ...['garbage', 'uint999', 'tuple'].map(type => JSON.stringify([{ type: 'function', name: 'f', inputs: [{ type }] }]))]) {
    assert.equal(api.readContractMetadata(address, { status: '1', result: [{ ABI: abi }] }, null).verificationStatus, 'unknown');
  }
  const ABI = JSON.stringify([{ type: 'function', name: 'balanceOf', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] }]);
  assert.equal(api.readContractMetadata(address, { status: '1', result: [{ ABI }] }, null).verificationStatus, 'verified');
});

test('EOA destination does not receive an unverified-contract finding', async () => {
  const hash = `0x${'aa'.repeat(32)}`;
  const tx = { hash, from: address, to: address, value: '0x0', input: '0x', blockNumber: '0x1', blockHash: hash };
  const result = await loadEthereum(tx, null, { status: '1', result: [{ ABI: 'Contract source code not verified' }] }, '0x').fetchTransaction(hash, 'mainnet');
  assert.equal(result.destinationHasCode, false);
  assert.equal(result.destinationVerification, 'unknown');
});

test('approval factors and UI describe intent without claiming granted or revoked permission', () => {
  const api = load('score-factors');
  const factors = api.computeScoreFactors({ inputType: 'transaction', riskScore: 40, patterns: [], approvalInfo: { isApproval: true, isRevoke: true } });
  assert.equal(factors.find(factor => factor.category === 'approval').delta, 0);
  assert.doesNotMatch(factors.map(factor => factor.detail).join(' '), /removes a previously granted/);
  const ui = readFileSync(`${__dirname}/../../../../sigil/src/components/sigil/ApprovalInspector.tsx`, 'utf8');
  assert.doesNotMatch(ui, /Permission Revoked|You are granting|This transaction <strong>removes/);
  assert.match(ui, /executed permission not checked/);
});

test('common selectors alone do not claim a detected exploit', () => {
  const api = load('pattern-detector');
  for (const methodId of ['0xd505accf', '0xb6b55f25']) {
    const result = api.detectPatterns({ methodId });
    assert.equal(result[0].confidence, 'low');
    assert.equal(result[0].type, 'suspicious');
    assert.doesNotMatch(result[0].name, /attack|exploit/i);
  }
});

test('static approval candidates preserve failed/pending and NFT-semantic uncertainty', () => {
  const api = load('pattern-detector');
  for (const status of ['0x0', undefined]) {
    const candidates = api.detectPatterns({ tx: { status }, methodId: '0x095ea7b3', isUnlimitedApproval: true, spenderKnown: false });
    assert.equal(candidates[0].type, 'suspicious');
    assert.match(candidates[0].description, /NFT token ID/);
    assert.doesNotMatch(candidates.map(candidate => `${candidate.description} ${candidate.historicalContext ?? ''}`).join(' '), /requests unlimited spending rights|can drain your entire balance/);
  }
});
