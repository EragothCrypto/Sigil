const {test}=require('node:test');const assert=require('node:assert/strict');const {readFileSync}=require('node:fs');const {stripTypeScriptTypes}=require('node:module');const vm=require('node:vm');
function load(){const api=vm.createContext({AbortController,AbortSignal,setTimeout,clearTimeout});vm.runInContext(stripTypeScriptTypes(readFileSync(`${__dirname}/analysis-deadline.ts`,'utf8').replace(/export /g,'')),api);return api;}
test('deadline rejects an uncooperative dependency and notifies exactly once',async()=>{
 const api=load();let notified=0;const d=api.createAnalysisDeadline(()=>notified++,15);
 await assert.rejects(d.wait(new Promise(()=>{})),e=>e.code==='analysis_timeout');assert.equal(d.signal.aborted,true);assert.equal(notified,1);d.dispose();assert.throws(()=>d.check(),e=>e.code==='analysis_timeout');
});
test('disposing cancels timer and caller cancellation rejects pending work',async()=>{
 const api=load();let notified=0;const d=api.createAnalysisDeadline(()=>notified++,20);d.dispose();await new Promise(r=>setTimeout(r,30));assert.equal(notified,0);
 const c=new AbortController();const other=api.createAnalysisDeadline(()=>notified++,100,c.signal);const pending=other.wait(new Promise(()=>{}));c.abort();await assert.rejects(pending);assert.equal(notified,0);other.dispose();
});
