export type ScoreOrigin = 'provider-unknown' | 'provider-estimate' | 'rank-derived'
export type RankScoreObservation = {
  placeId: string | null; label: string; provider: string; metric: string; origin: ScoreOrigin
  scoreDirection: 'higher-is-better' | 'lower-is-better'
  keyword: string; date: string; rankStatus: 'measured' | 'unranked' | 'missing'; rank: number | null; score: string | number | null
  conditions?: { batchId?: string | null; surface?: string | null; device?: string | null; locationKey?: string | null; sort?: string | null; adExcluded?: boolean | null; maxDepth?: number | null }
}
export type RankScoreComparison = {
  comparability: 'not-comparable' | 'conditions-incomplete' | 'same-recorded-conditions'
  ordering: 'agrees' | 'disagrees' | 'score-tie' | 'rank-tie' | 'both-tie' | 'unavailable'
  scoreGap: number | null; rankAdvantage: number | null; reasons: string[]
  causalCriterionVerified: false; predictorStatus: 'excluded-rank-derived' | 'unverified-candidate'
}
const validIdentity = (value: unknown) => typeof value === 'string' && /^\d{1,30}$/.test(value)
const nonempty = (value: unknown) => typeof value === 'string' && !!value.trim() && value.length <= 1000
const conditionKeys = ['batchId', 'surface', 'device', 'locationKey', 'sort', 'adExcluded', 'maxDepth'] as const
function validDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0,10) === value }
function scoreNumber(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (typeof value === 'string' && (value.length > 100 || !/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value))) return null
  const n = Number(value); return Number.isFinite(n) ? n : null
}
/** Ordering agreement describes observations only. It never establishes an upstream ranking formula. */
export function compareRankScorePair(a: RankScoreObservation, b: RankScoreObservation): RankScoreComparison {
  const result: RankScoreComparison = { comparability: 'not-comparable', ordering: 'unavailable', scoreGap: null, rankAdvantage: null, reasons: [], causalCriterionVerified: false, predictorStatus: a?.origin === 'rank-derived' || b?.origin === 'rank-derived' ? 'excluded-rank-derived' : 'unverified-candidate' }
  const reject = (reason: string) => ({ ...result, reasons: [reason] })
  if (!a || !b) return reject('두 업체의 관측값이 필요해요.')
  if (!nonempty(a.provider) || !nonempty(a.metric) || a.provider !== b.provider || a.metric !== b.metric || a.origin !== b.origin) return reject('같은 공급자·같은 지표·같은 점수 정의만 비교해요.')
  if (!['higher-is-better', 'lower-is-better'].includes(a.scoreDirection) || a.scoreDirection !== b.scoreDirection) return reject('비교할 점수의 높낮이 방향을 명시하고 동일하게 맞춰 주세요.')
  if (!['provider-unknown', 'provider-estimate', 'rank-derived'].includes(a.origin)) return reject('점수 출처 구분을 확인해 주세요.')
  if (!nonempty(a.keyword) || a.keyword !== b.keyword || !validDate(a.date) || a.date !== b.date) return reject('같은 키워드·같은 실제 측정일만 비교해요.')
  if (validIdentity(a.placeId) && validIdentity(b.placeId) && a.placeId === b.placeId) return reject('같은 플레이스를 경쟁업체 두 곳으로 계산하지 않아요.')
  if (a.rankStatus !== 'measured' || b.rankStatus !== 'measured') return reject('확인된 실측 순위끼리만 비교해요. 권외 대체 숫자를 실제 순위로 사용하지 않아요.')
  if (![a.rank, b.rank].every(n => typeof n === 'number' && Number.isSafeInteger(n) && n >= 1)) return reject('양쪽 모두 확인된 양수 순위가 필요해요. 결측이나 권외 표시값은 먼저 구분해 주세요.')
  for (const item of [a,b]) { const depth = item.conditions?.maxDepth; if (typeof depth === 'number' && Number.isSafeInteger(depth) && depth >= 1 && item.rank! > depth) return reject('실측 순위가 명시한 탐색 깊이를 넘어요. 데이터 범위를 확인해 주세요.') }
  const sa = scoreNumber(a.score), sb = scoreNumber(b.score)
  if (sa === null || sb === null || !Number.isFinite(sa - sb)) return reject('양쪽 모두 유효한 점수가 필요해요. 점수 0은 빈 값과 달라요.')
  let complete = true
  if (!validIdentity(a.placeId) || !validIdentity(b.placeId)) { complete = false; result.reasons.push('고유 플레이스 식별자가 없어 서로 다른 업체인지 추가 확인이 필요해요.') }
  for (const key of conditionKeys) {
    const av = a.conditions?.[key], bv = b.conditions?.[key]
    const valid = (v: unknown) => key === 'adExcluded' ? typeof v === 'boolean' : key === 'maxDepth' ? typeof v === 'number' && Number.isSafeInteger(v) && v >= 1 : typeof v === 'string' && !!v.trim() && v.length <= 512
    if (!valid(av) || !valid(bv)) { complete = false; result.reasons.push(`${key}: 측정 조건 미확인`) }
    else if (av !== bv) return reject(`${key}: 서로 다른 검색 조건이라 직접 비교하지 않아요.`)
  }
  result.comparability = complete ? 'same-recorded-conditions' : 'conditions-incomplete'
  result.scoreGap = sa - sb; result.rankAdvantage = b.rank! - a.rank!
  result.ordering = result.rankAdvantage === 0 && result.scoreGap === 0 ? 'both-tie' : result.rankAdvantage === 0 ? 'rank-tie' : result.scoreGap === 0 ? 'score-tie' : Math.sign(result.scoreGap) * (a.scoreDirection === 'higher-is-better' ? 1 : -1) === Math.sign(result.rankAdvantage) ? 'agrees' : 'disagrees'
  result.reasons.push(result.predictorStatus === 'excluded-rank-derived' ? '순위에서 환산한 점수는 순위 예측 근거로 사용하지 않아요.' : '순서 일치는 관측 결과이며 정렬 원인이나 네이버 공식 산식의 검증을 뜻하지 않아요.')
  return result
}
