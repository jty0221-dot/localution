import assert from 'node:assert/strict'
import { calculateCost, EMPTY_COST_INPUT } from '../app/lib/business-cost.ts'
const base = { ...EMPTY_COST_INPUT, salePrice: 10000, materialCost: 3000, packagingCost: 500, otherVariableCost: 500, feePercent: 10, fixedCost: 1000000, monthlyUnits: 300, targetProfit: 500000, workingDays: 25 }
let count = 0
function check(name, run) { run(); count++; console.log('PASS', name) }
check('대표 수치와 목표 판매량', () => { const r=calculateCost(base); assert.equal(r.valid,true);assert.equal(r.variableCost,5000);assert.equal(r.contribution,5000);assert.equal(r.monthlyProfit,500000);assert.equal(r.breakEvenUnits,200);assert.equal(r.targetUnits,300);assert.equal(r.dailyTargetUnits,12) })
check('손익분기 수량 올림', () => {const r=calculateCost({...base,fixedCost:1000001});assert.equal(r.breakEvenUnits,201)})
check('공헌이익 0은 달성 불가', () => {const r=calculateCost({...base,materialCost:8000});assert.equal(r.contribution,0);assert.equal(r.breakEvenUnits,null);assert.equal(r.targetUnits,null)})
check('공헌이익 음수와 월 손실', () => {const r=calculateCost({...base,materialCost:9000});assert.equal(r.breakEvenUnits,null);assert.equal(r.monthlyProfit,-1300000)})
check('고정비 0 손익분기 0', () => {assert.equal(calculateCost({...base,fixedCost:0}).breakEvenUnits,0)})
check('판매 0건은 고정비 손실', () => {assert.equal(calculateCost({...base,monthlyUnits:0}).monthlyProfit,-1000000)})
check('가격 0은 이익률 계산 안함', () => {assert.equal(calculateCost({...base,salePrice:0}).marginPercent,null)})
check('수수료 100%와 초과 검증', () => {assert.equal(calculateCost({...base,feePercent:100}).targetUnits,null);assert.equal(calculateCost({...base,feePercent:101}).valid,false)})
check('정수가 아닌 금액 거절', () => {assert.equal(calculateCost({...base,materialCost:0.9999996}).valid,false)})
check('기간 및 판매량 검증', () => {for(const change of [{workingDays:0},{workingDays:32},{workingDays:2.5},{monthlyUnits:1.1}])assert.equal(calculateCost({...base,...change}).valid,false)})
check('NaN Infinity 음수 상한 검증', () => {for(const salePrice of [NaN,Infinity,-1,1000000001]) assert.equal(calculateCost({...base,salePrice}).valid,false)})
check('큰 입력에서도 유한 값', () => {const r=calculateCost({...base,salePrice:1e9,monthlyUnits:1e6});assert.ok(Number.isFinite(r.monthlyProfit))})
check('가격 시나리오 고정 판매량', () => {const r=calculateCost(base);assert.deepEqual(r.scenarios.map(s=>s.price),[9000,10000,11000]);assert.equal(r.scenarios[0].contribution,4100);assert.equal(r.scenarios[2].monthlyProfit,770000)})
check('소수 수수료 정밀도', () => {const r=calculateCost({...base,salePrice:100,materialCost:0,packagingCost:0,otherVariableCost:0,feePercent:99.9999,fixedCost:1,targetProfit:0});assert.equal(r.contribution,0.0001);assert.equal(r.breakEvenUnits,10000)})
check('필요 금액 0은 공헌이익이 0 이하라도 최소 판매량 0', () => {
  for (const materialCost of [100, 101]) {
    const r=calculateCost({...EMPTY_COST_INPUT,salePrice:100,materialCost,workingDays:26})
    assert.equal(r.breakEvenUnits,0);assert.equal(r.targetUnits,0);assert.equal(r.dailyTargetUnits,0)
    assert.equal(r.monthlyProfit,0)
    assert.equal(calculateCost({...EMPTY_COST_INPUT,salePrice:100,materialCost,workingDays:26,monthlyUnits:1}).monthlyProfit,100-materialCost)
    assert.equal(calculateCost({...EMPTY_COST_INPUT,salePrice:100,materialCost,workingDays:26,targetProfit:1}).targetUnits,null)
  }
})
check('허용 큰 정수 매출과 이익에 소수 원을 만들지 않음', () => {
  const salePrice=999999982, monthlyUnits=999999
  const expected=Number(BigInt(salePrice)*BigInt(monthlyUnits))
  const r=calculateCost({...EMPTY_COST_INPUT,salePrice,monthlyUnits,workingDays:26})
  assert.equal(r.monthlyRevenue,expected);assert.equal(r.monthlyProfit,expected)
  assert.equal(Number.isInteger(r.monthlyRevenue),true)
  const loss=calculateCost({...EMPTY_COST_INPUT,salePrice:0,materialCost:salePrice,monthlyUnits,workingDays:26})
  assert.equal(loss.monthlyProfit,-expected)
})
console.log(`${count} calculation tests passed`)
