const {test} = require('node:test'); const assert = require('node:assert/strict');
const {readFileSync,existsSync} = require('node:fs'); const vm=require('node:vm'); const {stripTypeScriptTypes}=require('node:module');
const viem=require('../../../node_modules/viem');
const address='0x'+'1'.repeat(40); const owner='0x'+'2'.repeat(40);
const abi=viem.parseAbi(['function transfer(address,uint256) returns (bool)', 'function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)', 'function allowance(address,address) view returns (uint256)']);
function load() {
  const context=vm.createContext({...viem, Buffer, TextEncoder, AbortSignal, createEvidenceRpc:()=>{throw Error('unexpected live');}, fetchContract:()=>{throw Error('unexpected live');}, decodeInputEvidence:()=>({status:'partial',signature:'deposit()',arguments:[],reason:'current_abi_only',provenance:{scope:'current_only'}})});
  vm.runInContext(stripTypeScriptTypes(readFileSync(`${__dirname}/abi-evidence.ts`,'utf8').replace(/^import .*\r?\n/gm,'').replace(/export /g,'')),context);
  const path=`${__dirname}/analysis-adapters.ts`; if(!existsSync(path))return{};
  vm.runInContext(stripTypeScriptTypes(readFileSync(path,'utf8').replace(/^import .*\r?\n/gm,'').replace(/export /g,'')),context);return context;
}
test('adapter binds reported decimals/state to identity/block without economic authority',async()=>{
  const api=load();assert.equal(typeof api.collectAnalysisEvidence,'function');
  const requests=[];const rpc={attempts:0,async call(method,params){requests.push([method,params]); if(method==='eth_getCode') return '0x6000'; if(method==='eth_call')return '0x'+(params[0].data.startsWith('0x313ce567')?'6':'123').padStart(64,'0'); throw Error('unsupported');}};
  const tx={to:address,from:owner,input:'0x',blockNumber:'0x1',inclusionStatus:'mined',receiptEvidence:{transfers:[{kind:'erc20-shaped',token:address,from:owner,to:address,amountRaw:'1234567'}]}};
  const result=await api.collectAnalysisEvidence(tx,'mainnet',{rpc,fetchContract:async()=>({address,abi:JSON.stringify(abi),verificationStatus:'verified',isProxy:false})});
  assert.equal(result.tokenStates[0].decimals,6); assert.equal(result.tokenStates[0].authority,'contract_reported_interface');
  assert.equal(result.blockTag,'0x1'); assert.ok(requests.every(([method,params])=>method!=='eth_call'||params[1]==='0x1'));
  assert.doesNotMatch(JSON.stringify(result),/permissionsGranted|usdValue|guaranteed/);
});

test('NFT approval requires canonical ERC165 and reports block state, not a grant',async()=>{
 const api=load(); const nft=viem.parseAbi(['function supportsInterface(bytes4) view returns (bool)','function approve(address,uint256)','function getApproved(uint256) view returns (address)','function ownerOf(uint256) view returns (address)']);
 const spender='0x'+'3'.repeat(40); const input=viem.encodeFunctionData({abi:nft,functionName:'approve',args:[spender,7n]});
 for(const supported of [true,false]){
  const calls=[]; const rpc={attempts:0,async call(method,params){calls.push([method,params]);if(method==='eth_getCode')return '0x6000';const data=params[0].data;
   if(data.startsWith('0x01ffc9a7'))return '0x'+(supported&&!data.includes('ffffffff')?'1':'0').padStart(64,'0');
   return '0x'+spender.slice(2).padStart(64,'0');}};
  const result=await api.collectAnalysisEvidence({to:address,from:owner,input,blockNumber:'0x9',receiptEvidence:{transfers:[]}},'mainnet',{rpc,fetchContract:async()=>({address,abi:JSON.stringify(nft),verificationStatus:'verified',isProxy:false})});
  assert.equal(result.permissionStates.length,supported?1:0);
  if(supported){assert.equal(result.permissionStates[0].kind,'erc721_approval');assert.equal(result.permissionStates[0].rawValue,spender);assert.equal(result.permissionStates[0].blockTag,'0x9');assert.equal(result.permissionStates[0].owner,undefined);assert.equal(result.permissionStates[0].caller,owner);}
  assert.ok(calls.length<=5);assert.doesNotMatch(JSON.stringify(result),/permissionsGranted/);
 }
});

test('allowance candidate requires successful decimals and balance reads, even without events',async()=>{
 const api=load();const spender='0x'+'3'.repeat(40);const input=viem.encodeFunctionData({abi:viem.parseAbi(['function approve(address,uint256)']),functionName:'approve',args:[spender,1n]});
 for(const valid of [false,true]){
  let calls=0;const result=await api.collectAnalysisEvidence({to:address,from:owner,input,blockNumber:'0x1',receiptEvidence:{transfers:[]}},'mainnet',{rpc:{attempts:0,async call(method,params){calls++;if(method==='eth_getCode')return '0x6000';if(params[0].data.startsWith('0x313ce567'))return valid?'0x'+'6'.padStart(64,'0'):'0x';return '0x'+'1'.padStart(64,'0');}},fetchContract:async()=>({address,abi:JSON.stringify(abi),verificationStatus:'verified'})});
  assert.equal(result.permissionStates.length,valid?1:0);assert.ok(calls<=4);
 }
});

test('current proxy decoding retains implementation ABI identity without historical certainty',async()=>{
 const api=load();const implementation='0x'+'4'.repeat(40);
 const input=viem.encodeFunctionData({abi, functionName:'transfer',args:[owner,1n]});
 const result=await api.collectAnalysisEvidence({to:address,from:owner,input,blockNumber:'0x1',receiptEvidence:{transfers:[]}},'mainnet',{rpc:{attempts:0,call:async()=>{throw Error();}},fetchContract:async key=>({address:key,abi:JSON.stringify(abi),verificationStatus:'verified',...(key===address?{isProxy:true,implementation}:{isProxy:false})})});
 assert.equal(result.input.provenance.abiAddress,implementation);assert.equal(result.input.historicalCertainty,false);
});

test('metadata identity mismatch and cancelled scans never make state requests',async()=>{
 const api=load();const controller=new AbortController();controller.abort();let reads=0;
 const tx={to:address,from:owner,input:'0x',blockNumber:'0x1',receiptEvidence:{transfers:[{token:address,kind:'erc20-shaped'}]}};
 const result=await api.collectAnalysisEvidence(tx,'mainnet',{signal:controller.signal,rpc:{attempts:0,call:async()=>{reads++;return '0x6000';}},fetchContract:async()=>{reads++;return {address,abi:JSON.stringify(abi),verificationStatus:'verified'};}});
 assert.equal(reads,0);assert.equal(result.capabilities.inputDecoding,false);
 const mismatch=await api.collectAnalysisEvidence(tx,'mainnet',{rpc:{attempts:0,call:async()=>{throw Error('must not call');}},fetchContract:async()=>({address:owner,abi:JSON.stringify(abi),verificationStatus:'verified'})});
 assert.equal(mismatch.tokenStates[0].status,'unavailable');assert.equal(mismatch.capabilities.inputDecoding,false);
});

test('reported unit formatting preserves uint256 and rejects guessed or invalid decimals',()=>{
 const api=load();for(const decimals of [0,6,18]) assert.equal(api.formatReportedAmount('1234567',decimals),viem.formatUnits(1234567n,decimals));
 const max=(2n**256n-1n).toString();assert.equal(api.formatReportedAmount(max,0),max);
 for(const [raw,decimals] of [[(2n**256n).toString(),18],['1',37],['1',-1],['1',1.5],['-1',18]]) assert.throws(()=>api.formatReportedAmount(raw,decimals));
});
test('missing ABI, NFT-shaped ambiguity and RPC failure do not invent token amounts',async()=>{
  const api=load();assert.equal(typeof api.collectAnalysisEvidence,'function');
  for(const kind of ['erc20-shaped','erc721-shaped']){
    const tx={to:address,from:owner,input:'0x',blockNumber:'0x1',receiptEvidence:{transfers:[{kind,token:address}]}};
    const result=await api.collectAnalysisEvidence(tx,'base',{rpc:{attempts:0,call:async()=>{throw Error('unavailable');}},fetchContract:async()=>({address,verificationStatus:'unknown'})});
    assert.equal(result.tokenStates[0]?.decimals,undefined);assert.equal(result.coverage,'partial');
  }
});
test('emitter cap and pending input explicitly bound acquisition',async()=>{
  const api=load();assert.equal(typeof api.collectAnalysisEvidence,'function');let fetches=0;
  const transfers=Array.from({length:12},(_,i)=>({kind:'erc20-shaped',token:'0x'+(i+1).toString(16).padStart(40,'0')}));
  const result=await api.collectAnalysisEvidence({to:address,from:owner,input:'0x',blockNumber:'pending',receiptEvidence:{transfers}},'mainnet',{rpc:{attempts:0,call:async()=>{throw Error('unavailable');}},fetchContract:async()=>{fetches++;return {address,verificationStatus:'unknown'};}});
  assert.equal(result.tokenStates.length,8);assert.ok(result.limits.includes('token_emitter_cap'));assert.equal(result.blockTag,'latest');assert.ok(fetches<=9);
});

test('one-hop proxy token reads use original address/block and never establish historical semantics or rights',async()=>{
 const api=load(); const implementation='0x'+'4'.repeat(40); const requests=[];
 const input=viem.encodeFunctionData({abi:viem.parseAbi(['function approve(address,uint256)']),functionName:'approve',args:[owner,1n]});
 const result=await api.collectAnalysisEvidence({to:address,from:owner,input,blockNumber:'0x9',receiptEvidence:{transfers:[{kind:'erc20-shaped',token:address}]}},'mainnet',{
  rpc:{attempts:0,async call(method,params){requests.push([method,params]);return method==='eth_getCode'?'0x6000':'0x'+(params[0].data.startsWith('0x313ce567')?'6':'123').padStart(64,'0');}},
  fetchContract:async key=>({address:key,abi:JSON.stringify(key===address?[]:abi),verificationStatus:'verified',isProxy:key===address,...(key===address?{implementation}:{})})});
 assert.equal(result.tokenStates[0].status,'available');assert.equal(result.tokenStates[0].decimals,6);
 assert.equal(result.tokenStates[0].reason,'current_proxy_abi_only');
 assert.ok(result.limits.includes('token_proxy_current_abi_not_historical'));
 assert.equal(result.permissionStates.length,0);assert.equal(result.capabilities.reportedTokenState,true);
 assert.equal(requests.length,3);assert.ok(requests.every(([method,params])=>params[1]==='0x9'&&(method==='eth_getCode'?params[0]:params[0].to)===address));
});

test('proxy metadata failures have precise reasons and never attempt token state RPC',async()=>{
 const api=load();const implementation='0x'+'4'.repeat(40);const other='0x'+'5'.repeat(40);
 for(const [change,reason] of [
  [{implementation:undefined},'token_proxy_implementation_unavailable'],
  [{implementation:address},'token_proxy_implementation_unavailable'],
  [{implementation:'0x'+'0'.repeat(40)},'token_proxy_implementation_unavailable'],
  [{verificationStatus:'unverified'},'token_proxy_abi_unavailable'],
  [{impl:{verificationStatus:'unverified'}},'token_proxy_abi_unavailable'],
  [{impl:{isProxy:true}},'token_proxy_implementation_unavailable'],
  [{impl:{isProxy:undefined}},'token_proxy_status_unknown'],
  [{impl:{isProxy:null}},'token_proxy_status_unknown'],
  [{impl:{isProxy:'0'}},'token_proxy_status_unknown'],
  [{impl:{isProxy:0}},'token_proxy_status_unknown'],
  [{impl:{address:other}},'token_proxy_metadata_unavailable'],
  [{impl:{abi:JSON.stringify([])}},'token_erc20_interface_not_established'],
 ]){
  let reads=0;const result=await api.collectAnalysisEvidence({to:owner,from:owner,input:'0x',blockNumber:'0x9',receiptEvidence:{transfers:[{kind:'erc20-shaped',token:address}]}},'mainnet',{
   rpc:{attempts:0,call:async()=>{reads++;throw Error('must not call');}},
   fetchContract:async key=>key===address?{address:key,verificationStatus:'verified',isProxy:true,implementation,...change}:{address:key,verificationStatus:'verified',isProxy:false,abi:JSON.stringify(abi),...(key===implementation?change.impl:{})}});
  assert.equal(reads,0);assert.equal(result.tokenStates[0].reason,reason);assert.equal(result.tokenStates[0].decimals,undefined);assert.equal(result.capabilities.reportedTokenState,false);
 }
});

test('two-hop proxy uses only the verified leaf ABI and original block-bound token reads',async()=>{
 const api=load();const middle='0x'+'4'.repeat(40);const leaf='0x'+'5'.repeat(40);const calls=[];const fetches=[];
 const result=await api.collectAnalysisEvidence({to:owner,from:owner,input:'0x',blockNumber:'0x9',receiptEvidence:{transfers:[{kind:'erc20-shaped',token:address}]}},'mainnet',{
  fetchContract:async key=>{fetches.push(key);return {address:key,verificationStatus:'verified',isProxy:key!==leaf,abi:JSON.stringify(key===leaf?abi:[]),...(key===address?{implementation:middle}:key===middle?{implementation:leaf}:{})};},
  rpc:{attempts:0,async call(method,params){calls.push([method,params]);return method==='eth_getCode'?'0x6000':'0x'+(params[0].data.startsWith('0x313ce567')?'6':'499999998').padStart(64,'0');}}});
 assert.equal(result.tokenStates[0].status,'available');assert.equal(result.tokenStates[0].reason,'current_proxy_abi_only');
 assert.equal(result.tokenStates[0].decimals,6);assert.equal(result.permissionStates.length,0);
 assert.equal(fetches.filter(k=>k===middle).length,1);assert.equal(fetches.filter(k=>k===leaf).length,1);
 assert.equal(calls.length,3);assert.ok(calls.every(([method,params])=>params[1]==='0x9'&&(method==='eth_getCode'?params[0]:params[0].to)===address));
});

test('interface rejection reports bounded leaf provenance and function counts without raw ABI or state reads',async()=>{
 const api=load();const middle='0x'+'4'.repeat(40);const leaf='0x'+'5'.repeat(40);const diagnostics=[];let reads=0;
 const leafAbi=viem.parseAbi(['function admin() view returns (address)']);
 const result=await api.collectAnalysisEvidence({to:owner,from:owner,input:'0x',blockNumber:'0x9',receiptEvidence:{transfers:[{kind:'erc20-shaped',token:address}]}},'mainnet',{
  onDiagnostic:d=>diagnostics.push(d),
  fetchContract:async key=>({address:key,verificationStatus:'verified',isProxy:key===address||key===middle,abi:JSON.stringify(key===leaf?leafAbi:abi),implementation:key===address?middle:leaf}),
  rpc:{attempts:0,call:async()=>{reads++;throw Error('unexpected state read');}}});
 assert.equal(result.tokenStates[0].reason,'token_erc20_interface_not_established');assert.equal(reads,0);
 assert.equal(diagnostics.length,1);const d=diagnostics[0];
 assert.equal(d.tokenAddress,address);assert.equal(d.abiAddress,leaf);assert.equal(d.blockTag,'0x9');
 assert.deepEqual(Array.from(d.proxyPath),[address,middle,leaf]);
 assert.equal(d.transferMatches,0);assert.equal(d.balanceMatches,0);assert.equal(d.decimalsMatches,0);assert.equal(d.nftAmbiguous,false);
 assert.doesNotMatch(JSON.stringify(d),/admin|ABI|secret|balanceRaw|implementation\(\)/);
});

test('diagnostic callback failure does not alter fail-closed token result',async()=>{
 const api=load();let diagnostics=0;const result=await api.collectAnalysisEvidence({to:owner,from:owner,input:'0x',blockNumber:'0x9',receiptEvidence:{transfers:[{kind:'erc20-shaped',token:address}]}},'mainnet',{
  onDiagnostic:()=>{diagnostics++;throw Error('logger failed');},fetchContract:async key=>({address:key,verificationStatus:'verified',isProxy:false,abi:'[]'}),
  rpc:{attempts:0,call:async()=>{throw Error('unexpected RPC');}}});
 assert.equal(result.tokenStates[0].reason,'token_erc20_interface_not_established');assert.equal(result.tokenStates[0].status,'unavailable');
 assert.equal(diagnostics,1);
});

test('interface diagnostics distinguish duplicate functions and NFT ambiguity with bounded counts',async()=>{
 const api=load();const transfer=abi.find(f=>f.name==='transfer');
 for(const [extra,count,nft] of [[[transfer],2,false],[viem.parseAbi(['function ownerOf(uint256) view returns (address)']),1,true]]){
  const diagnostics=[];
  const result=await api.collectAnalysisEvidence({to:owner,from:owner,input:'0x',blockNumber:'0x9',receiptEvidence:{transfers:[{kind:'erc20-shaped',token:address}]}},'mainnet',{
   onDiagnostic:d=>diagnostics.push(d),fetchContract:async key=>({address:key,verificationStatus:'verified',isProxy:false,abi:JSON.stringify([...abi,...extra])}),
   rpc:{attempts:0,call:async()=>{throw Error('unexpected RPC');}}});
  assert.equal(result.tokenStates[0].status,'unavailable');assert.equal(diagnostics.length,1);
  assert.equal(diagnostics[0].transferMatches,count);assert.equal(diagnostics[0].balanceMatches,1);
  assert.equal(diagnostics[0].decimalsMatches,1);assert.equal(diagnostics[0].nftAmbiguous,nft);
  assert.deepEqual(Array.from(diagnostics[0].proxyPath),[address]);
 }
});

test('bounded proxy chain rejects cycles, excess depth and unusable terminal metadata without RPC',async()=>{
 const api=load();const middle='0x'+'4'.repeat(40);const leaf='0x'+'5'.repeat(40);const fourth='0x'+'6'.repeat(40);
 for(const [middleChange,leafChange,reason] of [
  [{implementation:address},{},'token_proxy_cycle'],
  [{implementation:middle},{},'token_proxy_cycle'],
  [{implementation:'0x'+'0'.repeat(40)},{},'token_proxy_implementation_unavailable'],
  [{verificationStatus:'unverified'},{},'token_proxy_abi_unavailable'],
  [{},{isProxy:true,implementation:fourth},'token_proxy_depth_limit'],
  [{},{isProxy:undefined},'token_proxy_status_unknown'],
  [{},{verificationStatus:'unverified'},'token_proxy_abi_unavailable'],
  [{},{metadataIssue:'etherscan_rate_limited'},'etherscan_rate_limited'],
  [{},{address:fourth},'token_proxy_metadata_unavailable'],
  [{},{abi:'not json'},'token_abi_validation_failed'],
 ]){
  const fetches=[];let reads=0;
  const result=await api.collectAnalysisEvidence({to:owner,from:owner,input:'0x',blockNumber:'0x9',receiptEvidence:{transfers:[{kind:'erc20-shaped',token:address}]}},'mainnet',{
   fetchContract:async key=>{fetches.push(key);return {address:key,verificationStatus:'verified',abi:JSON.stringify(abi),isProxy:key!==leaf,...(key===address?{implementation:middle}:key===middle?{implementation:leaf,...middleChange}:key===leaf?leafChange:{})};},
   rpc:{attempts:0,call:async()=>{reads++;throw Error('unexpected RPC');}}});
  assert.equal(result.tokenStates[0].reason,reason);assert.equal(result.tokenStates[0].status,'unavailable');
  assert.equal(result.tokenStates[0].decimals,undefined);assert.equal(result.tokenStates[0].balanceRaw,undefined);
  assert.equal(reads,0);assert.equal(fetches.includes(fourth),false);assert.ok(fetches.length<=4);
 }
});

test('proxy emitter metadata deduplicates while reads remain bound to each emitter and caller',async()=>{
 const api=load();const implementation='0x'+'4'.repeat(40);const second='0x'+'5'.repeat(40);const calls=[];const fetches=[];
 const result=await api.collectAnalysisEvidence({to:owner,from:owner,input:'0x',blockNumber:'0x9',receiptEvidence:{transfers:[address,second].map(token=>({token,kind:'erc20-shaped'}))}},'mainnet',{
  fetchContract:async key=>{fetches.push(key);return {address:key,verificationStatus:'verified',isProxy:key!==implementation,implementation,abi:JSON.stringify(key===implementation?abi:[])};},
  rpc:{attempts:0,async call(method,params){calls.push([method,params]);return method==='eth_getCode'?'0x6000':'0x'+'6'.padStart(64,'0');}}});
 assert.ok(result.tokenStates.every(s=>s.status==='available'));assert.equal(fetches.filter(k=>k===implementation).length,1);
 assert.equal(result.limits.filter(l=>l==='token_proxy_current_abi_not_historical').length,1);
 assert.equal(calls.length,6);assert.ok(calls.every(([method,params])=>params[1]==='0x9'&&[address,second].includes(method==='eth_getCode'?params[0]:params[0].to)));
 const balanceCalls=calls.filter(([method,params])=>method==='eth_call'&&params[0].data.startsWith('0x70a08231'));
 assert.ok(balanceCalls.every(([,params])=>params[0].data.endsWith(owner.slice(2))));
});

test('two-hop metadata remains shared and cancellation prevents leaf acquisition and state reads',async()=>{
 const api=load();const middle='0x'+'4'.repeat(40);const leaf='0x'+'5'.repeat(40);const second='0x'+'6'.repeat(40);
 for(const cancelled of [false,true]){
  const controller=new AbortController();const fetches=[];let reads=0;
  const result=await api.collectAnalysisEvidence({to:owner,from:owner,input:'0x',blockNumber:'0x9',receiptEvidence:{transfers:[address,second].map(token=>({token,kind:'erc20-shaped'}))}},'mainnet',{
   signal:controller.signal,fetchContract:async key=>{fetches.push(key);if(cancelled&&key===middle)controller.abort();return {address:key,verificationStatus:'verified',isProxy:key!==leaf,abi:JSON.stringify(key===leaf?abi:[]),implementation:key===middle?leaf:middle};},
   rpc:{attempts:0,async call(method){reads++;return method==='eth_getCode'?'0x6000':'0x'+'6'.padStart(64,'0');}}});
  assert.equal(fetches.filter(k=>k===middle).length,1);assert.equal(fetches.filter(k=>k===leaf).length,cancelled?0:1);
  assert.equal(reads,cancelled?0:6);
  assert.ok(result.tokenStates.every(s=>s.status===(cancelled?'unavailable':'available')));
  if(cancelled)assert.ok(result.tokenStates.every(s=>s.reason==='token_state_cancelled'));
 }
});

test('token ABI and RPC failures are distinguished without exposing partial values',async()=>{
 const api=load();
 for(const [metadata,code,response,reason] of [
  [{verificationStatus:'unknown'},'0x6000',null,'token_abi_unavailable'],
  [{verificationStatus:'verified',abi:JSON.stringify([])},'0x6000',null,'token_erc20_interface_not_established'],
  [{verificationStatus:'verified',abi:JSON.stringify(abi)},'0x',null,'token_code_not_established'],
  [{verificationStatus:'verified',abi:JSON.stringify(abi)},'0x6000','0x','token_state_response_invalid'],
  [{verificationStatus:'verified',abi:JSON.stringify(abi)},'0x6000',null,'token_state_rpc_unavailable'],
 ]){
  const result=await api.collectAnalysisEvidence({to:address,from:owner,input:'0x',blockNumber:'0x9',receiptEvidence:{transfers:[{kind:'erc20-shaped',token:address}]}},'mainnet',{
   rpc:{attempts:0,async call(method){if(method==='eth_getCode')return code;if(response===null)throw Error('provider detail');return response;}},fetchContract:async()=>({address,isProxy:false,...metadata})});
  assert.equal(result.tokenStates[0].status,'unavailable');assert.equal(result.tokenStates[0].reason,reason);
  assert.equal(result.tokenStates[0].decimals,undefined);assert.equal(result.tokenStates[0].balanceRaw,undefined);
 }
});

test('token reads validate boundary values atomically and stop after metadata cancellation',async()=>{
 const api=load();
 for(const [decimals,balance,available] of [[0,0n,true],[36,2n**256n-1n,true],[37,1n,false],[6,null,false]]){
  const result=await api.collectAnalysisEvidence({to:address,from:owner,input:'0x',blockNumber:'0x9',receiptEvidence:{transfers:[{kind:'erc20-shaped',token:address}]}},'mainnet',{
   fetchContract:async()=>({address,isProxy:false,verificationStatus:'verified',abi:JSON.stringify(abi)}),
   rpc:{attempts:0,async call(method,params){if(method==='eth_getCode')return '0x6000';const value=params[0].data.startsWith('0x313ce567')?BigInt(decimals):balance;return value===null?'0x':'0x'+value.toString(16).padStart(64,'0');}}});
  assert.equal(result.tokenStates[0].status,available?'available':'unavailable');
  assert.equal(result.tokenStates[0].decimals,available?decimals:undefined);assert.equal(result.tokenStates[0].balanceRaw,available?balance.toString():undefined);
 }
 const controller=new AbortController();let reads=0;
 const result=await api.collectAnalysisEvidence({to:owner,from:owner,input:'0x',blockNumber:'0x9',receiptEvidence:{transfers:[{kind:'erc20-shaped',token:address}]}},'mainnet',{
  signal:controller.signal,fetchContract:async key=>{if(key===address)controller.abort();return {address:key,isProxy:false,verificationStatus:'verified',abi:JSON.stringify(abi)};},rpc:{attempts:0,call:async()=>{reads++;throw Error('must not call');}}});
 assert.equal(reads,0);assert.equal(result.tokenStates[0].reason,'token_state_cancelled');
});

test('two-hop proxy adapter state survives findings/shared-parser/cache round-trip with limits intact',async()=>{
 const api=load();const implementation='0x'+'4'.repeat(40);const leaf='0x'+'5'.repeat(40);const hash='0x'+'a'.repeat(64);
 const tx={hash,to:owner,from:owner,input:'0x',value:'0x0',blockNumber:'0x9',status:'0x1',inclusionStatus:'mined',destinationVerification:'verified',destinationHasCode:true,
  receiptEvidence:{status:'available',complete:true,logsExamined:1,transfers:[{kind:'erc20-shaped',token:address,from:owner,to:address,amountRaw:'500000000'}]}};
 const evidence=await api.collectAnalysisEvidence(tx,'mainnet',{
  fetchContract:async key=>({address:key,verificationStatus:'verified',isProxy:key===address||key===implementation,abi:JSON.stringify(key===leaf?abi:[]),...(key===address?{implementation}:key===implementation?{implementation:leaf}:{})}),
  rpc:{attempts:0,async call(method,params){return method==='eth_getCode'?'0x6000':'0x'+(params[0].data.startsWith('0x313ce567')?'6':'0').padStart(64,'0');}}});
 const findings=vm.createContext({Buffer,URL,...viem,lookupEntity:()=>null});
 for(const file of ['incident-catalog.ts','abi-evidence.ts','validated-findings.ts'])vm.runInContext(stripTypeScriptTypes(readFileSync(`${__dirname}/${file}`,'utf8').replace(/^import .*\r?\n/gm,'').replace(/export /g,'')),findings);
 const rendered=findings.renderFindings(findings.transactionFindings({...tx,analysisEvidence:evidence},'mainnet',null,null));
 const validation=vm.createContext({URL,TextEncoder,lookupIncident:()=>undefined});
 for(const file of ['../../../../../lib/api-zod/src/validated-report.ts','analysis-cache-validation.ts'])vm.runInContext(stripTypeScriptTypes(readFileSync(`${__dirname}/${file}`,'utf8').replace(/^import .*\r?\n/gm,'').replace(/export /g,'')),validation);
 const record={...rendered,input:hash,inputType:'transaction',network:'mainnet',details:{to:owner,rawData:tx,validatedReport:rendered.validatedReport}};
 assert.equal(validation.validatedCacheEntry(record,hash,'mainnet'),true);
 assert.equal(rendered.validatedReport.capabilities.reportedTokenState,true);assert.equal(rendered.validatedReport.coverage,'partial');
 assert.match(rendered.validatedReport.findings.find(f=>f.code==='reported_token_state').text,/historical implementation semantics are not established/i);
 assert.equal(rendered.validatedReport.capabilities.reportedPermissionState,false);
});

test('real RPC predicate rejections retain observed token failure classification across retries',async()=>{
 const api=load();
 for(const [stage,reason] of [['code','token_code_not_established'],['decimals','token_state_response_invalid'],['balance','token_state_response_invalid'],['transport','token_state_rpc_unavailable'],['fallback',undefined]]){
  let invalidReplies=0;
  const transport=vm.createContext({AbortSignal,TextEncoder,TextDecoder,getEvidenceEndpoints:()=>['https://one.invalid','https://two.invalid'],fetch:async(_url,options)=>{
   if(stage==='transport')throw Error('upstream private detail');
   const request=JSON.parse(options.body);const name=request.method==='eth_getCode'?'code':request.params[0].data.startsWith('0x313ce567')?'decimals':'balance';
   const invalid=name===stage||stage==='fallback'&&name==='code'&&invalidReplies++===0;
   return new Response(JSON.stringify({jsonrpc:'2.0',id:request.id,result:invalid?'0x':name==='code'?'0x6000':'0x'+'6'.padStart(64,'0')}));
  }});
  vm.runInContext(stripTypeScriptTypes(readFileSync(`${__dirname}/evidence-rpc.ts`,'utf8').replace(/^import .*\r?\n/gm,'').replace(/export /g,'')),transport);
  const result=await api.collectAnalysisEvidence({to:address,from:owner,input:'0x',blockNumber:'0x9',receiptEvidence:{transfers:[{kind:'erc20-shaped',token:address}]}},'mainnet',{
   fetchContract:async()=>({address,isProxy:false,verificationStatus:'verified',abi:JSON.stringify(abi)}),rpc:transport.createEvidenceRpc('mainnet')});
  assert.equal(result.tokenStates[0].reason,reason,stage);
  assert.equal(result.tokenStates[0].status,stage==='fallback'?'available':'unavailable');
  assert.doesNotMatch(JSON.stringify(result),/upstream private detail/);
 }
});

test('token evidence preserves sanitized metadata diagnostics instead of generic ABI failure',async()=>{
 const api=load();const implementation='0x'+'4'.repeat(40);
 for(const stage of ['token','proxy','implementation']){
  let reads=0;
  const result=await api.collectAnalysisEvidence({to:owner,from:owner,input:'0x',blockNumber:'0x9',receiptEvidence:{transfers:[{kind:'erc20-shaped',token:address}]}},'mainnet',{
   rpc:{attempts:0,call:async()=>{reads++;throw Error('no state');}},fetchContract:async key=>{
    const failure=stage==='implementation'?key===implementation:key===address;
    return {address:key,verificationStatus:failure?'unknown':'verified',...(failure?{}:{isProxy:key===address&&stage!=='token'}),implementation,abi:failure?undefined:JSON.stringify(abi),...(failure?{metadataIssue:'etherscan_rate_limited'}:{})};
   }});
  assert.equal(reads,0);assert.equal(result.tokenStates[0].reason,'etherscan_rate_limited',stage);assert.equal(result.tokenStates[0].status,'unavailable');
 }
});
