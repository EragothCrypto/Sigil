const {test}=require('node:test');const assert=require('node:assert/strict');const {readFileSync}=require('node:fs');const {stripTypeScriptTypes}=require('node:module');const vm=require('node:vm');
const context=vm.createContext({URL,TextEncoder,lookupIncident:()=>undefined});
for(const path of ['../../../../../lib/api-zod/src/validated-report.ts','analysis-cache-validation.ts'])vm.runInContext(stripTypeScriptTypes(readFileSync(`${__dirname}/${path}`,'utf8').replace(/^import .*\r?\n/gm,'').replace(/export /g,'')),context);
const address='0x'+'1'.repeat(40);
function fixture(){return {input:address,inputType:'contract',network:'mainnet',riskScore:5,riskLevel:'low',verdict:'safe',summary:'Bounded metadata.',verdictReason:'Not signing clearance.',warnings:['Analysis limit: Traces unavailable.'],positives:[],details:{validatedReport:{version:'findings-v2',scorePolicy:'dual-floor-v2',evidenceRiskScore:null,uncertaintyScore:0,decisionScore:5,coverage:'partial',capabilities:{sourceVerification:true,receiptEvents:false,incidentLookup:false,inputDecoding:false,reportedTokenState:false,reportedPermissionState:false,internalTraces:false,isolatedBalanceDeltas:false},findings:[{id:'f:traces_missing',code:'traces_missing',category:'limitation',text:'Traces unavailable.',evidenceRefs:['e:traces_missing']}],evidence:[{id:'e:traces_missing',kind:'traces_missing',subject:`mainnet:${address}`,value:'not_collected'}]}}};}
test('valid v2 cache retains a qualified score while wrong identity/refs/policy never pass',()=>{
 assert.equal(context.validatedCacheEntry(fixture(),address,'mainnet'),true);
 const changes=[v=>v.input='0x'+'2'.repeat(40),v=>v.network='base',v=>v.riskScore=0,v=>v.verdict='dangerous',v=>v.riskLevel='critical',v=>v.warnings=[],v=>v.details.validatedReport.evidence[0].subject=`base:${address}`,v=>v.details.validatedReport.findings[0].evidenceRefs=['e:forged'],v=>v.details.validatedReport.decisionScore=0,v=>v.details.validatedReport.capabilities.internalTraces=true,v=>v.details.validatedReport.evidence[0].input={status:'available'}];
 for(const change of changes){const value=fixture();change(value);assert.equal(context.validatedCacheEntry(value,address,'mainnet'),false);}
});

const oracle = {
 source_verified: ['supported_indicator', 0], source_unverified: ['limitation', 40], source_unknown: ['limitation', 35],
 registry_identity: ['observation', 0], registry_danger: ['risk', 90], destination_no_code: ['observation', 0],
 execution_status: ['observation', 0], execution_incomplete: ['limitation', 35], local_method: ['observation', 0], method_unknown: ['limitation', 35],
 transfer_observations: ['observation', 0], raw_units_unknown: ['limitation', 0], mint_burn_shaped: ['observation', 0], receipt_partial: ['limitation', 35],
 receipt_unavailable: ['limitation', 35], traces_missing: ['limitation', 0], approval_intent: ['observation', 0], allowance_unknown: ['limitation', 40],
 contract_metadata_only: ['limitation', 0], adapter_evidence_invalid: ['limitation', 0], decoded_intent: ['observation', 0],
 abi_historical_uncertain: ['limitation', 35], abi_partial: ['limitation', 35], abi_unavailable: ['limitation', 35],
 reported_token_state: ['observation', 0], reported_permission_state: ['observation', 0], adapter_coverage: ['limitation', 0],
};
function addFinding(value, code, category) {
 const report = value.details.validatedReport;
 report.findings.push({id:`f:${code}`,code,category,text:`${code} evidence.`,evidenceRefs:[`e:${code}`]});
 report.evidence.push({id:`e:${code}`,kind:code,subject:`mainnet:${address}`,value:code});
 sync(value);
 return report.evidence.at(-1);
}
function sync(value, risk = value.details.validatedReport.evidenceRiskScore, gap = value.details.validatedReport.uncertaintyScore) {
 const report = value.details.validatedReport;
 report.evidenceRiskScore = risk; report.uncertaintyScore = gap; report.decisionScore = Math.max(5,risk??0,gap);
 value.riskScore = report.decisionScore;
 value.verdict = value.riskScore <= 25 ? 'safe' : value.riskScore <= 60 ? 'caution' : 'dangerous';
 value.riskLevel = value.riskScore <= 25 ? 'low' : value.riskScore <= 50 ? 'medium' : value.riskScore <= 75 ? 'high' : 'critical';
 value.warnings = report.findings.filter(f=>f.category==='risk'||f.category==='limitation').map(f=>f.category==='limitation'?`Analysis limit: ${f.text}`:f.text);
 value.positives = report.findings.filter(f=>f.category==='supported_indicator').map(f=>f.text);
}
test('source_unknown cannot be downgraded by coordinated score and verdict aliases',()=>{
 const value=fixture();addFinding(value,'source_unknown','limitation');sync(value,null,35);
 assert.equal(context.validatedCacheEntry(value,address,'mainnet'),true);
 sync(value,null,0);
 assert.equal(context.validatedCacheEntry(value,address,'mainnet'),false);
});
test('each emitted code rederives exact category and floor; unknown or category-swapped codes reject',()=>{
 const emitted=[...readFileSync(`${__dirname}/validated-findings.ts`,'utf8').matchAll(/add\(data, "([a-z_]+)"/g)].map(m=>m[1]);
 assert.deepEqual([...new Set(emitted)].sort(),[...Object.keys(oracle),'historical_incident'].sort());
 for(const [code,[category,floor]] of Object.entries(oracle)) {
  const value=fixture();
  if(code==='traces_missing'){value.details.validatedReport.findings=[];value.details.validatedReport.evidence=[];}
  addFinding(value,code,category);sync(value,category==='risk'?floor:null,category==='limitation'?floor:0);
  assert.equal(context.validatedCacheEntry(value,address,'mainnet'),true,`${code} baseline`);
  const mismatch=JSON.parse(JSON.stringify(value));
  sync(mismatch,null,floor?0:35);
  assert.equal(context.validatedCacheEntry(mismatch,address,'mainnet'),false,`${code} score mismatch`);
  value.details.validatedReport.findings.at(-1).category=category==='observation'?'limitation':'observation';sync(value);
  assert.equal(context.validatedCacheEntry(value,address,'mainnet'),false,`${code} category mismatch`);
 }
 const unknown=fixture();addFinding(unknown,'unknown_future_rule','observation');
 assert.equal(context.validatedCacheEntry(unknown,address,'mainnet'),false);
 const combined=fixture();addFinding(combined,'source_unknown','limitation');addFinding(combined,'source_unverified','limitation');addFinding(combined,'registry_danger','risk');sync(combined,90,40);
 assert.equal(context.validatedCacheEntry(combined,address,'mainnet'),true);
 sync(combined,90,75);assert.equal(context.validatedCacheEntry(combined,address,'mainnet'),false);
});

const hash='0x'+'a'.repeat(64);
function transactionFixture(blockNumber='0x1') {
 const value=fixture();value.input=hash;value.inputType='transaction';value.details.to=address;value.details.rawData={hash,blockNumber};
 const blockTag=/^0x[\da-f]+$/i.test(blockNumber)?blockNumber:'latest';
 const input=tag=>({status:'partial',source:'abi',historicalCertainty:false,reason:'current_abi_only',provenance:{network:'mainnet',address,blockTag:tag,scope:'current_only',proxyResolved:false},signature:'deposit()',arguments:[]});
 addFinding(value,'abi_historical_uncertain','limitation');
 addFinding(value,'decoded_intent','observation').input={...input(blockTag),subcalls:[input(blockTag)]};
 addFinding(value,'reported_token_state','observation').tokenStates=[{address,status:'available',blockTag,authority:'contract_reported_interface',decimals:6,balanceRaw:'1'}];
 addFinding(value,'reported_permission_state','observation').permissionStates=[{token:address,owner:address,spender:address,blockTag,kind:'erc20_allowance',rawValue:'1',authority:'contract_reported_interface'}];
 sync(value,null,35);return value;
}
test('transaction top/recursive input and token/permission blocks bind to raw acquisition block',()=>{
 for(const block of ['0x1','0xAB','pending','latest','not-a-block','0x',null,undefined]) {
  const value=transactionFixture(block===undefined?'pending':block);if(block===undefined)delete value.details.rawData.blockNumber;
  assert.equal(context.validatedCacheEntry(value,hash,'mainnet'),true,`block ${block}`);
  const changes=[
   v=>v.details.validatedReport.evidence.find(e=>e.input).input.provenance.blockTag='0x2',
   v=>v.details.validatedReport.evidence.find(e=>e.input).input.subcalls[0].provenance.blockTag='0x2',
   v=>v.details.validatedReport.evidence.find(e=>e.tokenStates).tokenStates[0].blockTag='0x2',
   v=>v.details.validatedReport.evidence.find(e=>e.permissionStates).permissionStates[0].blockTag='0x2',
   v=>v.details.rawData.hash='0x'+'b'.repeat(64),v=>delete v.details.rawData.hash,v=>delete v.details.rawData,
   v=>v.details.validatedReport.evidence.find(e=>e.input).input.subcalls[0].provenance.network='base',
   v=>v.details.validatedReport.evidence.find(e=>e.input).input.subcalls[0].provenance.address='0x'+'2'.repeat(40),
  ];
  for(const change of changes){const spoof=JSON.parse(JSON.stringify(value));change(spoof);assert.equal(context.validatedCacheEntry(spoof,hash,'mainnet'),false,`binding ${block}`);}
 }
 const uppercase=transactionFixture();uppercase.details.rawData.hash=hash.toUpperCase().replace('0X','0x');
 assert.equal(context.validatedCacheEntry(uppercase,hash,'mainnet'),true);
 assert.equal(context.validatedCacheEntry(fixture(),address,'mainnet'),true,'contract baseline needs no transaction raw data');
});

test('historical incident role controls exact risk floor and category',()=>{
 const catalog=vm.createContext({URL});
 vm.runInContext(stripTypeScriptTypes(readFileSync(`${__dirname}/incident-catalog.ts`,'utf8').replace(/export /g,'')),catalog);
 const original=context.lookupIncident;context.lookupIncident=catalog.lookupIncident;
 try {
  const entries=vm.runInContext('INCIDENT_CATALOG',catalog);
  for(const entry of entries) {
   const value=transactionFixture();value.input=entry.hash;value.details.rawData.hash=entry.hash;
   const risk=entry.role==='exploit_execution'?80:null;
   const evidence=addFinding(value,'historical_incident',risk?'risk':'observation');evidence.incident=JSON.parse(JSON.stringify(entry));evidence.subject=`mainnet:${entry.hash}`;sync(value,risk,35);
   assert.equal(context.validatedCacheEntry(value,entry.hash,'mainnet'),true,entry.role);
   const wrongScore=JSON.parse(JSON.stringify(value));sync(wrongScore,risk===null?80:null,35);
   assert.equal(context.validatedCacheEntry(wrongScore,entry.hash,'mainnet'),false,`${entry.role} floor`);
   value.details.validatedReport.findings.at(-1).category=risk?'observation':'risk';sync(value);
   assert.equal(context.validatedCacheEntry(value,entry.hash,'mainnet'),false,`${entry.role} category`);
  }
  const missing=fixture();addFinding(missing,'historical_incident','observation');assert.equal(context.validatedCacheEntry(missing,address,'mainnet'),false);
 } finally {context.lookupIncident=original;}
});
