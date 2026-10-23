import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url), ts=require('typescript'), module={exports:{}}
new Function('exports','module',ts.transpileModule(readFileSync(new URL('../app/lib/rank-history.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(module.exports,module)
const {parseRankHistory:parse,summarizeRankSeries:summary,SAMPLE_RANK_HISTORY_JSON}=module.exports
const p=(rank,date='2026-10-18',extra={})=>({date,rank,...extra})
const text=points=>JSON.stringify({series:[{id:'a',label:'synthetic',keyword:'example',points}]})
const ok=points=>{const r=parse(text(points));assert.deepEqual(r.errors,[]);return r.series[0]}
test('synthetic example parses',()=>assert.equal(parse(SAMPLE_RANK_HISTORY_JSON).series.length,1))
test('sort real dates',()=>assert.equal(ok([p(1),p(2,'2026-10-17')]).points[0].date,'2026-10-17'))
test('unknown is not unranked',()=>{for(const rank of [null,0,'',undefined])assert.equal(ok([p(rank)]).points[0].status,'missing')})
test('explicit unranked',()=>assert.equal(ok([p('권외')]).points[0].status,'unranked'))
test('invalid ranks reject',()=>{for(const rank of [-1,1.5,'abc',Infinity]){if(rank===Infinity)continue;assert.ok(parse(text([p(rank)])).errors.length)}})
test('impossible dates reject',()=>{for(const date of ['2026-02-29','2026-13-01','2026-1-01'])assert.ok(parse(text([p(1,date)])).errors.length)})
test('leap day accepted',()=>assert.equal(ok([p(1,'2024-02-29')]).points.length,1))
test('identical duplicate merges',()=>assert.equal(ok([p(1),p(1)]).points.length,1))
test('conflicting duplicate rejects all',()=>assert.equal(parse(text([p(1),p(2)])).series.length,0))
test('status conflict rejects',()=>assert.ok(parse(text([p(2,undefined,{status:'missing'})])).errors.length))
test('raw schema and approximate saves',()=>{const r=parse(JSON.stringify({groups:[{'매장':'합성','키워드':'예시',ranks:[{dailyDate:'2026.10.18',rank:3,saveCnt:'100+',visitantReviewCnt:0,blogReviewCnt:2}]}]}));assert.deepEqual(r.errors,[]);assert.equal(r.series[0].points[0].saves,null);assert.equal(r.series[0].points[0].saveText,'100+');assert.equal(r.series[0].points[0].visitorReviews,0)})
test('TSV only actual reference date',()=>{const r=parse('매장\t키워드\t기준일\t오늘\t어제\n합성\t예시\t2026.10.17\t3\t7','2026-10-18.tsv');assert.equal(r.series[0].points.length,1);assert.equal(r.series[0].points[0].date,'2026-10-17')})
test('TSV missing columns rejects',()=>assert.ok(parse('매장\t키워드\n합성\t예시').errors.length))
test('latest unknown retained',()=>{const s=summary(ok([p(4,'2026-10-17'),p(null)]));assert.equal(s.latest.status,'missing');assert.equal(s.lastMeasured.rank,4);assert.equal(s.delta,null)})
test('rank increase sign and measured mean',()=>{const s=summary(ok([p(8,'2026-10-16'),p(null,'2026-10-17'),p(4)]));assert.equal(s.average,6);assert.equal(s.measuredCount,2);assert.equal(s.missingCount,1);assert.equal(s.delta,null)})
test('date filtering and reversed range',()=>{const s=ok([p(8,'2026-10-17'),p(4)]);assert.equal(summary(s,'2026-10-18').measuredCount,1);assert.equal(summary(s,'2026-10-18','2026-10-17').measuredCount,0)})
test('review deltas numeric only',()=>{const s=summary(ok([p(8,'2026-10-17',{visitorReviews:2,saves:null}),p(4,undefined,{visitorReviews:5,saves:20})]));assert.equal(s.delta,4);assert.equal(s.visitorReviewDelta,3);assert.equal(s.saveDelta,null)})
test('two year span rejected',()=>assert.ok(parse(text([p(1,'2020-01-01'),p(2,'2026-10-18')])).errors.length))
test('file bytes capped',()=>assert.ok(parse('x'.repeat(5*1024*1024+1)).errors.length))
test('series capped',()=>assert.ok(parse(JSON.stringify({series:Array.from({length:501},(_,i)=>({id:String(i),label:'x',keyword:'y',points:[p(1)]}))})).errors.length))
test('prototype identifiers safe',()=>{const raw=JSON.parse(text([p(1)]));raw.series[0].id='__proto__';assert.equal(parse(JSON.stringify(raw)).series.length,1)})
test('string rank cannot conflict with unranked',()=>assert.ok(parse(text([p('3',undefined,{status:'unranked'})])).errors.length))
test('point count capped',()=>assert.ok(parse(text(Array.from({length:60001},()=>p(1)))).errors.length))
