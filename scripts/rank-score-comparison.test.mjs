import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),ts=require('typescript'),m={exports:{}}
new Function('exports','module',ts.transpileModule(readFileSync(new URL('../app/lib/rank-score-comparison.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m.exports,m)
const {compareRankScorePair:compare}=m.exports
const base={placeId:'1',label:'합성 A',provider:'adrank',metric:'rankScore',origin:'provider-unknown',scoreDirection:'higher-is-better',keyword:'예시 키워드',date:'2026-09-16',rankStatus:'measured',rank:2,score:'20',conditions:{batchId:'sample-batch',surface:'map-list',device:'desktop',locationKey:'fixed-test-region',sort:'relevance',adExcluded:true,maxDepth:100}}
const other={...base,placeId:'2',label:'합성 B',rank:5,score:10}
test('same recorded conditions agreement',()=>{const r=compare(base,other);assert.equal(r.comparability,'same-recorded-conditions');assert.equal(r.ordering,'agrees');assert.equal(r.causalCriterionVerified,false)})
test('reverse ordering',()=>assert.equal(compare({...base,score:5},other).ordering,'disagrees'))
test('score tie',()=>assert.equal(compare({...base,score:10},other).ordering,'score-tie'))
test('rank tie',()=>assert.equal(compare({...base,rank:5},other).ordering,'rank-tie'))
test('unknown conditions not controlled',()=>assert.equal(compare({...base,conditions:undefined},{...other,conditions:undefined}).comparability,'conditions-incomplete'))
test('missing stable identities warned',()=>assert.equal(compare({...base,placeId:null},other).comparability,'conditions-incomplete'))
test('same identity rejected',()=>assert.equal(compare(base,{...other,placeId:'1'}).comparability,'not-comparable'))
test('different keywords rejected',()=>assert.equal(compare(base,{...other,keyword:'다른 키워드'}).comparability,'not-comparable'))
test('different days rejected',()=>assert.equal(compare(base,{...other,date:'2026-09-15'}).comparability,'not-comparable'))
test('impossible dates rejected',()=>assert.equal(compare({...base,date:'2026-02-30'},{...other,date:'2026-02-30'}).comparability,'not-comparable'))
test('different provider rejected',()=>assert.equal(compare(base,{...other,provider:'adlog'}).comparability,'not-comparable'))
test('different metrics rejected',()=>assert.equal(compare(base,{...other,metric:'place_n2'}).comparability,'not-comparable'))
test('different location rejected',()=>assert.equal(compare(base,{...other,conditions:{...base.conditions,locationKey:'elsewhere'}}).comparability,'not-comparable'))
test('different ad policy rejected',()=>assert.equal(compare(base,{...other,conditions:{...base.conditions,adExcluded:false}}).comparability,'not-comparable'))
test('different batch rejected',()=>assert.equal(compare(base,{...other,conditions:{...base.conditions,batchId:'later'}}).comparability,'not-comparable'))
test('zero valid score',()=>assert.equal(compare({...base,score:0},other).ordering,'disagrees'))
test('null and blank scores rejected',()=>{for(const score of [null,'',' ',NaN,Infinity])assert.equal(compare({...base,score},other).ordering,'unavailable')})
test('missing ranks rejected',()=>{for(const rank of [0,null,-1,1.5])assert.equal(compare({...base,rank},other).ordering,'unavailable')})
test('rank derived excluded as predictor',()=>{const r=compare({...base,origin:'rank-derived'},{...other,origin:'rank-derived'});assert.equal(r.ordering,'agrees');assert.equal(r.predictorStatus,'excluded-rank-derived')})
test('incomplete conditions need no fabricated default',()=>assert.equal(compare({...base,conditions:{...base.conditions,maxDepth:null}},other).comparability,'conditions-incomplete'))
test('blank or nonnumeric identity cannot establish distinct places',()=>{for(const placeId of [' ', 'store-A'])assert.equal(compare({...base,placeId},other).comparability,'conditions-incomplete')})
test('malformed runtime keyword rejected without throwing',()=>assert.equal(compare({...base,keyword:123},other).comparability,'not-comparable'))

test('lower score hypothesis explicit',()=>assert.equal(compare({...base,score:5,scoreDirection:'lower-is-better'},{...other,scoreDirection:'lower-is-better'}).ordering,'agrees'))
test('unknown score direction not guessed',()=>assert.equal(compare({...base,scoreDirection:undefined},other).comparability,'not-comparable'))

test('censored positive sentinel not measured rank',()=>assert.equal(compare({...base,rankStatus:'unranked',rank:100},other).ordering,'unavailable'))
test('unknown rank status not silently measured',()=>assert.equal(compare({...base,rankStatus:undefined},other).ordering,'unavailable'))
test('rank beyond known depth rejected',()=>assert.equal(compare({...base,rank:101},other).ordering,'unavailable'))
test('simultaneous ties explicit',()=>assert.equal(compare({...base,rank:5,score:10},other).ordering,'both-tie'))
