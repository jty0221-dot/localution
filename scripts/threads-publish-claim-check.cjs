const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const source=fs.readFileSync(path.resolve(__dirname,'../app/api/cron/threads-publish/route.ts'),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
async function scenario({concurrent=false,claimError=false,emptyClaim=false,queueFail=false,queueThrow=false,otherOwner=false,recoveryError=false,authorized=true}={}) {
 const row={id:'post-fixture',user_id:'user-fixture',status:'scheduled',updated_at:'old',scheduled_at:'2000-01-01',retry_count:0};let jobs=0,reads=0,release;const barrier=new Promise(r=>release=r);
 const svc={from(){let patch=null,filters=[];const q={select(){return q},update(v){patch=v;return q},in(k,v){filters.push(r=>v.includes(r[k]));return q},eq(k,v){filters.push(r=>r[k]===v);return q},lte(k,v){filters.push(r=>r[k]<=v);return q},lt(k,v){filters.push(r=>r[k]<v);return q},limit(){return q},async then(resolve,reject){try{
 if(!patch){const snapshot=filters.every(f=>f(row))?[{...row}]:[];if(concurrent){if(++reads===2)release();await barrier}return resolve({data:snapshot,error:null})}
 if(patch.status==='publishing'&&claimError)return resolve({data:null,error:{message:'fixture error'}});
 if(patch.status==='publishing'&&emptyClaim)return resolve({data:[],error:null});
 if(patch.status==='failed'&&recoveryError)return resolve({data:null,error:{message:'fixture recovery error'}});
 const matches=filters.every(f=>f(row));if(matches)Object.assign(row,patch);return resolve({data:matches?[{...row}]:[],error:null});
 }catch(e){reject(e)}}};return q}};
 const mod={exports:{}};const reqmod=n=>n==='next/server'?{NextResponse:{json:(body,o)=>({body,status:o?.status||200})}}:n==='@/app/lib/adminAuth'?{createServiceClient:()=>svc}:n==='@/app/lib/queue'?{enqueuePlatformJob:async()=>{jobs++;if(otherOwner){row.updated_at='different-claim';row.status='publishing'}if(queueThrow)throw Error('fixture');return queueFail?{ok:false,error:'fixture rejection'}:{ok:true,jobId:'fixture-job'}}}:require(n);
 vm.runInNewContext(compiled,{module:mod,exports:mod.exports,require:reqmod,process:{env:{CRON_SECRET:'fixture-secret'}},Date});
 const req={headers:{get:()=>authorized?'Bearer fixture-secret':'bad'}};
 const responses=concurrent?await Promise.all([mod.exports.GET(req),mod.exports.GET(req)]):[await mod.exports.GET(req)];return{row,jobs,responses};
}
(async()=>{
 let s=await scenario({concurrent:true});assert.equal(s.jobs,1);assert.deepEqual(s.responses.map(r=>r.body.count).sort(),[0,1]);assert.equal(s.row.status,'publishing');
 s=await scenario({claimError:true});assert.equal(s.jobs,0);assert.equal(s.responses[0].status,500);
 s=await scenario({emptyClaim:true});assert.equal(s.jobs,0);assert.equal(s.responses[0].body.count,0);
 s=await scenario({queueFail:true});assert.equal(s.row.status,'failed');assert.equal(s.responses[0].status,500);assert.equal(s.responses[0].body.recovery_failed,0);
 s=await scenario({queueFail:true,otherOwner:true});assert.equal(s.row.status,'publishing');assert.equal(s.row.updated_at,'different-claim');assert.equal(s.responses[0].body.recovery_failed,1);
 s=await scenario({queueFail:true,recoveryError:true});assert.equal(s.row.status,'publishing');assert.equal(s.responses[0].body.recovery_failed,1);
 s=await scenario({queueThrow:true});assert.equal(s.row.status,'failed');assert.equal(s.responses[0].status,500);
 s=await scenario({authorized:false});assert.equal(s.jobs,0);assert.equal(s.responses[0].status,401);
 console.log(JSON.stringify({passed:8,cases:['two-concurrent-requests-enqueue-once','claim-error-enqueue-zero','unclaimed-row-enqueue-zero','enqueue-failure-conditionally-recovers','different-claim-not-overwritten','recovery-error-reported','queue-throw-recovered','unauthorized-enqueue-zero'],external_requests:0,production_db_writes:0},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
