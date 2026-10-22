const fs=require('fs'),path=require('path'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict')
const source=fs.readFileSync(path.join(__dirname,'../app/api/customers/route.ts'),'utf8')
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
const uuid='00000000-0000-4000-8000-000000000001'
async function run(method,identity={ok:true,userId:uuid}){
 const calls=[],exports={};let serviceCalls=0
 const chain={select(){return chain},eq(key,value){calls.push(['filter',key,value]);return chain},order:async()=>({data:[],error:null}),insert(value){calls.push(['insert',value]);return chain},update(value){calls.push(['update',value]);return chain},delete(){calls.push(['delete']);return chain},single:async()=>({data:{id:'fixture',name:'test'},error:null}),then(resolve){return Promise.resolve({error:null}).then(resolve)}}
 vm.runInNewContext(compiled,{exports,Date,require(n){if(n==='next/server')return{NextResponse:{json:(body,options={})=>({body,...options})}};if(n.endsWith('/userAuth'))return{requireUser:async()=>({ok:true,userId:'Raw-provider-ID',source:'localution'})};if(n.endsWith('/verified-identity'))return{resolveVerifiedIdentity:async()=>identity};if(n.endsWith('/adminAuth'))return{createServiceClient:()=>{serviceCalls++;return{from:()=>chain}}};throw Error(n)}})
 const response=await exports[method]({json:async()=>({id:'fixture',name:'test'}),nextUrl:{searchParams:new URLSearchParams({id:'fixture'})}})
 return{response,calls,serviceCalls}
}
;(async()=>{let count=0;for(const method of ['GET','POST','PUT','DELETE']){
 const blocked=await run(method,{ok:false,status:409,code:'identity_mapping_required',error:'blocked'});assert.equal(blocked.response.status,409);assert.equal(blocked.serviceCalls,0);count++
 const result=await run(method);assert.equal(result.response.body.ok,true)
 if(method==='POST')assert.equal(result.calls.find(x=>x[0]==='insert')[1].user_id,uuid)
 else assert.ok(result.calls.some(x=>x[0]==='filter'&&x[1]==='user_id'&&x[2]===uuid))
 assert.equal(JSON.stringify(result.calls).includes('Raw-provider-ID'),false);count++
 }console.log(count+' customer CRUD mapping cases passed; verified UUID filters; unresolved mapping performs zero DB calls')})().catch(e=>{console.error(e);process.exitCode=1})
