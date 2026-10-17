export type CostInput = {
  salePrice: number
  materialCost: number
  packagingCost: number
  otherVariableCost: number
  feePercent: number
  fixedCost: number
  monthlyUnits: number
  targetProfit: number
  workingDays: number
}

export const EMPTY_COST_INPUT: CostInput = {
  salePrice: 0, materialCost: 0, packagingCost: 0, otherVariableCost: 0,
  feePercent: 0, fixedCost: 0, monthlyUnits: 0, targetProfit: 0, workingDays: 26,
}
export type CostErrors = Partial<Record<keyof CostInput, string>>
export type CostResult = {
  errors: CostErrors; valid: boolean; contribution: number; variableCost: number;
  marginPercent: number | null; monthlyRevenue: number; monthlyProfit: number;
  breakEvenUnits: number | null; targetUnits: number | null; dailyTargetUnits: number | null;
  scenarios: { label: string; price: number; contribution: number; monthlyProfit: number; breakEvenUnits: number | null }[];
}

const round = (value: number) => value === 0 ? 0 : Number.isInteger(value) ? value : Number(value.toFixed(6))
const unitsFor = (amount: number, contribution: number) => {
  if (amount === 0) return 0
  if (contribution <= 0) return null
  const quotient = amount / contribution
  const nearest = Math.round(quotient)
  return Math.ceil(Math.abs(quotient - nearest) <= Number.EPSILON * Math.max(1, quotient) * 4 ? nearest : quotient)
}

export function calculateCost(input: CostInput): CostResult {
  const errors: CostErrors = {}
  for (const key of Object.keys(EMPTY_COST_INPUT) as (keyof CostInput)[]) {
    const value = input?.[key]
    const maximum = key === 'feePercent' ? 100 : key === 'workingDays' ? 31 : key === 'monthlyUnits' ? 1_000_000 : 1_000_000_000
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > maximum) {
      errors[key] = `0 이상 ${maximum.toLocaleString('ko-KR')} 이하의 숫자를 입력해 주세요.`
    } else if (key !== 'feePercent' && key !== 'workingDays' && key !== 'monthlyUnits' && !Number.isInteger(value)) {
      errors[key] = '금액은 원 단위 정수로 입력해 주세요.'
    } else if (key === 'feePercent' && Math.abs(value * 10000 - Math.round(value * 10000)) > 0.000001) {
      errors[key] = '수수료율은 소수점 네 자리까지 입력해 주세요.'
    } else if (key === 'workingDays' && (value < 1 || !Number.isInteger(value))) {
      errors[key] = '영업일은 1일부터 31일까지 정수로 입력해 주세요.'
    } else if (key === 'monthlyUnits' && !Number.isInteger(value)) {
      errors[key] = '판매 수량은 정수로 입력해 주세요.'
    }
  }
  const empty: CostResult = { errors, valid: false, contribution: 0, variableCost: 0,
    marginPercent: null, monthlyRevenue: 0, monthlyProfit: 0, breakEvenUnits: null,
    targetUnits: null, dailyTargetUnits: null, scenarios: [] }
  if (Object.keys(errors).length) return empty
  const rawMaterial = input.materialCost + input.packagingCost + input.otherVariableCost
  const feeRate = input.feePercent / 100
  const variableCost = round(rawMaterial + input.salePrice * feeRate)
  const contribution = round(input.salePrice - variableCost)
  const targetUnits = unitsFor(input.fixedCost + input.targetProfit, contribution)
  return {
    errors, valid: true, contribution, variableCost,
    marginPercent: input.salePrice > 0 ? round(contribution / input.salePrice * 100) : null,
    monthlyRevenue: round(input.salePrice * input.monthlyUnits),
    monthlyProfit: round(contribution * input.monthlyUnits - input.fixedCost),
    breakEvenUnits: unitsFor(input.fixedCost, contribution), targetUnits,
    dailyTargetUnits: targetUnits === null ? null : Math.ceil(targetUnits / input.workingDays),
    scenarios: [0.9, 1, 1.1].map((multiplier, index) => {
      const price = round(input.salePrice * multiplier)
      const perUnit = round(price * (1 - feeRate) - rawMaterial)
      return { label: ['가격 10% 인하', '현재 가격', '가격 10% 인상'][index], price,
        contribution: perUnit, monthlyProfit: round(perUnit * input.monthlyUnits - input.fixedCost),
        breakEvenUnits: unitsFor(input.fixedCost, perUnit) }
    }),
  }
}
