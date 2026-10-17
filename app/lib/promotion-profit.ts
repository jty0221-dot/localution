export type PromotionInput = {
  price: number; material: number; packaging: number; other: number; feePercent: number;
  fixedCost: number; baseUnits: number; promoUnits: number; discountType: 'percent' | 'fixed';
  discountValue: number; campaignCost: number;
}
export type SalesRange = { kind: 'at-least' | 'at-most'; units: string } | { kind: 'all' } | { kind: 'none' }
export type PromotionResult = {
  promoPrice: number; baseContribution: number; promoContribution: number;
  baselineRevenue: number; promoRevenue: number; baselineProfit: number; promoProfit: number;
  difference: number; baselineMargin: number | null; promoMargin: number | null;
  sameProfitRange: SalesRange; additionalUnits: string | null; campaignRecoveryUnits: string | null;
}
const SCALE = BigInt(1000000)
const zero = BigInt(0)
const asMoney = (value: bigint) => Number(value / SCALE) + Number(value % SCALE) / 1000000
const ceiling = (a: bigint, b: bigint) => (a + b - BigInt(1)) / b

export function calculatePromotion(input: PromotionInput): { errors: Partial<Record<keyof PromotionInput, string>>; result: PromotionResult | null } {
  const errors: Partial<Record<keyof PromotionInput, string>> = {}
  if (!input || typeof input !== 'object') return { errors: { price: '계산 조건을 입력해 주세요.' }, result: null }
  const keys = ['price', 'material', 'packaging', 'other', 'feePercent', 'fixedCost', 'baseUnits', 'promoUnits', 'discountValue', 'campaignCost'] as const
  for (const key of keys) {
    const value = input[key]
    const rate = key === 'feePercent' || (key === 'discountValue' && input.discountType === 'percent')
    const max = rate ? 100 : key === 'baseUnits' || key === 'promoUnits' ? 1000000 : 1000000000
    if (!Number.isFinite(value) || value < 0 || value > max) errors[key] = `0 이상 ${max.toLocaleString('ko-KR')} 이하로 입력해 주세요.`
    else if (rate ? Math.abs(value * 10000 - Math.round(value * 10000)) > 0.000001 : !Number.isInteger(value)) errors[key] = rate ? '소수점 네 자리까지 입력해 주세요.' : '원 또는 개 단위 정수로 입력해 주세요.'
  }
  if (!['percent', 'fixed'].includes(input.discountType)) errors.discountType = '할인 방식을 선택해 주세요.'
  if (input.discountType === 'fixed' && input.discountValue > input.price) errors.discountValue = '할인 금액은 판매가를 넘을 수 없어요.'
  if (Object.keys(errors).length) return { errors, result: null }
  const fee = BigInt(Math.round(input.feePercent * 10000))
  const original = BigInt(input.price)
  // Discounted sale price is rounded to whole KRW, half up, before fees are calculated.
  const price = input.discountType === 'fixed' ? original - BigInt(input.discountValue)
    : (original * (SCALE - BigInt(Math.round(input.discountValue * 10000))) + SCALE / BigInt(2)) / SCALE
  const costs = (BigInt(input.material) + BigInt(input.packaging) + BigInt(input.other)) * SCALE
  const baseContribution = original * (SCALE - fee) - costs
  const promoContribution = price * (SCALE - fee) - costs
  const baseline = baseContribution * BigInt(input.baseUnits) - BigInt(input.fixedCost) * SCALE
  const promo = promoContribution * BigInt(input.promoUnits) - BigInt(input.fixedCost + input.campaignCost) * SCALE
  const threshold = baseContribution * BigInt(input.baseUnits) + BigInt(input.campaignCost) * SCALE
  let range: SalesRange
  if (promoContribution > zero) range = { kind: 'at-least', units: (threshold <= zero ? zero : ceiling(threshold, promoContribution)).toString() }
  else if (promoContribution === zero) range = { kind: threshold <= zero ? 'all' : 'none' }
  else range = threshold > zero ? { kind: 'none' } : { kind: 'at-most', units: ((-threshold) / (-promoContribution)).toString() }
  const additional = baseContribution > zero && range.kind === 'at-least'
    ? (BigInt(range.units) > BigInt(input.baseUnits) ? BigInt(range.units) - BigInt(input.baseUnits) : zero).toString() : null
  return { errors, result: {
    promoPrice: Number(price), baseContribution: asMoney(baseContribution), promoContribution: asMoney(promoContribution),
    baselineRevenue: input.price * input.baseUnits, promoRevenue: Number(price) * input.promoUnits,
    baselineProfit: asMoney(baseline), promoProfit: asMoney(promo), difference: asMoney(promo - baseline),
    baselineMargin: input.price * input.baseUnits > 0 ? asMoney(baseline) / (input.price * input.baseUnits) * 100 : null,
    promoMargin: Number(price) * input.promoUnits > 0 ? asMoney(promo) / (Number(price) * input.promoUnits) * 100 : null,
    sameProfitRange: range, additionalUnits: additional,
    campaignRecoveryUnits: input.campaignCost === 0 ? '0' : promoContribution > zero ? ceiling(BigInt(input.campaignCost) * SCALE, promoContribution).toString() : null,
  } }
}
