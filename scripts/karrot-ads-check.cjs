const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('assert/strict'),path=require('path');
const mod={exports:{}};let calls=[];let response={ok:true,json:async()=>({campaigns:[]})};
const db={from(){return {select(){return this},eq(){return this},maybeSingle:async()=>({data:{advertiser_id:'123',encrypted_key:{}},error:null})}}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../app/lib/karrot-ads.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module:mod,exports:mod.exports,require:n=>n==='./adminAuth'?{createServiceClient:()=>db}:{encryptSecret:()=>({ciphertext:'encrypted'}),decryptSecret:()=> 'test-key'},Error,URL,Date,AbortSignal,fetch:async(url,init)=>{calls.push({url,init});return response}});
const api=mod.exports;
(async()=>{
 assert.throws(()=>api.karrotCredentials('not-id','key'));assert.throws(()=>api.karrotCredentials('123','bad\r\nkey'));assert.equal(api.karrotCredentials('123','key').advertiserId,'123');
 for(const [s,e] of [['2026-02-30','2026-03-02'],['2026-02-01','2026-03-15'],['2026-10-18','2026-10-17'],['x','x']])assert.throws(()=>api.karrotPeriod(s,e));
 assert.equal(api.karrotPeriod('2026-10-01','2026-10-31').startDateTime,'2026-10-01T00:00:00+09:00');
 assert.throws(()=>api.karrotOrigin({url:'https://localution.co.kr/api/karrot/account',headers:{get:()=> 'https://evil.test'}}));
 await api.karrotRead('123','key','/v1/campaigns');assert.equal(calls[0].init.headers['X-ADVERTISER-ID'],'123');assert.equal(calls[0].init.redirect,'error');assert.equal(calls[0].init.method,'GET');
 response={ok:false,status:429};await assert.rejects(()=>api.karrotRead('123','key','/v1/campaigns'),e=>e.code==='rate_limited');
 response={ok:true,json:async()=>({campaigns:[{id:'a',advertiserId:'other'}]})};await assert.rejects(()=>api.karrotReport('owner','2026-10-01','2026-10-02'),e=>e.code==='provider_rejected');
 response={ok:true,json:async()=>({campaigns:[]})};const report=await api.karrotReport('owner','2026-10-01','2026-10-02');assert.equal(report.performances.length,0);
 console.log('PASS 15 karrot ads checks; real API calls 0; DB writes 0');
})().catch(e=>{console.error(e);process.exitCode=1});
