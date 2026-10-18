const fs = require('fs'); const vm = require('vm'); const assert = require('node:assert/strict')
const ts = require(process.env.TYPESCRIPT_PATH || 'typescript')
function load(path, dependencies = {}, extras = {}) {
 const module = { exports: {} }
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
 { module, exports: module.exports, require: name => { if (!(name in dependencies)) throw new Error('Unexpected import ' + name); return dependencies[name] }, AbortSignal, console, ...extras })
 return module.exports
}
const helper = load('app/lib/instagram-caption.ts')
let checks = 0
function check(value) { assert.ok(value); checks++ }
check(helper.readCaptionInput({topic:'오늘 직접 만든 소식',tone:'casual'}))
check(!helper.readCaptionInput({topic:' ',tone:'casual'}))
check(!helper.readCaptionInput({topic:'x'.repeat(2001),tone:'casual'}))
check(!helper.readCaptionInput({topic:'소식',tone:'arbitrary'}))
const valid = {caption:'오늘의 소식을 전해요.',hashtags:['소식','매장소식']}
check(helper.readCaptionResult(JSON.stringify(valid)))
check(!helper.readCaptionResult('{broken'))
check(!helper.readCaptionResult(JSON.stringify({...valid,caption:'**할인**'})))
check(!helper.readCaptionResult(JSON.stringify({...valid,caption:'거짓 #태그'})))
check(!helper.readCaptionResult(JSON.stringify({...valid,caption:'기쁜 소식 🎁'})))
check(!helper.readCaptionResult(JSON.stringify({...valid,hashtags:['bad tag']})))
check(!helper.readCaptionResult(JSON.stringify({...valid,caption:'가'.repeat(2200)})))
check(helper.captionPrompt('입력','casual').includes('사진은 전달되지 않았으므로'))
async function routeCase({auth = true, local = true, remote = true, key = 'test-only', body = {topic:'소식',tone:'casual'}, upstream = true, content = valid, reason = 'end_turn', throws = false} = {}) {
 let calls = 0
 const route = load('app/api/marketing/instagram-caption/route.ts', {
  'next/server': {NextResponse: {json: (body, options) => ({body, ...options})}},
  '@/app/lib/userAuth': {requireUser: async () => auth ? {ok:true,userId:'test'} : {ok:false,status:401}},
  '@/app/lib/rateLimit': {checkRate: () => ({ok:local})},
  '@/app/lib/rate-limit': {rateLimit: async () => ({ok:remote})},
  '@/app/lib/instagram-caption': helper,
 }, {process:{env:{ANTHROPIC_API_KEY:key}}, fetch: async () => {calls++; if(throws) throw Error('private upstream'); return {ok:upstream,json:async()=>({stop_reason:reason,content:[{type:'text',text:JSON.stringify(content)}]})} }})
 return {...await route.POST({headers:new Headers(),json:async()=>body}),calls}
}
;(async()=>{
 for (const [input,status] of [[{auth:false},401],[{local:false},429],[{remote:false},429],[{body:{}},400],[{key:''},503]]) {
  const result = await routeCase(input); check(result.status === status && result.calls === 0)
 }
 check((await routeCase({upstream:false})).status === 502)
 check((await routeCase({content:{}})).status === 502)
 check((await routeCase({reason:'max_tokens'})).status === 502)
 check((await routeCase({throws:true})).status === 504)
 const result = await routeCase(); check(result.status === undefined && result.body.status === 'draft' && result.body.photoAnalyzed === false && result.calls === 1)
 console.log(JSON.stringify({checks, passed:true, scope:'Pure helper and mocked route; no real provider call, database write or external post'}))
})().catch(error=>{console.error(error);process.exitCode=1})
