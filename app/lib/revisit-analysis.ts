// app/lib/revisit-analysis.ts
// ============================================================
// 재방문 분석 — 스탬프 적립 이력(stamp_events)만으로 계산
// · 손님 = stamp_collections.id (collection_id)
// · 방문 = 적립 이벤트 1건 (같은 날 여러 건은 하루 1회로 본다 · KST 기준)
// · 매출 연동 없이 재방문율 · 재방문 주기 · 이탈 위험을 낸다 (LU-017)
// ============================================================

export type StampVisitEvent = {
  collection_id: string | null
  created_at: string
}

export type RevisitAtRisk = {
  collectionId: string
  lastVisit: string // YYYY-MM-DD (KST)
  daysSinceLastVisit: number
  avgGapDays: number
  visits: number
}

export type RevisitSummary = {
  month: string // YYYY-MM (KST)
  totalCustomers: number
  totalVisits: number
  visitorsThisMonth: number
  returningThisMonth: number
  newThisMonth: number
  revisitRate: number | null // 0~100 · 이번 달 방문 손님 중 재방문 손님 비율
  revisitRatePrev: number | null
  revisitRateDelta: number | null // %p
  avgGapDays: number | null // 재방문 간격 평균
  medianGapDays: number | null
  regulars: number // 2회 이상 방문 손님
  atRisk: RevisitAtRisk[]
  insufficient: boolean // 표본이 적어 숫자를 믿기 어렵다
}

const DAY_MS = 24 * 60 * 60 * 1000
const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const MIN_VISITS_FOR_TRUST = 20
const MIN_AT_RISK_DAYS = 14
// 고객 자동 태그(app/lib/customer-lifecycle.ts)도 같은 기준을 쓴다
export const DORMANT_DAYS = 90
export const REGULAR_MIN_VISITS = 2

export function toKstDate(iso: string): string {
  return new Date(new Date(iso).getTime() + KST_OFFSET_MS).toISOString().slice(0, 10)
}

function dayIndex(kstDate: string): number {
  return Math.round(Date.parse(kstDate + 'T00:00:00Z') / DAY_MS)
}

function prevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 2, 1))
  return d.toISOString().slice(0, 7)
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function monthRate(visitDaysByCustomer: Map<string, string[]>, month: string) {
  let visitors = 0
  let returning = 0
  let fresh = 0
  for (const days of visitDaysByCustomer.values()) {
    const inMonth = days.filter(d => d.startsWith(month))
    if (inMonth.length === 0) continue
    visitors++
    // 이번 달 방문 중 '첫 방문이 아닌 방문' 이 하나라도 있으면 재방문 손님
    if (days[0].startsWith(month)) {
      fresh++
      if (inMonth.length >= 2) returning++
    } else {
      returning++
    }
  }
  return { visitors, returning, fresh, rate: visitors > 0 ? round1((returning / visitors) * 100) : null }
}

export function analyzeRevisits(events: StampVisitEvent[], now: Date = new Date()): RevisitSummary {
  const visitDaysByCustomer = new Map<string, string[]>()
  for (const e of events) {
    if (!e.collection_id || !e.created_at) continue
    const day = toKstDate(e.created_at)
    const list = visitDaysByCustomer.get(e.collection_id) ?? []
    list.push(day)
    visitDaysByCustomer.set(e.collection_id, list)
  }
  for (const [id, days] of visitDaysByCustomer) {
    visitDaysByCustomer.set(id, [...new Set(days)].sort())
  }

  const today = toKstDate(now.toISOString())
  const todayIdx = dayIndex(today)
  const month = today.slice(0, 7)
  const cur = monthRate(visitDaysByCustomer, month)
  const prev = monthRate(visitDaysByCustomer, prevMonth(month))

  const allGaps: number[] = []
  const atRisk: RevisitAtRisk[] = []
  let regulars = 0
  let totalVisits = 0

  for (const [id, days] of visitDaysByCustomer) {
    totalVisits += days.length
    if (days.length < REGULAR_MIN_VISITS) continue
    regulars++
    const gaps: number[] = []
    for (let i = 1; i < days.length; i++) gaps.push(dayIndex(days[i]) - dayIndex(days[i - 1]))
    allGaps.push(...gaps)
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length
    const last = days[days.length - 1]
    const since = todayIdx - dayIndex(last)
    // 자기 평소 주기의 두 배를 넘겼고 아직 휴면(90일)은 아닌 단골
    if (since > Math.max(avgGap * 2, MIN_AT_RISK_DAYS) && since <= DORMANT_DAYS) {
      atRisk.push({ collectionId: id, lastVisit: last, daysSinceLastVisit: since, avgGapDays: round1(avgGap), visits: days.length })
    }
  }

  atRisk.sort((a, b) => b.visits - a.visits || a.daysSinceLastVisit - b.daysSinceLastVisit)

  const avgGapDays = allGaps.length ? round1(allGaps.reduce((a, b) => a + b, 0) / allGaps.length) : null
  const med = median(allGaps)

  return {
    month,
    totalCustomers: visitDaysByCustomer.size,
    totalVisits,
    visitorsThisMonth: cur.visitors,
    returningThisMonth: cur.returning,
    newThisMonth: cur.fresh,
    revisitRate: cur.rate,
    revisitRatePrev: prev.rate,
    revisitRateDelta: cur.rate !== null && prev.rate !== null ? round1(cur.rate - prev.rate) : null,
    avgGapDays,
    medianGapDays: med === null ? null : round1(med),
    regulars,
    atRisk,
    insufficient: totalVisits < MIN_VISITS_FOR_TRUST,
  }
}
