const assert = require('node:assert/strict');
const {existsSync, readFileSync} = require('node:fs');
const vm = require('node:vm');
const {test} = require('node:test');
const path = require('node:path');
const {pathToFileURL, fileURLToPath} = require('node:url');
const {registerHooks} = require('node:module');
// Resolve the workspace's portable pnpm map when Windows symlinks are unavailable.
const modules = path.resolve(__dirname, '../../node_modules');
const mapPath = path.join(modules, '.package-map.json');
const packages = existsSync(mapPath) ? JSON.parse(readFileSync(mapPath, 'utf8')).packages : null;
if (packages) registerHooks({resolve(specifier, context, next) {
  try { return next(specifier, context); } catch (error) {
    const name = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];
    const parent = context.parentURL?.startsWith('file:') ? fileURLToPath(context.parentURL) : '';
    const owner = Object.values(packages).find(p => p.url !== '..' && parent.startsWith(path.resolve(modules, p.url) + path.sep));
    const key = owner?.dependencies[name] ?? Object.keys(packages).find(k => k.startsWith(name + '@'));
    if (!packages[key]) throw error;
    const directory = path.resolve(modules, packages[key].url);
    const manifest = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
    const suffix = specifier.slice(name.length);
    return next(pathToFileURL(path.join(directory, suffix || manifest.main || 'index.js')).href, context);
  }
}});
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
function load(path, imports) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX}}).outputText,
    {exports, require: name => imports[name] ?? require(name), URL, TextEncoder});
  return exports;
}
const parser = load(`${__dirname}/../../lib/api-zod/src/validated-report.ts`, {});
const stub = () => React.createElement('span', null, 'LEGACY_WIDGET');
const imports = {'@/lib/validated-report': parser, '@/hooks/use-toast': {useToast: () => ({toast() {}})}, './JargonTooltip': {JargonText: ({text}) => text}, './ShareButton': {ShareButton: () => React.createElement('button', null, 'Share report on X')}, './RiskRing': {RiskRing: ({score}) => React.createElement('span', null, `RING:${score}`)}};
imports['lucide-react'] = new Proxy({}, {get: () => () => null});
for (const name of ['ApprovalInspector', 'TransactionBreakdown', 'ContractReputationCard', 'PatternDetectionCard', 'ContractDiffView', 'RiskScoreBreakdown']) imports[`./${name}`] = {[name]: stub};
const {AnalysisResultView} = load(`${__dirname}/src/components/sigil/AnalysisResultView.tsx`, imports);
const base = {verdict: 'caution', verdictReason: 'Review evidence', riskScore: 99, riskLevel: 'critical', network: 'mainnet', inputType: 'contract', input: `0x${'1'.repeat(40)}`, summary: 'Assessment', warnings: [], positives: [], approvalInfo: {isApproval: true}, reputation: {}, patterns: [{}], scoreFactors: [{}], breakdown: {}, knownEntity: {name: 'UNSAFE_TRUST', category: 'Token', trustLevel: 'trusted'}};
const legacy = {version: 'findings-v1', scorePolicy: 'max-floor-v1', findings: [{id: 'f:source_verified', code: 'source_verified', category: 'supported_indicator', text: 'Source inspectable, not audited.', evidenceRefs: ['e:source_verified']}], evidence: [{id: 'e:source_verified', kind: 'source_verified', subject: 'mainnet:destination', value: 'verified'}]};
const report = {...legacy, version: 'findings-v2', scorePolicy: 'dual-floor-v2', evidenceRiskScore: null, uncertaintyScore: 35, decisionScore: 35, coverage: 'partial', capabilities: {sourceVerification: true, receiptEvents: false, incidentLookup: true, inputDecoding: false, reportedTokenState: false, reportedPermissionState: false, internalTraces: false, isolatedBalanceDeltas: false}};
const render = validatedReport => renderToStaticMarkup(React.createElement(AnalysisResultView, {data: {...base, details: {validatedReport, unsafeObservation: 'RAW_UNSAFE'}}}));

test('decision, reason and grounded next action precede explanation and scores', () => {
  const html = render(report);
  assert.match(html, /Next action/);
  assert.ok(html.indexOf('Proceed with Caution') < html.indexOf('Review evidence'));
  assert.ok(html.indexOf('Next action') < html.indexOf('Assessment'));
  assert.ok(html.indexOf('Assessment') < html.indexOf('Evidence-backed risk'));
  assert.doesNotMatch(html, /Should I sign this\?|radial-gradient|fade-in|rounded-2xl/);
  for (const [score, label, advice] of [[25, 'No Concrete Warning Signs Detected', 'Verify the destination'], [60, 'Proceed with Caution', 'Resolve the recorded limitations'], [61, 'Do Not Sign', 'Do not sign this request']]) {
    const result = render({...report, uncertaintyScore: score, decisionScore: score});
    assert.ok(result.includes(label), label);
    assert.ok(result.includes(advice), advice);
    assert.doesNotMatch(result, /revoke|currently exposed|funds are safe/i);
  }
});

test('full selectable input, visible coverage and secondary disclosures retain report contents', () => {
  const html = render(report);
  assert.match(html, new RegExp(`<code[^>]*select-text[^>]*>${base.input}</code>`));
  assert.match(html, /title="Copy input"/);
  assert.match(html, /<summary[^>]*>Scores and methodology<\/summary>/);
  assert.match(html, /<summary[^>]*>Check capabilities<\/summary>/);
  assert.match(html, /Coverage: <strong>Partial<\/strong>/);
  assert.match(html, /<summary[^>]*>Supporting Evidence \(1\)<\/summary>/);
  assert.match(html, /Source inspectable, not audited\./);
  assert.match(html, /<summary[^>]*>Recorded evidence<\/summary>/);
  assert.ok(html.indexOf('Share report on X') > html.indexOf('Recorded evidence'));
});

test('EVM page and share control use compact neutral surfaces without entrance animation', () => {
  const share = readFileSync(`${__dirname}/src/components/sigil/ShareButton.tsx`, 'utf8');
  const page = readFileSync(`${__dirname}/src/pages/analysis.tsx`, 'utf8');
  assert.match(share, /Share report on X/);
  assert.doesNotMatch(share, /w-full|VERDICT_STYLE|group-hover:scale|py-4/);
  assert.doesNotMatch(page, /motion\.|framer-motion|blur-xl|rounded-2xl|tracking-widest/);
  assert.match(page, /Previously saved report/);
});

test('finding disclosures retain escaped evidence and every recorded transfer', () => {
  const address = base.input;
  const html = render({...report, evidence: [{...report.evidence[0], value: '<script>alert(1)</script>', transfers: [
    {kind: 'erc20-shaped', token: address, from: address, to: address, amountRaw: '321'},
    {kind: 'erc721-shaped', token: address, from: address, to: address, tokenIdRaw: '654'},
  ]}]});
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /Raw amount: 321/);
  assert.match(html, /Raw token ID: 654/);
});

test('legacy metrics and warnings remain available behind disclosures', () => {
  const html = renderToStaticMarkup(React.createElement(AnalysisResultView, {data: {...base, inputType: 'transaction', breakdown: null, warnings: ['Legacy warning'], positives: ['Legacy positive']}}));
  assert.match(html, /RING:99/);
  assert.match(html, /Legacy warning/);
  assert.match(html, /Legacy positive/);
  assert.match(html, /Run a fresh analysis before relying/);
  assert.match(html, /<summary[^>]*>Legacy findings and evidence<\/summary>/);
});

test('normal package installations do not require a Windows portable package map', () => {
  const bootstrap = readFileSync(__filename, 'utf8').split("const ts = require('typescript');")[0];
  assert.doesNotThrow(() => vm.runInNewContext(bootstrap, {__dirname, require: name => {
    if (name === 'node:fs') return {existsSync: () => false, readFileSync: () => {throw new Error('portable map must not be read');}};
    if (name === 'node:module') return {registerHooks: () => {}};
    return require(name);
  }}));
});
test('v2 separates evidenced risk from coverage and decision heuristic', () => {
  const html = render(report);
  for (const text of ['Evidence-backed risk', 'No concrete risk established', 'Uncertainty', 'Decision score', '35/100', 'Coverage', 'Partial', 'not a loss probability', 'Internal traces']) assert.ok(html.includes(text), text);
  for (const text of ['RING:99', 'LEGACY_WIDGET', 'UNSAFE_TRUST', 'RAW_UNSAFE']) assert.ok(!html.includes(text), text);
});
test('v1 is explicitly narrower coverage and malformed declared reports have no fallback', () => {
  assert.match(render(legacy), /narrower coverage/i);
  for (const malformed of [{}, {...report, decisionScore: -1}, {...report, version: 'findings-v3'}]) {
    const html = render(malformed); assert.match(html, /Analysis unavailable/); assert.doesNotMatch(html, /RING:|LEGACY_WIDGET|Assessment|Decision score/);
  }
});
test('v2 displays concrete risk separately and qualifies complete supported coverage', () => {
  const html = render({...report, evidenceRiskScore: 80, decisionScore: 80, coverage: 'complete_for_supported_checks'});
  assert.match(html, /80\/100/); assert.match(html, /Complete for supported checks only/); assert.match(html, /Not a complete audit/);
  assert.doesNotMatch(html, />No concrete risk established<|RING:/);
});
test('checked report evidence renders safe source links and bounded intent/state', () => {
  const address = base.input;
  const evidence = {...report.evidence[0], incident: {name: 'Incident', date: '2023-03-13', reviewedAt: '2026-09-30', role: 'victim', network: 'mainnet', hash: `0x${'2'.repeat(64)}`, sources: [{url: 'https://example.com/source', title: 'Checked source', claim: 'Observed role'}]},
    input: {status: 'partial', source: 'abi', provenance: {network: 'mainnet', address, blockTag: '0x123', scope: 'current_only'}, historicalCertainty: false, reason: 'current_abi_only', signature: 'approve(address,uint256)', arguments: [{name: 'spender', type: 'address', value: address}]},
    tokenStates: [{address, status: 'available', blockTag: '0x123', authority: 'contract_reported_interface', decimals: 18, balanceRaw: '123'}],
    permissionStates: [{token: address, owner: address, spender: address, blockTag: '0x123', kind: 'erc20_allowance', rawValue: '456', authority: 'contract_reported_interface'}]};
  const html = render({...report, evidence: [evidence]});
  for (const text of ['href="https://example.com/source"', 'rel="noopener noreferrer"', 'Checked source', 'Decoded intent', 'current_only', 'Contract-reported state', 'Raw balance: 123', 'Raw permission value: 456', 'not effective rights']) assert.ok(html.includes(text), text);
  evidence.incident.sources[0].url = 'javascript:alert(1)'; assert.match(render({...report, evidence: [evidence]}), /Analysis unavailable/);
});
test('NFT evidence shows caller without attributing ownership and exposes current ABI identity', () => {
  const address = base.input;
  const evidence = {...report.evidence[0],
    input: {status: 'partial', source: 'abi', provenance: {network: 'mainnet', address, abiAddress: `0x${'3'.repeat(40)}`, blockTag: '0x123', scope: 'current_only', proxyResolved: false}, historicalCertainty: false, reason: 'unresolved_proxy', signature: 'approve(address,uint256)', arguments: []},
    permissionStates: [{token: address, caller: address, blockTag: '0x123', kind: 'erc721_approval', rawValue: address, tokenIdRaw: '123', authority: 'contract_reported_interface'}]};
  const html = render({...report, evidence: [evidence]});
  for (const text of ['Owner: unknown', `Caller: ${address}`, `ABI address: 0x${'3'.repeat(40)}`, 'Historical execution semantics are not established']) assert.ok(html.includes(text), text);
});
