const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const ts = require('typescript')
const source = fs.readFileSync(path.join(__dirname, '../app/lib/local-account-storage.ts'), 'utf8')
const exportsMock = {}
vm.runInNewContext(ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, {
 exports: exportsMock, Date, AbortSignal, require(name) { if (name === 'react') return {}; if (name === './useUser') return {}; throw Error(name) }
})
const { koreaDate, addCalendarDays, accountStorageKey, readAccountList, writeAccountList } = exportsMock
let count = 0
async function test(name, fn) { await fn(); count++; console.log('PASS ' + name) }
const response = id => async () => ({ok:true,json:async()=>({user:{id}})})
;(async () => {
 await test('KST midnight boundary', () => assert.equal(koreaDate(new Date('2026-10-20T15:30:00Z')), '2026-10-21'))
 await test('KST 09:00', () => assert.equal(koreaDate(new Date('2026-10-21T00:00:00Z')), '2026-10-21'))
 await test('calendar month rollover', () => assert.equal(addCalendarDays('2026-10-31', 1), '2026-11-01'))
 await test('blank owner rejected', () => assert.throws(() => accountStorageKey('events', ' ')))
 const data = new Map([['localution.events', '[{"id":"legacy"}]']]); const storage = {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}
 await test('legacy never read or migrated', () => {assert.equal(readAccountList(storage,'events','A').length,0);assert.equal(data.size,1)})
 await test('owner verified before save', async () => {await writeAccountList(storage,'events','A',[{id:'a',startDate:'2026-10-21',endDate:'2026-10-22',title:'owned'}],()=> 'A',response('A'));assert.equal(readAccountList(storage,'events','A')[0].id,'a')})
 await test('other account isolated', () => assert.equal(readAccountList(storage,'events','B').length,0))
 await test('server owner changed blocks write', async () => {await assert.rejects(writeAccountList(storage,'events','A',[],()=> 'A',response('B')));assert.equal(readAccountList(storage,'events','A').length,1)})
 await test('inflight owner changed blocks write', async () => {await assert.rejects(writeAccountList(storage,'events','A',[],()=> 'B',response('A')));assert.equal(readAccountList(storage,'events','A').length,1)})
 await test('401 blocks write', async () => {await assert.rejects(writeAccountList(storage,'events','A',[],()=> 'A',async()=>({ok:false,json:async()=>({})})));assert.equal(readAccountList(storage,'events','A').length,1)})
 await test('network failure preserves stored data', async () => {await assert.rejects(writeAccountList(storage,'events','A',[],()=> 'A',async()=>{throw Error('offline')}));assert.equal(readAccountList(storage,'events','A').length,1)})
 await test('quota exception propagates', async () => await assert.rejects(writeAccountList({setItem(){throw Error('quota')}},'events','A',[],()=> 'A',response('A'))))
 await test('corrupt JSON rejects rather than overwrites', () => assert.throws(()=>readAccountList({getItem:()=>'{bad'},'events','A')))
 await test('invalid list rejects', () => assert.throws(()=>readAccountList({getItem:()=>'[null]'},'events','A')))
 await test('legacy stays unchanged', () => assert.equal(data.get('localution.events'),'[{"id":"legacy"}]'))
 console.log(`${count} cases passed; no browser, DB or external publication`)
})().catch(e=>{console.error(e);process.exitCode=1})
