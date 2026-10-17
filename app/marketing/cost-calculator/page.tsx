'use client'

import { useState } from 'react'
import { Calculator, Save, Download, FolderOpen, RotateCcw } from 'lucide-react'
import TopNav from '../../components/TopNav'
import Footer from '../../components/Footer'
import { ToolNavigation, ToolNextSteps } from '../../components/marketing/ToolWorkflow'
import PageHeader from '../../components/PageHeader'
import { calculateCost, type CostInput } from '../../lib/business-cost'

type Field = { key: keyof CostInput; label: string; unit: string; hint: string; integer?: boolean }
const fields: Field[] = [
  { key: 'salePrice', label: '판매가', unit: '원', hint: '상품 1개를 판매하는 가격', integer: true },
  { key: 'materialCost', label: '재료비', unit: '원', hint: '상품 1개에 들어가는 재료 비용', integer: true },
  { key: 'packagingCost', label: '포장비', unit: '원', hint: '상품 1개에 들어가는 포장 비용', integer: true },
  { key: 'otherVariableCost', label: '기타 변동비', unit: '원', hint: '판매할 때마다 발생하는 추가 비용', integer: true },
  { key: 'feePercent', label: '판매 수수료율', unit: '%', hint: '판매가에 적용할 수수료율. 없으면 0' },
  { key: 'fixedCost', label: '월 고정비', unit: '원', hint: '월 임대료·인건비 등 고정 비용 합계', integer: true },
  { key: 'monthlyUnits', label: '월 예상 판매량', unit: '개', hint: '한 달 동안 판매할 상품 수', integer: true },
  { key: 'targetProfit', label: '월 목표 이익', unit: '원', hint: '고정비를 제외하고 남기려는 금액', integer: true },
  { key: 'workingDays', label: '월 영업일', unit: '일', hint: '1일부터 31일까지 입력', integer: true },
]
type Draft = Record<keyof CostInput, string>
const blank = () => Object.fromEntries(fields.map(f => [f.key, ''])) as Draft
const example: CostInput = { salePrice: 10000, materialCost: 3000, packagingCost: 500, otherVariableCost: 0, feePercent: 3, fixedCost: 2000000, monthlyUnits: 500, targetProfit: 1000000, workingDays: 26 }
const STORAGE_KEY = 'localution.cost-calculator.v1'
const number = (value: number) => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(value)
const csvCell = (value: string | number) => '"' + String(value).replace(/^(\s*[=+\-@]|[\t\r\n])/, "'$&").replace(/"/g, '""') + '"'
const button = 'min-h-[44px] rounded-[6px] border border-[var(--lu-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--lu-ink)] hover:bg-[var(--lu-canvas)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--lu-accent)] disabled:cursor-not-allowed disabled:opacity-40'

export default function CostCalculatorPage() {
  const [draft, setDraft] = useState<Draft>(blank)
  const [menuName, setMenuName] = useState('')
  const [status, setStatus] = useState('')
  const complete = fields.every(f => draft[f.key].trim() !== '')
  const input = Object.fromEntries(fields.map(f => [f.key, draft[f.key].trim() === '' ? NaN : Number(draft[f.key])])) as CostInput
  const result = calculateCost(input)
  const ready = complete && result.valid
  const invalidKeys = fields.filter(f => draft[f.key] !== '' && (result.errors[f.key] || (f.integer && !Number.isInteger(input[f.key]))))
  const usable = ready && invalidKeys.length === 0

  function save() {
    if (!usable) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, name: menuName, input }))
      setStatus('이 브라우저에 계산 조건을 저장했어요. 같은 기기의 같은 브라우저에서 불러올 수 있어요.')
    } catch { setStatus('브라우저 저장 공간을 사용할 수 없어요. CSV로 내려받거나 브라우저 설정을 확인해 주세요.') }
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) { setStatus('이 브라우저에 저장된 계산 조건이 없어요.'); return }
      const saved: unknown = JSON.parse(raw)
      if (!saved || typeof saved !== 'object') throw new Error('invalid')
      const data = saved as { version?: unknown; name?: unknown; input?: unknown }
      if (data.version !== 1 || typeof data.name !== 'string' || data.name.length > 80 || !data.input || typeof data.input !== 'object') throw new Error('invalid')
      const candidate = data.input as CostInput
      if (!fields.every(f => typeof candidate[f.key] === 'number' && Number.isFinite(candidate[f.key]) && (!f.integer || Number.isInteger(candidate[f.key]))) || !calculateCost(candidate).valid) throw new Error('invalid')
      setDraft(Object.fromEntries(fields.map(f => [f.key, String(candidate[f.key])])) as Draft)
      setMenuName(data.name)
      setStatus('저장한 계산 조건을 불러왔어요. 현재 입력값은 저장한 값으로 바뀌었어요.')
    } catch { setStatus('저장된 계산 조건을 읽을 수 없어요. 저장 공간이 차단됐거나 데이터가 손상됐을 수 있어요. 현재 입력값은 유지했어요.') }
  }
  function download() {
    if (!usable) return
    const rows: (string | number)[][] = [['항목', '값', '단위'], ['상품명', menuName, ''], ...fields.map(f => [f.label, input[f.key], f.unit]), ['개당 변동비', result.variableCost, '원'], ['개당 공헌이익', result.contribution, '원'], ['공헌이익률', result.marginPercent ?? '계산 불가', '%'], ['월 예상 매출', result.monthlyRevenue, '원'], ['월 예상 이익', result.monthlyProfit, '원'], ['손익분기 판매량', result.breakEvenUnits ?? '달성 불가', '개'], ['목표 판매량', result.targetUnits ?? '달성 불가', '개'], ['하루 목표 판매량', result.dailyTargetUnits ?? '달성 불가', '개'], ['계산 기준', '모든 금액에 같은 부가세 기준 적용. 판매량과 비용이 유지된다는 가정', '']]
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' }))
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = '로컬루션_원가계산.csv'; anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setStatus('계산 결과 CSV 다운로드를 요청했어요.')
  }
  return <div className="min-h-screen bg-[var(--lu-canvas)] text-[var(--lu-ink)]">
    <TopNav />
    <main className="pt-16">
      <PageHeader icon={<Calculator size={28} aria-hidden="true" />} title="원가·손익분기 계산기" subtitle="판매가와 비용을 넣고, 한 달에 몇 개를 팔아야 하는지 확인해 보세요." badge="무료 계산 도구" />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6">
        <ToolNavigation />
        <div className="rounded-[10px] border border-blue-100 bg-[var(--lu-accent-soft)] p-4 text-sm leading-relaxed text-[var(--lu-ink)]">계산은 이 브라우저에서 처리해요. 입력한 계산 조건은 서버로 전송하지 않으며, 저장 버튼을 눌렀을 때만 이 브라우저에 보관해요.</div>
        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
          <section aria-labelledby="inputs-title" className="min-w-0 rounded-[10px] border border-[var(--lu-line)] bg-white p-4 shadow-none md:p-6">
            <div className="mb-5 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-[var(--lu-accent-soft)] shadow-none"><Calculator size={16} className="text-[var(--lu-accent)]" strokeWidth={1.8} aria-hidden="true" /></div><h2 id="inputs-title" className="text-lg font-bold">계산 조건</h2></div>
            <label htmlFor="menu-name" className="mb-2 block text-sm font-semibold">상품명 <span className="font-normal text-gray-500">선택</span></label>
            <input id="menu-name" value={menuName} onChange={e => setMenuName(e.target.value)} maxLength={80} className="mb-5 min-h-[44px] w-full rounded-[6px] border border-[var(--lu-line)] px-3 text-base" placeholder="예: 점심 도시락" />
            <p className="mb-4 text-sm text-gray-600">숫자 항목은 모두 입력해 주세요. 비용이 없으면 0을 입력하면 돼요.</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {fields.map(field => {
                const error = draft[field.key] !== '' ? result.errors[field.key] || (field.integer && !Number.isInteger(input[field.key]) ? '정수로 입력해 주세요.' : '') : ''
                return <div key={field.key} className="min-w-0"><label htmlFor={field.key} className="mb-2 block text-sm font-semibold">{field.label} <span className="text-gray-500">{field.unit}</span></label><input id={field.key} type="number" inputMode="decimal" step={field.integer ? '1' : '0.0001'} min={field.key === 'workingDays' ? 1 : 0} max={field.key === 'workingDays' ? 31 : field.key === 'feePercent' ? 100 : field.key === 'monthlyUnits' ? 1000000 : 1000000000} required value={draft[field.key]} aria-invalid={!!error} aria-describedby={`${field.key}-hint${error ? ` ${field.key}-error` : ''}`} onChange={e => { setDraft(previous => ({ ...previous, [field.key]: e.target.value })); setStatus('') }} className={`min-h-[44px] w-full rounded-[6px] border px-3 text-base tabular-nums focus:outline-[var(--lu-accent)] ${error ? 'border-red-500' : 'border-[var(--lu-line)]'}`} /><p id={`${field.key}-hint`} className="mt-1 text-xs leading-relaxed text-gray-500">{field.hint}</p>{error && <p id={`${field.key}-error`} className="mt-1 text-sm text-red-600">{error}</p>}</div>
              })}
            </div>
            <div className="mt-6 flex flex-wrap gap-2"><button type="button" className={button} onClick={() => { setDraft(Object.fromEntries(fields.map(f => [f.key, String(example[f.key])])) as Draft); setMenuName('예시 상품'); setStatus('계산 방법을 확인할 수 있는 예시 값을 넣었어요. 실제 매장 조건으로 바꿔 주세요.') }}>예시 값 넣기</button><button type="button" className={button} onClick={() => { setDraft(blank()); setMenuName(''); setStatus('입력값을 비웠어요. 브라우저에 저장한 값은 그대로예요.') }}><RotateCcw size={15} className="mr-1 inline" aria-hidden="true" />입력 비우기</button></div>
          </section>
          <section aria-labelledby="result-title" className="min-w-0 space-y-4">
            <div className="rounded-[10px] border border-[var(--lu-line)] bg-white p-4 shadow-none md:p-6"><h2 id="result-title" className="mb-4 text-lg font-bold">계산 결과</h2>
              {!usable ? <div className="rounded-[6px] bg-[var(--lu-canvas)] p-6 text-sm leading-relaxed text-gray-600">{invalidKeys.length ? '입력 오류를 수정하면 결과를 보여드려요.' : '판매가부터 영업일까지 숫자 9개를 모두 입력하면 결과가 바로 나와요. 예시 값으로 먼저 살펴볼 수도 있어요.'}</div> : <>
                <p className="mb-4 text-sm text-gray-500 [overflow-wrap:anywhere]">{menuName.trim() || '입력한 상품'} 기준 예상값</p>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">{[['개당 공헌이익', `${number(result.contribution)}원`], ['공헌이익률', result.marginPercent === null ? '계산 불가' : `${number(result.marginPercent)}%`], ['월 예상 매출', `${number(result.monthlyRevenue)}원`], ['월 예상 이익', `${number(result.monthlyProfit)}원`], ['손익분기 판매량', result.breakEvenUnits === null ? '현재 조건으로 달성 불가' : `${number(result.breakEvenUnits)}개`], ['월 목표 판매량', result.targetUnits === null ? '현재 조건으로 달성 불가' : `${number(result.targetUnits)}개`], ['하루 목표 판매량', result.dailyTargetUnits === null ? '현재 조건으로 달성 불가' : `${number(result.dailyTargetUnits)}개`]].map(([label, value]) => <div key={label} className="min-w-0 rounded-[6px] bg-[var(--lu-canvas)] p-4"><dt className="text-xs text-gray-600">{label}</dt><dd className="mt-2 break-words text-lg font-bold tabular-nums">{value}</dd></div>)}</dl>
                {result.contribution <= 0 && <p className="mt-4 rounded-[6px] bg-amber-50 p-3 text-sm text-amber-900">한 개를 팔 때 남는 금액이 0원 이하예요. 판매량을 늘려도 이익이 늘지 않거나 손실이 커질 수 있어요. 판매가와 개당 비용을 확인해보세요.</p>}
                <p className="mt-4 text-xs leading-relaxed text-gray-500">공헌이익은 판매가에서 판매 수수료와 개당 변동비를 뺀 금액이에요. 순이익과는 달라요.</p>
              </>}
            </div>
            {usable && <div className="rounded-[10px] border border-[var(--lu-line)] bg-white p-4 shadow-none md:p-6"><h2 className="text-base font-bold">판매가를 바꾸면</h2><p className="mb-4 mt-2 text-xs leading-relaxed text-gray-500">월 판매량 {number(input.monthlyUnits)}개와 비용·수수료율이 유지된다고 가정해요. 가격 변화에 따른 실제 수요 변화는 반영하지 않아요.</p><div className="space-y-3">{result.scenarios.map((scenario, i) => <div key={i} className="rounded-[6px] bg-[var(--lu-canvas)] p-4"><p className="text-sm font-semibold">{['판매가 10% 인하', '현재 판매가', '판매가 10% 인상'][i]} · {number(scenario.price)}원</p><p className="mt-2 text-sm tabular-nums">월 예상 이익 {number(scenario.monthlyProfit)}원</p><p className="mt-1 text-xs text-gray-600">손익분기 {scenario.breakEvenUnits === null ? '달성 불가' : `${number(scenario.breakEvenUnits)}개`}</p></div>)}</div></div>}
            <div className="flex flex-wrap gap-2"><button type="button" onClick={save} disabled={!usable} className={button}><Save size={16} className="mr-1 inline" aria-hidden="true" />이 브라우저에 저장</button><button type="button" onClick={load} className={button}><FolderOpen size={16} className="mr-1 inline" aria-hidden="true" />저장값 불러오기</button><button type="button" onClick={download} disabled={!usable} className={button}><Download size={16} className="mr-1 inline" aria-hidden="true" />CSV 내려받기</button></div>
            <p role="status" aria-live="polite" className="min-h-[24px] text-sm leading-relaxed text-[var(--lu-accent)]">{status}</p>
            <p className="text-xs leading-relaxed text-gray-500">공용 기기에서는 저장을 피해주세요. 브라우저 데이터를 삭제하면 저장값도 사라져요.</p>
          </section>
        </div>
        {usable && <ToolNextSteps current="cost-calculator" />}
        <details className="rounded-[10px] border border-[var(--lu-line)] bg-white p-4 text-sm leading-relaxed shadow-none md:p-6"><summary className="min-h-[44px] cursor-pointer font-semibold">계산식과 가정 보기</summary><div className="space-y-2 pt-3 text-gray-600"><p>개당 변동비 = 재료비 + 포장비 + 기타 변동비 + 판매가에 따른 수수료</p><p>개당 공헌이익 = 판매가에서 개당 변동비를 뺀 금액</p><p>월 예상 이익 = 개당 공헌이익에 월 판매량을 곱한 금액에서 월 고정비를 뺀 금액</p><p>손익분기 판매량 = 월 고정비를 개당 공헌이익으로 나눈 뒤 올림</p><p>월 목표 판매량 = 월 고정비와 목표 이익의 합을 개당 공헌이익으로 나눈 뒤 올림</p><p>하루 목표 판매량 = 월 목표 판매량을 영업일로 나눈 뒤 올림</p><p>판매가와 모든 비용은 부가세 포함 여부를 같은 기준으로 입력해 주세요. 수수료는 판매가에 비례하는 단순 계산이며, 세금·대출이자·상품별 판매 비중 등 별도로 입력하지 않은 항목은 반영하지 않아요.</p></div></details>
      </div>
    </main>
    <Footer />
  </div>
}
