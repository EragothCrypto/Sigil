import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { analysisFixture } from './web-result-fixtures.mjs';

const require = createRequire(new URL('../artifacts/api-server/package.json', import.meta.url));
const viem = require('viem');
const context = vm.createContext({ Buffer, URL, TextEncoder, lookupEntity: () => null, ...viem });
for (const name of ['abi-evidence', 'incident-catalog', 'validated-findings']) {
  const source = readFileSync(new URL(`../artifacts/api-server/src/routes/sigil/${name}.ts`, import.meta.url), 'utf8');
  vm.runInContext(stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm, '').replace(/export /g, '')), context);
}
const parser = readFileSync(new URL('../lib/api-zod/src/validated-report.ts', import.meta.url), 'utf8');
const parserContext = vm.createContext({ URL, TextEncoder });
vm.runInContext(stripTypeScriptTypes(parser.replace(/export /g, '')), parserContext);
const address = analysisFixture.input;
const abi = [
  { type: 'function', name: 'multicall', stateMutability: 'nonpayable', inputs: [{ name: 'calls', type: 'bytes[]' }], outputs: [] },
  { type: 'function', name: 'positions', stateMutability: 'nonpayable', inputs: [{ name: 'positions', type: 'tuple[]', components: [{ name: 'recipient', type: 'address' }, { name: 'amount', type: 'uint256' }] }], outputs: [] },
];
const leaf = viem.encodeFunctionData({ abi, functionName: 'positions', args: [[{ recipient: address, amount: 2n ** 256n - 1n }]] });
const child = viem.encodeFunctionData({ abi, functionName: 'multicall', args: [[leaf]] });
const calldata = viem.encodeFunctionData({ abi, functionName: 'multicall', args: [[child, '0xdeadbeef']] });
const provenance = { network: 'mainnet', address, abiAddress: address, blockTag: '0x123', scope: 'current_only', proxyResolved: false };
const input = context.decodeInputEvidence(abi, calldata, provenance);
const tx = {
  hash: `0x${'aa'.repeat(32)}`, to: address, from: address, input: calldata, value: '0x0',
  blockNumber: provenance.blockTag, inclusionStatus: 'mined', status: '0x1', destinationHasCode: true, destinationVerification: 'verified',
  receiptEvidence: { status: 'available', complete: true, transfers: [] },
  analysisEvidence: { version: 'adapters-v1', network: 'mainnet', subject: address, blockTag: provenance.blockTag,
    input, tokenStates: [], permissionStates: [], coverage: 'partial', limits: ['internal_traces_unavailable'], attempts: 0,
    capabilities: { inputDecoding: true, reportedTokenState: false, reportedPermissionState: false, internalTraces: false, isolatedBalanceDeltas: false } },
};
const rendered = JSON.parse(JSON.stringify(context.renderFindings(context.transactionFindings(tx, 'mainnet', null, null))));
const report = rendered.validatedReport;
assert.ok(parserContext.parseValidatedReport({ validatedReport: report }), 'Actual producer report must survive client validation');
assert.ok(!report.findings.some(f => f.code === 'adapter_evidence_invalid'), 'Adapter boundary must accept actual decoder output');
export const producerNestedFixture = {
  ...structuredClone(analysisFixture), ...rendered, id: '12345678-1234-4234-8234-123456789ab7',
  summary: 'Synthetic actual decoder and finding inventory output; no signing clearance.', details: { validatedReport: report },
};
