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
