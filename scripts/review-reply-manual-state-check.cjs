const fs = require('fs'); const vm = require('vm'); const assert = require('node:assert/strict');
const ts = require('typescript');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'app/api/review-reply/auto-publish/route.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }}).outputText;
async function run({platform='kakao_map', connected=false, queueOk=true, auth=true, owner=true}={}) {
 const updates=[]; const jobs=[];
 const row={id:'review-test', user_id:owner?'user-test':'other', platform, platform_store_id:'place-test', platform_review_id:'review-platform-test', draft_reply:'저장한 답글', has_reply:false, reply_status:'draft'};
 const svc={from(table) { let change; const chain={select(){return chain},eq(){return chain},order(){return chain},limit(){return chain},update(value){change=value;updates.push({table,value});return chain},maybeSingle(){return Promise.resolve({data:table==='platform_reviews'?row:connected?{platform_store_id:'place-test',password_encrypted:'fixture-only',extra_data:{}}:null,error:null})},then(resolve){resolve({data:null,error:null})}};return chain}};
 const module={exports:{}};
 const queue={enqueuePlatformJob:async(payload)=>{jobs.push(payload);return queueOk?{ok:true,jobId:'job-test'}:{ok:false,error:'fixture-failure'}},getPlatformQueue:()=>({getWaiting:async()=>[]})};
 const reqmod=(name)=>name==='next/server'?{NextResponse:{json:(body,options)=>({body,status:options?.status||200})}}:name==='@/app/lib/userAuth'?{requireUser:async()=>auth?{ok:true,userId:'user-test'}:{ok:false,message:'Unauthorized',status:401}}:name==='@/app/lib/adminAuth'?{createServiceClient:()=>svc}:name==='@/app/lib/queue'?queue:require(name);
 vm.runInNewContext(compiled,{module,exports:module.exports,require:reqmod,process:{env:{REDIS_URL:'fixture-only'}},console:{log(){},warn(){}},Buffer,Date});
 const result=await module.exports.POST({json:async()=>({review_id:'review-test'})});
 return {result,updates,jobs,row};
}
(async()=>{
 const manual=await run(); assert.equal(manual.result.body.mode,'manual_paste');assert.equal(manual.result.body.manual_action_required,true);assert.equal(manual.result.body.reply_status,'draft');assert.equal(manual.updates.length,0);assert.equal(manual.jobs.length,0);assert.equal(manual.row.has_reply,false);
 const queued=await run({connected:true});assert.equal(queued.result.body.reply_status,'queued');assert.equal(queued.jobs.length,1);assert.equal(queued.updates.length,1);assert.equal(queued.updates[0].value.reply_status,'queued');assert.equal('has_reply' in queued.updates[0].value,false);assert.equal('reply_submitted_at' in queued.updates[0].value,false);
 const failure=await run({connected:true,queueOk:false});assert.equal(failure.result.status,500);assert.equal(failure.updates.length,0);assert.equal(failure.result.body.code,'QUEUE_FAILED');
 const unauthorized=await run({auth:false});assert.equal(unauthorized.result.status,401);assert.equal(unauthorized.updates.length,0);assert.equal(unauthorized.jobs.length,0);
 const foreign=await run({owner:false});assert.equal(foreign.result.status,403);assert.equal(foreign.updates.length,0);assert.equal(foreign.jobs.length,0);
 const ui=fs.readFileSync(path.join(root,'app/review-admin/components/PlatformReviewAdmin.tsx'),'utf8');const manualUi=ui.slice(ui.indexOf("if (data.mode === 'manual_paste'"),ui.indexOf(' // ── 자동 발행 모드'));
 assert.equal(/hasReply:\s*true|replyStatus:\s*'submitted'|replySubmittedAt:|setEditingId\(null\)|setDraftText\(''\)/.test(manualUi),false);assert.match(manualUi,/copied = document.execCommand/);assert.match(manualUi,/아직 발행 완료가 아닙니다/);
 console.log(JSON.stringify({passed:6,cases:['manual-no-write-no-enqueue','worker-queued-not-submitted','queue-failure-no-completion','auth-rejected','foreign-review-rejected','manual-ui-preserves-draft-and-counts'],external_requests:0,production_db_writes:0},null,2));
})().catch(error=>{console.error(error);process.exitCode=1});
