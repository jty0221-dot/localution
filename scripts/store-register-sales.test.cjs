const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const source=fs.readFileSync(path.join(__dirname,'../app/api/stores/register/route.ts'),'utf8')
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
async function run({body={name:'테스트 매장'},auth={ok:true,userId:'test-owner'},existing=null,lookupError=null,writeError=null,badJson=false}={}){
 const writes=[];let reads=0;const filters=[]
 const service={from(table){return {select(){return this},eq(k,v){filters.push([k,v]);return this},order(){return this},limit(){return this},async maybeSingle(){reads++;return {data:existing,error:lookupError}},update(payload){writes.push({type:'update',payload});return this},insert(payload){writes.push({type:'insert',payload});return this},async single(){return {data:writeError?null:{id:'test-store',slug:'test-slug',name:body.name},error:writeError}}}}}
 const exports={};const context={exports,console,require(name){if(name==='next/server')return {NextResponse:{json:(body,init={})=>({status:init.status||200,body})}};if(name.includes('userAuth'))return {requireUser:async()=>auth};if(name.includes('adminAuth'))return {createServiceClient:()=>service};throw Error(name)}}
 vm.runInNewContext(compiled,context)
 const response=await exports.POST({json:async()=>{if(badJson)throw Error('bad json');return body}})
 return {response,writes,reads,filters}
}
;(async()=>{
 let r=await run({auth:{ok:false,status:401,message:'로그인 필요'}});assert.equal(r.response.status,401);assert.equal(r.reads,0);assert.equal(r.writes.length,0)
 r=await run({badJson:true});assert.equal(r.response.status,400);assert.equal(r.writes.length,0)
 for(const name of ['', '   ',42]){r=await run({body:{name}});assert.equal(r.response.status,400);assert.equal(r.writes.length,0)}
 r=await run({lookupError:{message:'database unavailable'}});assert.equal(r.response.status,503);assert.equal(r.writes.length,0)
 r=await run({existing:{id:'existing',slug:'old'},body:{name:'  매장  '}});assert.equal(r.response.status,200);assert.equal(r.writes[0].type,'update');assert.equal(r.writes[0].payload.name,'매장');assert.ok(r.filters.some(([k,v])=>k==='user_id'&&v==='test-owner'));assert.ok(!Object.hasOwn(r.writes[0].payload,'main_keyword'))
 r=await run();assert.equal(r.response.status,200);assert.equal(r.writes[0].type,'insert')
 r=await run({writeError:{message:'write failed'}});assert.equal(r.response.status,500);assert.equal(r.response.body.ok,false)
 console.log('store register: 9 cases passed; authenticated owner, failed lookup, validation, update/insert and write failure; no live DB')
})().catch(e=>{console.error(e);process.exitCode=1})
