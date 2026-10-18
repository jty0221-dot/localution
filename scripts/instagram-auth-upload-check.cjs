const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript'),crypto=require('node:crypto')
const base=path.join(__dirname,'..')
function load(file,imports,globals={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(base,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,URLSearchParams,Buffer,AbortSignal,process:{env:{}},fetch:async()=>{throw Error('unexpected network')},...globals,require(n){if(n==='crypto')return crypto;if(imports[n])return imports[n];throw Error(n)}});return exports}
const response={json:(body,options)=>({body,...options}),redirect:url=>({url:String(url),headers:new Headers()})}
const api=load('app/lib/instagram-api.ts',{'./adminAuth':{},'./crypto-utils':{}},{process:{env:{}}})
let count=0;async function check(name,fn){await fn();console.log('PASS',name);count++}
;(async()=>{
 for(const url of ['http://example.com/a','file:///x','https://127.0.0.1/a','https://[::1]/a','https://user:pass@example.com/a','https://example.local/a'])await check('reject URL '+url,()=>assert.throws(()=>api.publicMediaUrl(url)))
 await check('public HTTPS accepted',()=>assert.equal(api.publicMediaUrl('https://example.com/a.jpg'),'https://example.com/a.jpg'))
 await check('missing config fails closed',()=>assert.throws(()=>api.instagramConfig(),e=>e.code==='configuration_required'))
 await check('cross origin rejected',()=>assert.throws(()=>api.sameOrigin(new Request('https://www.localution.co.kr/api/instagram/upload',{headers:{origin:'https://other.example'}}))))
 await check('same origin accepted',()=>api.sameOrigin(new Request('https://www.localution.co.kr/api/instagram/upload',{headers:{origin:'https://www.localution.co.kr'}})))
 for(const mode of ['state-mismatch','user-mismatch','denied','unauthenticated'])await check('OAuth '+mode,async()=>{
  let external=0,cleared=0
  const callback=load('app/api/oauth/instagram/callback/route.ts',{'next/server':{NextResponse:response},'next/headers':{cookies:async()=>({get:k=>({value:k.endsWith('state')?'stored':'owner'}),set:()=>{cleared++}})},'@/app/lib/userAuth':{requireUser:async()=>({ok:mode!=='unauthenticated',userId:mode==='user-mismatch'?'other':'owner'})},'@/app/lib/instagram-api':{...api,instagramConfig:()=>{external++;throw Error('must not reach')}}})
  const r=await callback.GET(new Request('https://www.localution.co.kr/api/oauth/instagram/callback?state='+(mode==='state-mismatch'?'wrong':'stored')+'&code=test'+(mode==='denied'?'&error=access_denied':'')))
  assert.equal(external,0);assert.equal(cleared,2);assert.ok(r.url.includes('instagram_error=invalid_request'));assert.equal(r.headers.get('Cache-Control'),'private, no-store')
 })
 const folder='instagram/'+crypto.createHash('sha256').update('owner').digest('hex'),name='12345678-1234-1234-1234-123456789abc.jpg'
 for(const mode of ['no-consent','wrong-owner','oversize','wrong-mime','valid'])await check('upload verify '+mode,async()=>{
  let writes=0
  const route=load('app/api/instagram/upload/route.ts',{'next/server':{NextResponse:response},'@/app/lib/userAuth':{requireUser:async()=>({ok:true,userId:'owner'})},'@/app/lib/rateLimit':{rateLimitByIp:()=>({ok:true})},'@/app/lib/instagram-api':api,'@/app/lib/adminAuth':{createServiceClient:()=>({storage:{from:()=>({async list(){return {data:[{name,metadata:{size:mode==='oversize'?9000000:100,mimetype:mode==='wrong-mime'?'text/html':'image/jpeg'}}]}},getPublicUrl:p=>({data:{publicUrl:'https://example.com/'+p}}),async createSignedUploadUrl(){writes++;return {data:{signedUrl:'mock'}}}})}})}})
  const r=await route.POST(new Request('https://www.localution.co.kr/api/instagram/upload',{method:'POST',headers:{origin:'https://www.localution.co.kr','Content-Type':'application/json'},body:JSON.stringify({action:'verify',path:(mode==='wrong-owner'?'instagram/other':folder)+'/'+name,publicStorageConsent:mode!=='no-consent'})}))
  assert.equal(r.body.ok,mode==='valid');assert.equal(writes,0);assert.equal(r.headers['Cache-Control'],'private, no-store')
 })
 console.log(count+' actual-source auth/upload checks passed; no network or storage mutation')
})().catch(e=>{console.error(e);process.exitCode=1})
