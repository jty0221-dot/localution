import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const box = { exports: {} }
vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../app/lib/promotion-profit.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, box)
const calculate = box.exports.calculatePromotion
const base = { price: 10000, material: 3000, packaging: 500, other: 500, feePercent: 10, fixedCost: 1000000, baseUnits: 300, promoUnits: 400, discountType: 'percent', discountValue: 10, campaignCost: 100000 }
const result = changes => { const r = calculate({ ...base, ...changes }); assert.ok(r.result, JSON.stringify(r.errors)); return r.result }
let count = 0
const test = (name, run) => { run(); count++; console.log('PASS', name) }
test('손계산 기준 이익·판매량·매출', () => { const r = result({}); assert.equal(r.promoPrice,9000); assert.equal(r.baseContribution,5000); assert.equal(r.promoContribution,4100); assert.equal(r.baselineProfit,500000); assert.equal(r.promoProfit,540000); assert.equal(r.difference,40000); assert.equal(r.sameProfitRange.units,'391'); assert.equal(r.additionalUnits,'91'); assert.equal(r.campaignRecoveryUnits,'25'); assert.equal(r.promoRevenue,3600000) })
test('정액 쿠폰과 정률 할인 일치', () => assert.equal(result({ discountType:'fixed',discountValue:1000 }).promoProfit,540000))
test('할인후판매가 원단위 반올림', () => assert.equal(result({price:1,discountValue:50}).promoPrice,1))
test('매출증가 이익감소', () => { const r=result({promoUnits:350});assert.ok(r.promoRevenue>r.baselineRevenue);assert.ok(r.difference<0) })
test('홍보비0', () => assert.equal(result({campaignCost:0}).campaignRecoveryUnits,'0'))
test('행사공헌0 목표불가', () => { const r=result({discountValue:50});assert.equal(r.promoContribution,500); const z=result({discountType:'fixed',discountValue:10000,material:0,packaging:0,other:0});assert.equal(z.sameProfitRange.kind,'none');assert.equal(z.campaignRecoveryUnits,null) })
test('공헌0 기준이익0 모든판매량', () => { const r=result({price:0,material:0,packaging:0,other:0,campaignCost:0});assert.equal(r.sameProfitRange.kind,'all');assert.equal(r.promoMargin,null) })
test('음수공헌 기존손실유지 상한', () => { const r=result({price:100,material:200,packaging:0,other:0,feePercent:0,baseUnits:10,promoUnits:10,discountValue:0,campaignCost:0});assert.equal(r.sameProfitRange.kind,'at-most');assert.equal(r.sameProfitRange.units,'10');assert.equal(r.additionalUnits,null) })
test('음수공헌 홍보비가손실임계초과', () => assert.equal(result({price:100,material:200,packaging:0,other:0,baseUnits:0,campaignCost:1}).sameProfitRange.kind,'none'))
test('같은조건 차이0', () => assert.equal(result({discountValue:0,campaignCost:0,promoUnits:300}).difference,0))
test('수수료 할인후적용', () => assert.equal(result({discountType:'fixed',discountValue:1000}).promoContribution,4100))
test('과도할인·음수·소수원화·상한거절', () => { for(const changes of [{discountValue:101},{discountType:'fixed',discountValue:10001},{material:-1},{price:1.5},{price:1000000001},{promoUnits:1000001},{baseUnits:.5}]) assert.equal(calculate({...base,...changes}).result,null) })
test('NaN Infinity null 누락조건', () => { for(const changes of [{price:NaN},{feePercent:Infinity},{campaignCost:undefined}])assert.equal(calculate({...base,...changes}).result,null);assert.equal(calculate(null).result,null) })
test('수수료 4자리까지만', () => { assert.ok(result({feePercent:3.3333}));assert.equal(calculate({...base,feePercent:3.33333}).result,null) })
test('큰정수 이익 원단위정확 양수·음수', () => { const p=result({price:999999999,material:0,packaging:0,other:0,feePercent:0,baseUnits:999999,promoUnits:1000000,discountValue:0,campaignCost:0,fixedCost:999999999});assert.equal(p.promoProfit,Number(BigInt(999999999)*BigInt(1000000)-BigInt(999999999))); const n=result({price:0,material:999999999,packaging:999999999,other:999999999,feePercent:0,promoUnits:1000000,fixedCost:999999999,campaignCost:999999999});assert.equal(n.promoProfit,Number(-BigInt(999999999)*BigInt(3000000)-BigInt(1999999998))) })
test('수량결과 Number 안전범위초과도 문자열정확', () => { const r=result({price:1000000000,material:0,packaging:0,other:0,feePercent:99.9999,baseUnits:1000000,discountType:'fixed',discountValue:999999999,campaignCost:1000000000});assert.equal(r.promoContribution,.000001);assert.equal(r.sameProfitRange.units,'2000000000000000') })
console.log(`${count} promotion profit tests passed`)
