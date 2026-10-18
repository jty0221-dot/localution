const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict'), ts = require('typescript')
const id = '12345678-1234-1234-1234-123456789abc'
class InstagramError extends Error { constructor(code, status=400) { super(code); this.code=code; this.status=status } }
function harness(mode='normal') {
 let row = { id, user_id:'owner', instagram_user_id:'123', media_type:'IMAGE', caption:'test', status:'prepared', container_id:'456', media_id:null }
 let publishCalls=0, creates=0, writes=[]
 const svc = { from() {
  let action='read', values, filters=[]
  const execute=async()=>{
   if(action==='insert') { if(row) return {error:{code:'23505'}}; row={...values}; return {data:{...row}} }
   if(!row || filters.some(([k,v])=>row[k]!==v)) return {data:null,error:null}
   if(action==='update') {
    writes.push({...values})
    if(mode==='claim-error' && values.status==='publishing') return {data:null,error:{message:'db'}}
    if(mode==='receipt-error' && values.status==='published_unverified') return {data:null,error:{message:'db'}}
    if(mode==='receipt-zero' && values.status==='published_unverified') return {data:null,error:null}
    if(mode==='storage-down' && ['published_unverified','reconciliation_required'].includes(values.status)) throw new Error('offline')
    Object.assign(row, values)
   }
   return {data:{...row},error:null}
  }
  const q={select(){return q},eq(k,v){filters.push([k,v]);return q},update(v){action='update';values=v;return q},insert(v){action='insert';values=v;return q},maybeSingle:execute,single:execute,then(a,b){return execute().then(a,b)}}
  return q
 } }
 const api={InstagramError, publicMediaUrl(value){if(!String(value).startsWith('https://'))throw new InstagramError('invalid_media_url');return value},async instagramAccount(){return {token:'mock',instagram_user_id:mode==='wrong-account'?'999':'123'}},async instagramGraph(token,route,fields,body){
  if(route.endsWith('/media_publish')) {publishCalls++;if(mode==='provider-timeout')throw new Error('timeout');if(mode==='provider-empty')return {};return {id:'789'}}
  if(route.endsWith('/media')) {creates++;return {id:'456'}}
  if(fields==='status_code')return {status_code:mode==='not-ready'?'IN_PROGRESS':'FINISHED'}
  return {id:mode==='wrong-receipt'?'000':'789',permalink:'https://www.instagram.com/p/example/'}
 }}
 const exports={}
 const source=fs.readFileSync(path.join(__dirname,'../app/lib/instagram-publication.ts'),'utf8')
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,process,require(name){if(name==='./adminAuth')return {createServiceClient:()=>svc};if(name==='./instagram-api')return api;if(name==='crypto')return require('node:crypto');throw Error(name)}})
 return {exports,get row(){return row},clear(){row=null},stats:()=>({publishCalls,creates,writes})}
}
let count=0
async function check(name,fn){await fn();console.log('PASS',name);count++}
;(async()=>{
 await check('atomic concurrent publish once',async()=>{const h=harness();const r=await Promise.allSettled([h.exports.publishInstagram('owner',{id,confirm:true}),h.exports.publishInstagram('owner',{id,confirm:true})]);assert.equal(h.stats().publishCalls,1);assert.equal(r.filter(x=>x.status==='fulfilled').length,1)})
 for(const mode of ['receipt-error','receipt-zero','storage-down','provider-timeout','provider-empty']) await check(mode+' forbids retry',async()=>{const h=harness(mode);const r=await h.exports.publishInstagram('owner',{id,confirm:true});assert.equal(r.status,'reconciliation_required');assert.equal(r.retryAllowed,false);assert.equal(h.stats().publishCalls,1);try{await h.exports.publishInstagram('owner',{id,confirm:true})}catch{}assert.equal(h.stats().publishCalls,1);assert.equal(h.stats().writes.some(w=>w.status==='prepared'),false)})
 for(const mode of ['claim-error','not-ready','wrong-account']) await check(mode+' no publication',async()=>{const h=harness(mode);await assert.rejects(h.exports.publishInstagram('owner',{id,confirm:true}));assert.equal(h.stats().publishCalls,0)})
 await check('owner isolation',async()=>{const h=harness();await assert.rejects(h.exports.publishInstagram('other',{id,confirm:true}));assert.equal(h.stats().publishCalls,0)})
 await check('explicit confirmation required',async()=>{const h=harness();await assert.rejects(h.exports.publishInstagram('owner',{id,confirm:false}));assert.equal(h.stats().publishCalls,0)})
 await check('receipt verified separately',async()=>{const h=harness();const p=await h.exports.publishInstagram('owner',{id,confirm:true});assert.equal(p.status,'published_unverified');const v=await h.exports.verifyInstagram('owner',id);assert.equal(v.verified,true);assert.equal(v.status,'verified');await h.exports.publishInstagram('owner',{id,confirm:true});assert.equal(h.stats().publishCalls,1)})
 await check('wrong receipt never verified',async()=>{const h=harness('wrong-receipt');await h.exports.publishInstagram('owner',{id,confirm:true});await assert.rejects(h.exports.verifyInstagram('owner',id));assert.notEqual(h.row.status,'verified')})
 await check('prepare duplicate request makes one container',async()=>{const h=harness();h.clear();const input={requestId:id,mediaType:'IMAGE',mediaUrl:'https://example.com/a.jpg',caption:'test'};await Promise.all([h.exports.prepareInstagram('owner',input),h.exports.prepareInstagram('owner',input)]);assert.equal(h.stats().creates,1);assert.equal(h.stats().publishCalls,0)})
 await check('invalid prepare before external call',async()=>{const h=harness();await assert.rejects(h.exports.prepareInstagram('owner',{requestId:id,mediaType:'IMAGE',mediaUrl:'file:///x',caption:'test'}));assert.equal(h.stats().creates,0)})
 console.log(count+' actual-source publication checks passed; no external traffic')
})().catch(e=>{console.error(e);process.exitCode=1})
