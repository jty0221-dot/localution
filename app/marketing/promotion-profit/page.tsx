'use client'
import { useState } from 'react'
import { Calculator, ArrowRight } from 'lucide-react'
import TopNav from '../../components/TopNav'
import PageHeader from '../../components/PageHeader'
import Footer from '../../components/Footer'
import { ToolNavigation, ToolNextSteps } from '../../components/marketing/ToolWorkflow'
import { calculatePromotion, type PromotionInput, type SalesRange } from '../../lib/promotion-profit'

type NumericKey = Exclude<keyof PromotionInput, 'discountType'>
const fields: { key: NumericKey; label: string; unit: string }[] = [
  { key: 'price', label: '기존 판매가', unit: '원' }, { key: 'material', label: '개당 재료비', unit: '원' },
  { key: 'packaging', label: '개당 포장비', unit: '원' }, { key: 'other', label: '개당 기타 변동비', unit: '원' },
  { key: 'feePercent', label: '판매 수수료율', unit: '%' }, { key: 'fixedCost', label: '월 고정비', unit: '원' },
  { key: 'baseUnits', label: '평소 월 판매량', unit: '개' }, { key: 'promoUnits', label: '행사 월 예상 판매량', unit: '개' },
  { key: 'discountValue', label: '할인 크기', unit: '' }, { key: 'campaignCost', label: '행사 월 홍보비 합계', unit: '원' },
]
type Draft = Record<NumericKey, string>
const empty = () => Object.fromEntries(fields.map(f => [f.key, ''])) as Draft
const example = { price: 10000, material: 3000, packaging: 500, other: 500, feePercent: 10, fixedCost: 1000000, baseUnits: 300, promoUnits: 400, discountValue: 10, campaignCost: 100000 }
const format = (value: number | string) => typeof value === 'string' ? BigInt(value).toLocaleString('ko-KR') : value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
const rangeText = (range: SalesRange) => range.kind === 'all' ? '모든 판매량에서 기존 이익 이상' : range.kind === 'none' ? '현재 조건에서는 가능한 판매량 없음' : `${format(range.units)}개 ${range.kind === 'at-least' ? '이상' : '이하'}`
const button = 'min-h-[44px] rounded-[6px] border border-[var(--lu-line)] bg-white px-4 py-2 text-sm font-semibold hover:bg-[var(--lu-canvas)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--lu-accent)]'

export default function PromotionProfitPage() {
  const [draft, setDraft] = useState<Draft>(empty)
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent')
  const complete = fields.every(f => draft[f.key].trim() !== '')
  const input = { ...Object.fromEntries(fields.map(f => [f.key, draft[f.key].trim() === '' ? NaN : Number(draft[f.key])])), discountType } as PromotionInput
  const calculated = calculatePromotion(input)
  const result = complete ? calculated.result : null
  return <div className="min-h-screen bg-[var(--lu-canvas)] text-[var(--lu-ink)]">
    <TopNav /><main className="pt-16"><PageHeader icon={<Calculator size={28} aria-hidden="true" />} title="할인·쿠폰 수익 계산기" subtitle="행사를 열기 전에, 매출과 함께 남는 금액도 확인해 보세요." badge="무료 마케팅 도구" />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6">
        <ToolNavigation />
        <p className="rounded-[10px] border border-blue-100 bg-[var(--lu-accent-soft)] p-4 text-sm leading-relaxed text-[var(--lu-ink)]">판매량은 대표님이 입력하는 예상치예요. 할인이 판매량을 얼마나 늘릴지는 예측하지 않아요. 계산은 브라우저에서 처리하며 입력값을 저장하거나 서버로 보내지 않아요.</p>
        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <section aria-labelledby="promotion-inputs" className="min-w-0 rounded-[10px] border border-[var(--lu-line)] bg-white p-4 shadow-none md:p-6">
            <div className="mb-4 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-[var(--lu-accent-soft)] shadow-none"><Calculator size={16} className="text-[var(--lu-accent)]" strokeWidth={1.8} aria-hidden="true" /></span><h2 id="promotion-inputs" className="text-lg font-semibold">같은 한 달의 조건 비교</h2></div>
            <p className="mb-4 text-sm text-gray-600">비용이 없으면 0을 입력해 주세요. 금액과 판매량은 정수로 입력해요.</p>
            <label htmlFor="discount-type" className="mb-2 block text-sm font-semibold">할인 방식</label><select id="discount-type" className="mb-4 min-h-[44px] w-full rounded-[6px] border border-[var(--lu-line)] bg-white px-3 text-base" value={discountType} onChange={e => { setDiscountType(e.target.value as 'percent' | 'fixed'); setDraft(prev => ({ ...prev, discountValue: '' })) }}><option value="percent">정률 할인</option><option value="fixed">정액 쿠폰</option></select>
            <div className="grid gap-4 sm:grid-cols-2">{fields.map(field => {
              const rate = field.key === 'feePercent' || (field.key === 'discountValue' && discountType === 'percent')
              const error = draft[field.key] !== '' ? calculated.errors[field.key] : undefined
              const unit = field.key === 'discountValue' ? discountType === 'percent' ? '%' : '원' : field.unit
              return <div key={field.key} className="min-w-0"><label htmlFor={`promotion-${field.key}`} className="mb-2 block text-sm font-semibold">{field.label} · {unit}</label><input id={`promotion-${field.key}`} type="number" inputMode="decimal" min={0} max={rate ? 100 : field.key.endsWith('Units') ? 1000000 : 1000000000} step={rate ? '0.0001' : '1'} required value={draft[field.key]} aria-invalid={!!error} aria-describedby={error ? `promotion-${field.key}-error` : undefined} onChange={e => setDraft(prev => ({ ...prev, [field.key]: e.target.value }))} className={`min-h-[44px] w-full rounded-[6px] border px-3 text-base tabular-nums focus:outline-[var(--lu-accent)] ${error ? 'border-red-500' : 'border-[var(--lu-line)]'}`} />{error && <p id={`promotion-${field.key}-error`} className="mt-1 text-sm text-red-600">{error}</p>}</div>
            })}</div>
            <div className="mt-5 flex flex-wrap gap-2"><button type="button" className={button} onClick={() => { setDiscountType('percent'); setDraft(Object.fromEntries(fields.map(f => [f.key, String(example[f.key])])) as Draft) }}>예시 값 넣기</button><button type="button" className={button} onClick={() => setDraft(empty())}>입력 비우기</button></div>
          </section>
          <section aria-labelledby="promotion-results" className="min-w-0 space-y-4" aria-live="polite"><div className="rounded-[10px] border border-[var(--lu-line)] bg-white p-4 shadow-none md:p-6"><h2 id="promotion-results" className="mb-4 text-lg font-semibold">행사 전후 예상 결과</h2>
            {!result ? <p className="rounded-[6px] bg-[var(--lu-canvas)] p-4 text-sm leading-relaxed text-gray-600">{complete ? '입력 오류를 수정하면 새 조건으로 계산해요.' : '숫자 10개를 모두 입력하면 계산해요. 입력을 비우거나 오류가 생기면 이전 결과는 표시하지 않아요.'}</p> : <>
              <p className="mb-4 text-sm font-semibold">행사 판매가 {format(input.price)}원 <ArrowRight className="inline" size={14} aria-hidden="true" /> {format(result.promoPrice)}원</p>
              <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">같은 한 달의 평소와 행사 예상값 비교</caption><thead><tr><th className="py-2">항목</th><th className="py-2">평소</th><th className="py-2">행사</th></tr></thead><tbody>{[
                ['매출', `${format(result.baselineRevenue)}원`, `${format(result.promoRevenue)}원`], ['개당 공헌이익', `${format(result.baseContribution)}원`, `${format(result.promoContribution)}원`],
                ['월 예상 이익', `${format(result.baselineProfit)}원`, `${format(result.promoProfit)}원`], ['매출 대비 이익률', result.baselineMargin === null ? '계산 불가' : `${format(result.baselineMargin)}%`, result.promoMargin === null ? '계산 불가' : `${format(result.promoMargin)}%`],
              ].map(([label, base, promo]) => <tr key={label} className="border-t border-[var(--lu-line)]"><th scope="row" className="py-3 pr-2 font-medium">{label}</th><td className="break-all py-3 pr-2 tabular-nums">{base}</td><td className="break-all py-3 tabular-nums">{promo}</td></tr>)}</tbody></table></div>
              <p className={`mt-4 rounded-[6px] p-4 font-semibold ${result.difference < 0 ? 'bg-amber-50 text-amber-900' : 'bg-[var(--lu-accent-soft)] text-[var(--lu-ink)]'}`}>평소보다 월 이익 {format(Math.abs(result.difference))}원 {result.difference > 0 ? '증가 예상' : result.difference < 0 ? '감소 예상' : '차이 없음'}</p>
              {result.promoRevenue > result.baselineRevenue && result.difference < 0 && <p className="mt-3 text-sm text-amber-900">매출은 늘어도 이익은 줄어드는 조건이에요.</p>}
              {result.promoContribution <= 0 && <p className="mt-3 text-sm text-amber-900">행사에서 한 개를 팔 때 남는 금액이 0원 이하예요. 판매를 늘려도 홍보비를 회수하기 어려워요.</p>}
              <dl className="mt-4 space-y-3 text-sm"><div><dt className="text-gray-600">기존 이익 이상을 유지하는 행사 판매량 범위</dt><dd className="mt-1 break-words font-semibold">{rangeText(result.sameProfitRange)}</dd></div><div><dt className="text-gray-600">평소 판매량 대비 필요 추가 판매량</dt><dd className="mt-1 break-words font-semibold">{result.additionalUnits === null ? '공헌이익이 양수인 일반 비교 조건에서만 제공해요.' : `${format(result.additionalUnits)}개`}</dd></div><div><dt className="text-gray-600">홍보비만 회수할 추가 판매량</dt><dd className="mt-1 break-words font-semibold">{result.campaignRecoveryUnits === null ? '현재 개당 공헌이익으로 회수 불가' : `${format(result.campaignRecoveryUnits)}개`}</dd></div></dl>
              <p className="mt-4 text-xs leading-relaxed text-gray-500">필요 판매량은 입력 가능한 예상 판매량 상한을 넘을 수도 있어요. 홍보비 회수 판매량은 홍보비만을 대상으로 하며 할인으로 줄어든 기존 판매분의 이익은 포함하지 않아요.</p>
            </>}
          </div></section>
        </div>
        {result && <ToolNextSteps current="promotion-profit" />}
        <details className="rounded-[10px] border border-[var(--lu-line)] bg-white p-4 text-sm leading-relaxed shadow-none md:p-6"><summary className="min-h-[44px] cursor-pointer font-semibold">계산 기준과 제외 항목</summary><div className="space-y-2 text-gray-600"><p>평소와 행사는 같은 한 달을 비교해요. 행사 월 전체 판매량에 같은 할인 조건이 적용되고 매장이 할인 금액을 전액 부담한다고 가정해요.</p><p>정률 할인 후 판매가는 원 미만을 반올림해요. 수수료는 할인 후 판매가를 기준으로 계산해요. 수수료율과 할인율은 소수점 네 자리까지 입력해요.</p><p>공헌이익은 판매가에서 재료비·포장비·기타 변동비·수수료를 뺀 금액이에요. 월 예상 이익은 공헌이익에 판매량을 곱하고 월 고정비와 행사 홍보비를 뺀 값이에요.</p><p>기존 이익 유지 범위는 행사 공헌이익에 판매량을 곱한 값이 평소 공헌이익과 판매량의 곱에 홍보비를 더한 금액 이상인 정수 판매량이에요. 손실 조건에서는 판매량 상한이 나올 수 있어요.</p><p>부가세 포함 여부를 모든 금액에 동일하게 적용해 주세요. 환불·세금·플랫폼 할인 지원금·재고 변화·다른 상품의 판매 비중은 반영하지 않아요. 예상 이익은 실제 실적을 보장하지 않아요.</p></div></details>
      </div></main><Footer /></div>
}
