const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),ts=require('typescript');
async function run(file,method,body,mode='ok',status='draft'){
let row={id:'p',user_id:'u',status,updated_at:'old',error_message:null},jobs=0,inserts=0;
const svc={from(table){let patch,del=false,filters=[];const q={is(k,v){filters.push(r=>r[k]===v);return q},select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},order(){return q},limit(){return q},insert(p){patch=p;inserts++;return q},update(p){patch=p;return q},delete(){del=true;return q},single(){return q.maybeSingle()},async maybeSingle(){if(table==='platform_credentials')return {data:{account_id:'a'}};if(!patch&&!del)return {data:{...row}};if(mode==='race')row.status='publishing';if(!filters.every(f=>f(row)))return{data:null};if(patch)Object.assign(row,patch);return{data:{...row}}}};return q}};
const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:mod,exports:mod.exports,Date,URL,require(n){if(n==='next/server')return{NextResponse:{json:(body,o)=>({body,status:o?.status||200})}};if(n.endsWith('adminAuth'))return{createServiceClient:()=>svc};if(n.endsWith('userAuth'))return{requireUser:async()=>({ok:true,userId:'u'})};if(n.endsWith('queue'))return{enqueuePlatformJob:async()=>{jobs++;if(mode==='throw')throw Error('transport');return mode==='queue-fail'?{ok:false,error:'queue'}:{ok:true,jobId:'j'}}};throw Error(n)}});
const response=await mod.exports[method]({json:async()=>body},{params:Promise.resolve({id:'p'})});return{response,row,jobs,inserts};}
(async()=>{const create='app/api/threads/posts/route.ts',edit='app/api/threads/posts/[id]/route.ts';for(const mode of ['queue-fail','throw']){const r=await run(create,'POST',{text_content:'test'},mode);assert.equal(r.response.status,503);assert.equal(r.response.body.ok,false);assert.equal(r.row.status,'failed')}
let r=await run(create,'POST',{text_content:'test',scheduled_at:'bad'});assert.equal(r.response.status,400);assert.equal(r.inserts,0);
r=await run(create,'POST',{text_content:'test',scheduled_at:'2099-01-01T00:00:00Z'});assert.equal(r.row.status,'scheduled');assert.equal(r.jobs,0);
r=await run(edit,'PATCH',{scheduled_at:null},'ok','scheduled');assert.equal(r.row.status,'draft');assert.equal(r.row.scheduled_at,null);
r=await run(edit,'PATCH',{scheduled_at:'2099-01-01T00:00:00Z'});assert.equal(r.row.status,'scheduled');
for(const scheduled_at of ['bad','2000-01-01T00:00:00Z']){r=await run(edit,'PATCH',{scheduled_at});assert.equal(r.response.status,400)}
r=await run(edit,'PATCH',{scheduled_at:null},'race','scheduled');assert.equal(r.response.status,409);assert.equal(r.row.status,'publishing');
r=await run(edit,'DELETE',{},'ok','publishing');assert.equal(r.response.status,400);
r=await run(edit,'DELETE',{},'race','scheduled');assert.equal(r.response.status,409);
console.log('11 actual-route checks passed; enqueue failures, scheduling and edit/delete races; external calls/DB mocked')})().catch(e=>{console.error(e);process.exitCode=1});
