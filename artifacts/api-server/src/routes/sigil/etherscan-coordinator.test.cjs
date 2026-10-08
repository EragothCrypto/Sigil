const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {stripTypeScriptTypes}=require('node:module');
const vm=require('node:vm');
function load(){const context=vm.createContext({AbortController,AbortSignal,setTimeout,clearTimeout,Buffer,structuredClone});vm.runInContext(stripTypeScriptTypes(readFileSync(`${__dirname}/etherscan-coordinator.ts`,'utf8').replace(/export /g,'')),context);return context;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const options={spacingMs:20,ttlMs:30,maxJobs:2,maxEntries:2,maxBytes:1000};
test('coalesces source work, isolates payloads and expires successful metadata',async()=>{
 const c=load().createEtherscanCoordinator(options);let calls=0;
 const execute=async()=>{calls++;await sleep(5);return {value:1};};
 const [a,b]=await Promise.all([c.run('source',execute,undefined,()=>true),c.run('source',execute,undefined,()=>true)]);
 a.value=7;assert.equal(b.value,1);assert.equal(calls,1);
 assert.equal((await c.run('source',execute,undefined,()=>true)).value,1);assert.equal(calls,1);
 await sleep(40);await c.run('source',execute,undefined,()=>true);assert.equal(calls,2);
});
test('paces starts, bounds outstanding work and recovers after rejected work',async()=>{
 const c=load().createEtherscanCoordinator(options);const starts=[];
 const execute=async()=>{starts.push(Date.now());await sleep(5);return {};};
 const a=c.run(undefined,execute);const b=c.run(undefined,execute);
 await assert.rejects(c.run(undefined,execute),/queue limit/);await Promise.all([a,b]);
 assert.ok(starts[1]-starts[0]>=18);
 await assert.rejects(c.run('bad',async()=>{throw Error('failed');}),/failed/);
 assert.deepEqual(await c.run('bad',async()=>({ok:true})),{ok:true});
});
test('cancellation belongs to subscribers and queued abandoned work never starts',async()=>{
 const c=load().createEtherscanCoordinator({...options,maxJobs:3});const a=new AbortController();let sharedSignal;
 const execute=async signal=>{sharedSignal=signal;await sleep(25);return {ok:true};};
 const first=c.run('shared',execute,a.signal);const second=c.run('shared',execute);
 a.abort();await assert.rejects(first);assert.equal((await second).ok,true);assert.equal(sharedSignal.aborted,false);
 const hold=c.run(undefined,async()=>{await sleep(30);return {};});const queued=new AbortController();let ran=false;
 const abandoned=c.run(undefined,async()=>{ran=true;return {};},queued.signal);queued.abort();await assert.rejects(abandoned);await hold;await sleep(25);assert.equal(ran,false);
});
test('last subscriber abort reaches active transport; rejected metadata is never cached',async()=>{
 const c=load().createEtherscanCoordinator(options);const abort=new AbortController();let transportSignal;
 const pending=c.run('cancel',signal=>{transportSignal=signal;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));},abort.signal);
 await sleep(5);abort.abort();await assert.rejects(pending);assert.equal(transportSignal.aborted,true);
 let calls=0;const execute=async()=>({call:++calls});
 await c.run('invalid',execute,undefined,()=>false);await c.run('invalid',execute,undefined,()=>false);assert.equal(calls,2);
});
test('cache limits evict old entries and oversized payloads are not retained',async()=>{
 const c=load().createEtherscanCoordinator({...options,spacingMs:0,ttlMs:1000,maxBytes:40});let calls=0;
 const execute=async()=>({v:++calls});
 for(const key of ['a','b','c','a'])await c.run(key,execute,undefined,()=>true);
 assert.equal(calls,4);
 const huge=async()=>{calls++;return {value:'x'.repeat(100)};};
 await c.run('huge',huge,undefined,()=>true);await c.run('huge',huge,undefined,()=>true);assert.equal(calls,6);
 const aborted=new AbortController();aborted.abort();await assert.rejects(c.run('c',execute,aborted.signal,()=>true));
});

test('cache byte limit evicts even when the entry-count limit is not reached',async()=>{
 const c=load().createEtherscanCoordinator({...options,spacingMs:0,ttlMs:1000,maxEntries:10,maxBytes:12});let calls=0;
 const execute=async()=>({v:++calls});
 await c.run('a',execute,undefined,()=>true);await c.run('b',execute,undefined,()=>true);await c.run('a',execute,undefined,()=>true);
 assert.equal(calls,3);
});
