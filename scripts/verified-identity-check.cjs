const fs=require('fs'),vm=require('vm'),path=require('path'),ts=require('typescript'),assert=require('node:assert/strict')
const compiled=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../app/lib/verified-identity.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
const id='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002'
const base={provider:'naver',providerClientId:'client-a',rawId:'Raw-Case',authUserId:id,verifiedAt:'2020-01-01T00:00:00Z',expiresAt:'2099-01-01T00:00:00Z',approvedRef:'owner-confirmation-fixture'}
function context({bindings=[base],raw,cookie={id:base.rawId,provider:'naver'},client='client-a',lookupError=false,missingUser=false,timeout=false}={}){
 let reads=0,waitMs=0;const exports={};const env={NAVER_CLIENT_ID:client,LOCALUTION_VERIFIED_IDENTITY_BINDINGS:raw===undefined?JSON.stringify({version:1,bindings}):raw}
 vm.runInNewContext(compiled,{exports,process:{env},Date,Set,JSON,setTimeout:(fn,ms)=>{waitMs=ms;return setTimeout(fn,timeout?0:ms)},clearTimeout,require(n){if(n==='next/headers')return{cookies:async()=>({get:()=>({value:'signed-fixture'})})};if(n==='./cookieSigning')return{verifyCookie:()=>cookie};if(n==='./adminAuth')return{createServiceClient:()=>({auth:{admin:{getUserById:async uuid=>{reads++;if(timeout)return new Promise(()=>{});return{error:lookupError?{}:null,data:{user:missingUser?null:{id:uuid}}}}}}})};throw Error(n)}})
 return{...exports,reads:()=>reads,waitMs:()=>waitMs}
}
const auth={ok:true,source:'localution',userId:base.rawId,email:null};let n=0
async function test(name,fn){await fn();n++;console.log('PASS '+name)}
;(async()=>{
 await test('exact signed provider mapping',async()=>{const c=context(),r=await c.resolveVerifiedIdentity(auth);assert.equal(r.userId,id);assert.equal(c.reads(),1)})
 await test('supabase source uses verified UUID without binding lookup',async()=>{const c=context();assert.equal((await c.resolveVerifiedIdentity({...auth,source:'supabase',userId:id})).userId,id);assert.equal(c.reads(),0)})
 await test('raw UUID is not trusted as auth UUID',async()=>{const c=context({bindings:[],cookie:{provider:'naver',id}});assert.equal((await c.resolveVerifiedIdentity({...auth,userId:id})).status,409);assert.equal(c.reads(),0)})
 for(const [name,options,status] of [
 ['wrong client ID',{client:'client-b'},409],['wrong binding client ID',{bindings:[{...base,providerClientId:'client-b'}]},409],
 ['case sensitive raw ID',{bindings:[{...base,rawId:'raw-case'}]},409],['unsigned cookie',{cookie:null},409],['cookie ID mismatch',{cookie:{provider:'naver',id:'other'}},409],
 ['unsupported provider',{cookie:{provider:'google',id:base.rawId}},409],['missing configuration',{raw:''},409],['malformed JSON',{raw:'{broken'},503],
 ['future verification',{bindings:[{...base,verifiedAt:'2100-01-01T00:00:00Z'}]},503],['expired binding',{bindings:[{...base,expiresAt:'2020-01-02T00:00:00Z'}]},503],
 ['missing approval reference',{bindings:[{...base,approvedRef:''}]},503],['duplicate raw mapping',{bindings:[base,{...base,authUserId:other}]},503],
 ['reverse UUID duplicate',{bindings:[base,{...base,rawId:'Other',providerClientId:'client-b'}]},503],['invalid UUID',{bindings:[{...base,authUserId:'raw'}]},503],
 ['UUID absent',{missingUser:true},503],['auth lookup fails',{lookupError:true},503],['lookup timeout',{timeout:true},503]]){
 await test(name,async()=>{const c=context(options);assert.equal((await c.resolveVerifiedIdentity(auth)).status,status);if(name==='lookup timeout')assert.equal(c.waitMs(),10000)})
 }
 console.log(n+' cases passed; mock identities only; no live auth, configuration, DB or permissions changed')
})().catch(e=>{console.error(e);process.exitCode=1})
