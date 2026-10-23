// app/lib/store-status.ts
// ============================================================
// LU-018 W2-3 · '내 가게 지금 상태' 카드 계산 (순수 함수 · 외부 import 없음)
//
// 원칙 (대표 정정 2026-10-18)
// · 0~100 합산 점수 · 등급 · 경쟁 가게 대비 점수를 만들지 않는다.
//   app/lib/place-score.ts 의 가중합(place_score · score)은 여기서 읽지도 쓰지도 않는다.
// · 보여 주는 것은 셋뿐이다
//   1) 확인된 지표 : 값마다 측정일 · 출처. 측정 못 한 것은 '측정 전' · '측정 불가' 그대로
//   2) 지난 측정 대비 변화 : 지표마다 숫자 그대로 · 서로 합치지 않는다
//   3) 오늘 할 일 최대 3개 : 실제 데이터로 판정되는 것만
// · 날짜 경계는 전부 KST(UTC+9)
// ============================================================

const DAY_MS = 24 * 60 * 60 * 1000
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** /marketing/place 점검표 항목 수 (app/marketing/place/page.tsx 의 TOTAL_ITEMS 와 같아야 한다) */
export const PLACE_CHECKLIST_TOTAL = 34
export const MAX_TODOS = 3

// ── 날짜 ────────────────────────────────────────────────────
export function toKstDate(iso: string): string {
  return new Date(new Date(iso).getTime() + KST_OFFSET_MS).toISOString().slice(0, 10)
}
export function toKstMonth(iso: string): string {
  return toKstDate(iso).slice(0, 7)
}
/** KST 날짜(YYYY-MM-DD)의 자정을 UTC ISO 로 */
export function kstMidnightIso(kstDate: string): string {
  return new Date(Date.parse(kstDate + 'T00:00:00Z') - KST_OFFSET_MS).toISOString()
}
/** 오늘 포함 최근 n일(KST 달력 기준)의 시작 시각 */
export function kstWindowStartIso(nowIso: string, days: number): string {
  const today = toKstDate(nowIso)
  const start = new Date(Date.parse(today + 'T00:00:00Z') - (days - 1) * DAY_MS).toISOString().slice(0, 10)
  return kstMidnightIso(start)
}
/** 지난 달 1일 KST 자정 */
export function kstPrevMonthStartIso(nowIso: string): string {
  const [y, m] = toKstMonth(nowIso).split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10)
  return kstMidnightIso(d)
}
function prevMonthOf(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7)
}
function validIso(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && !Number.isNaN(Date.parse(v))
}
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ── 공통 타입 ───────────────────────────────────────────────
/** measured : 값 있음 · not_yet : 측정 기록 자체가 없음 · unavailable : 측정했지만 값을 못 얻음(또는 조회 실패) */
export type MetricState = 'measured' | 'not_yet' | 'unavailable'
export type Change = {
  kind: 'up' | 'down' | 'same'
  previous: number
  current: number
  diff: number
  previousAt: string
}
export type Metric = {
  key: string
  label: string
  unit: string
  state: MetricState
  value: number | null
  measuredAt: string | null
  source: string
  change: Change | null
}

export function changeOf(current: number | null, previous: number | null, previousAt: string | null): Change | null {
  if (current === null || previous === null || !previousAt) return null
  const diff = round2(current - previous)
  return { kind: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same', previous, current, diff, previousAt }
}

/**
 * 시각 내림차순 최신 1건과 '그보다 이전 KST 날짜의 최신 1건' 을 고른다.
 * 같은 날 여러 번 잰 기록은 변화로 보지 않는다 (하루 단위 비교).
 */
export function pickLatestAndPrevious<T>(rows: T[], tsOf: (r: T) => unknown): { latest: T | null; previous: T | null } {
  const valid = rows.filter(r => validIso(tsOf(r))).sort((a, b) => Date.parse(tsOf(b) as string) - Date.parse(tsOf(a) as string))
  if (valid.length === 0) return { latest: null, previous: null }
  const latest = valid[0]
  const latestDay = toKstDate(tsOf(latest) as string)
  const previous = valid.find(r => toKstDate(tsOf(r) as string) < latestDay) ?? null
  return { latest, previous }
}

// ── 1) 플레이스 스냅샷 지표 ─────────────────────────────────
export type PlaceSnapshotRow = {
  ts: string | null
  visitor_review_count: number | string | null
  blog_review_count: number | string | null
  rating: number | string | null
  source?: string | null
}

const SOURCE_LABEL: Record<string, string> = {
  cron: '네이버 플레이스 자동 수집',
  manual: '네이버 플레이스 직접 조회',
  import: '네이버 플레이스 가져오기',
}
export function snapshotSourceLabel(source: string | null | undefined): string {
  return (source && SOURCE_LABEL[source]) || '네이버 플레이스 수집'
}

export function buildPlaceMetrics(rows: PlaceSnapshotRow[] | null): Metric[] {
  const { latest, previous } = pickLatestAndPrevious(rows ?? [], r => r.ts)
  const defs: Array<{ key: keyof PlaceSnapshotRow; label: string; unit: string }> = [
    { key: 'visitor_review_count', label: '방문자 리뷰', unit: '건' },
    { key: 'blog_review_count', label: '블로그 리뷰', unit: '건' },
    { key: 'rating', label: '플레이스 평점', unit: '점' },
  ]
  return defs.map(d => {
    if (!latest) {
      return { key: d.key, label: d.label, unit: d.unit, state: 'not_yet', value: null, measuredAt: null, source: '네이버 플레이스 수집', change: null }
    }
    let value = num(latest[d.key])
    // 평점 0 이나 범위 밖은 '측정 불가' (평점 미노출 매장)
    if (d.key === 'rating' && value !== null && (value <= 0 || value > 5)) value = null
    if (d.key !== 'rating' && value !== null && value < 0) value = null
    let prev = previous ? num(previous[d.key]) : null
    if (d.key === 'rating' && prev !== null && (prev <= 0 || prev > 5)) prev = null
    return {
      key: d.key,
      label: d.label,
      unit: d.unit,
      state: value === null ? 'unavailable' : 'measured',
      value,
      measuredAt: latest.ts,
      source: snapshotSourceLabel(latest.source),
      change: changeOf(value, prev, previous ? previous.ts : null),
    }
  })
}

// ── 2) 리뷰 관리 (platform_reviews) ─────────────────────────
export type ReviewRow = {
  rating: number | string | null
  has_reply: boolean | null
  reply_status: string | null
  posted_at: string | null
  collected_at: string | null
}
export type ReviewSummary = {
  state: MetricState
  total: number
  /** stores/me 와 같은 기준 : has_reply 이거나 reply_status='submitted' 면 답글 완료 */
  unreplied: number
  newLast7Days: number
  /** 별점 1~5 인 리뷰만 평균. 없으면 null */
  avgRating: number | null
  ratedCount: number
  measuredAt: string | null
}

export function isReplied(r: Pick<ReviewRow, 'has_reply' | 'reply_status'>): boolean {
  return r.has_reply === true || r.reply_status === 'submitted'
}

export function buildReviewSummary(rows: ReviewRow[] | null, nowIso: string): ReviewSummary {
  const list = rows ?? []
  if (list.length === 0) {
    return { state: 'not_yet', total: 0, unreplied: 0, newLast7Days: 0, avgRating: null, ratedCount: 0, measuredAt: null }
  }
  const since = Date.parse(kstWindowStartIso(nowIso, 7))
  const nowMs = Date.parse(nowIso)
  let unreplied = 0
  let fresh = 0
  let sum = 0
  let rated = 0
  let measuredAt: string | null = null
  for (const r of list) {
    if (!isReplied(r)) unreplied++
    if (validIso(r.posted_at)) {
      const t = Date.parse(r.posted_at)
      if (t >= since && t <= nowMs) fresh++
    }
    const rating = num(r.rating)
    if (rating !== null && rating >= 1 && rating <= 5) { sum += rating; rated++ }
    if (validIso(r.collected_at) && (!measuredAt || Date.parse(r.collected_at) > Date.parse(measuredAt))) measuredAt = r.collected_at
  }
  return {
    state: 'measured',
    total: list.length,
    unreplied,
    newLast7Days: fresh,
    avgRating: rated > 0 ? Math.round((sum / rated) * 10) / 10 : null,
    ratedCount: rated,
    measuredAt,
  }
}

// ── 3) 키워드 순위 (place_keyword_ranks) ────────────────────
export type KeywordRankRow = {
  keyword_target_id: string
  keyword: string
  /** null = 상위 total 위 안에 없음(권외) */
  rank: number | string | null
  total: number | string | null
  /** 'none' = 측정 실패 */
  method: string | null
  ts: string | null
}
export type RankState = 'ranked' | 'out_of_range' | 'unavailable'
export type KeywordStatus = {
  keywordTargetId: string
  keyword: string
  state: RankState | 'not_yet'
  rank: number | null
  total: number | null
  measuredAt: string | null
  previous: { state: RankState; rank: number | null; measuredAt: string } | null
  /** 숫자 그대로의 변화 문장. 비교할 수 없으면 null */
  changeText: string | null
  change: 'up' | 'down' | 'same' | null
}

function rankStateOf(r: KeywordRankRow): { state: RankState; rank: number | null } {
  if (r.method === 'none') return { state: 'unavailable', rank: null }
  const rank = num(r.rank)
  if (rank === null) return { state: 'out_of_range', rank: null }
  if (rank < 1) return { state: 'unavailable', rank: null }
  return { state: 'ranked', rank }
}

export function rankChange(
  cur: { state: RankState | 'not_yet'; rank: number | null },
  prev: { state: RankState; rank: number | null } | null,
): { text: string | null; kind: 'up' | 'down' | 'same' | null } {
  if (!prev || cur.state === 'not_yet' || cur.state === 'unavailable' || prev.state === 'unavailable') return { text: null, kind: null }
  if (cur.state === 'ranked' && prev.state === 'ranked') {
    const diff = (prev.rank as number) - (cur.rank as number)
    if (diff === 0) return { text: '변화 없음', kind: 'same' }
    return diff > 0
      ? { text: `${prev.rank}위 → ${cur.rank}위 (${diff}계단 올라감)`, kind: 'up' }
      : { text: `${prev.rank}위 → ${cur.rank}위 (${-diff}계단 내려감)`, kind: 'down' }
  }
  if (cur.state === 'out_of_range' && prev.state === 'out_of_range') return { text: '변화 없음 (권외)', kind: 'same' }
  if (cur.state === 'ranked') return { text: `권외 → ${cur.rank}위`, kind: 'up' }
  return { text: `${prev.rank}위 → 권외`, kind: 'down' }
}

export function buildKeywordStatuses(
  targets: Array<{ id: string; keyword: string }> | null,
  rows: KeywordRankRow[] | null,
): KeywordStatus[] {
  const byTarget = new Map<string, KeywordRankRow[]>()
  for (const r of rows ?? []) {
    if (!r || !r.keyword_target_id) continue
    const list = byTarget.get(r.keyword_target_id) ?? []
    list.push(r)
    byTarget.set(r.keyword_target_id, list)
  }
  return (targets ?? []).map(t => {
    const { latest, previous } = pickLatestAndPrevious(byTarget.get(t.id) ?? [], r => r.ts)
    if (!latest) {
      return { keywordTargetId: t.id, keyword: t.keyword, state: 'not_yet', rank: null, total: null, measuredAt: null, previous: null, changeText: null, change: null }
    }
    const cur = rankStateOf(latest)
    const prev = previous ? { ...rankStateOf(previous), measuredAt: previous.ts as string } : null
    const ch = rankChange(cur, prev)
    return {
      keywordTargetId: t.id,
      keyword: t.keyword,
      state: cur.state,
      rank: cur.rank,
      total: num(latest.total),
      measuredAt: latest.ts,
      previous: prev,
      changeText: ch.text,
      change: ch.kind,
    }
  })
}

// ── 4) 스탬프 QR 적립 (stamp_events) ────────────────────────
export type StampEventRow = { collection_id: string | null; created_at: string | null }
export type StampSummary = {
  state: 'no_card' | 'measured' | 'unavailable'
  month: string
  /** 이번 달(KST) QR 적립 이벤트 수 */
  thisMonth: number
  lastMonth: number
  /** 이번 달 적립한 손님 수(중복 제외) */
  customersThisMonth: number
  change: Change | null
  lastEventAt: string | null
}

export function buildStampSummary(input: { hasCard: boolean; available: boolean; events: StampEventRow[] | null; nowIso: string }): StampSummary {
  const month = toKstMonth(input.nowIso)
  const base: StampSummary = { state: 'no_card', month, thisMonth: 0, lastMonth: 0, customersThisMonth: 0, change: null, lastEventAt: null }
  if (!input.hasCard) return base
  if (!input.available) return { ...base, state: 'unavailable' }
  const prev = prevMonthOf(month)
  let thisMonth = 0
  let lastMonth = 0
  let lastEventAt: string | null = null
  const customers = new Set<string>()
  for (const e of input.events ?? []) {
    if (!validIso(e.created_at)) continue
    const m = toKstMonth(e.created_at)
    if (m === month) {
      thisMonth++
      if (e.collection_id) customers.add(e.collection_id)
    } else if (m === prev) {
      lastMonth++
    }
    if (!lastEventAt || Date.parse(e.created_at) > Date.parse(lastEventAt)) lastEventAt = e.created_at
  }
  return {
    state: 'measured',
    month,
    thisMonth,
    lastMonth,
    customersThisMonth: customers.size,
    // 지난 달은 다 찬 달이고 이번 달은 진행 중이라 같은 날짜까지 비교가 아니다 → 변화는 화면에서 '지난 달 전체' 로 밝힌다
    change: changeOf(thisMonth, lastMonth, kstPrevMonthStartIso(input.nowIso)),
    lastEventAt,
  }
}

// ── 5) 오늘 할 일 (최대 3개) ────────────────────────────────
export type Todo = { id: string; title: string; detail: string; href: string; action: string }
export type TodoInput = {
  /** 리뷰 조회 실패면 null → 할 일로 판정하지 않는다 */
  unreplied: number | null
  /** 플레이스 추적 등록 여부. 조회 실패면 null */
  hasPlaceTarget: boolean | null
  /** 점검표 체크 수 (이 기기 기준). 플레이스가 없거나 읽지 못하면 null */
  checklistChecked: number | null
  /** 스탬프 카드 보유 여부. 조회 실패면 null */
  hasStampCard: boolean | null
}

export function buildTodos(input: TodoInput, max = MAX_TODOS): Todo[] {
  const todos: Todo[] = []
  if (typeof input.unreplied === 'number' && input.unreplied > 0) {
    todos.push({
      id: 'unreplied',
      title: `답글 안 단 리뷰 ${input.unreplied}건`,
      detail: '수집된 리뷰 중 답글 기록이 없는 리뷰예요.',
      href: '/review-admin',
      action: '답글 달기',
    })
  }
  if (input.hasPlaceTarget === false) {
    todos.push({
      id: 'place-target',
      title: '네이버 플레이스 추적 등록',
      detail: '등록하면 리뷰 수 · 평점을 매일 재서 변화를 보여 드려요.',
      href: '/marketing/place',
      action: '등록하기',
    })
  } else if (input.hasPlaceTarget === true && typeof input.checklistChecked === 'number') {
    const done = Math.max(0, Math.min(PLACE_CHECKLIST_TOTAL, Math.floor(input.checklistChecked)))
    const left = PLACE_CHECKLIST_TOTAL - done
    if (left > 0) {
      todos.push({
        id: 'place-checklist',
        title: `플레이스 점검 ${left}개 남음`,
        detail: `점검표 ${PLACE_CHECKLIST_TOTAL}개 중 ${done}개 완료 · 이 기기에 저장된 체크 기준이에요.`,
        href: '/marketing/place',
        action: '점검하기',
      })
    }
  }
  if (input.hasStampCard === false) {
    todos.push({
      id: 'stamp-card',
      title: '스탬프 QR 만들기',
      detail: '아직 스탬프 카드가 없어요. QR 적립이 쌓여야 재방문을 셀 수 있어요.',
      href: '/qr-admin',
      action: '만들기',
    })
  }
  return todos.slice(0, Math.max(0, max))
}

/** localStorage 점검표 값(JSON 문자열)에서 체크 수를 센다. 저장값이 없으면 0, 깨졌으면 null */
export function countChecklist(raw: string | null): number | null {
  if (raw === null) return 0
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return Object.values(parsed).filter(v => v === true).length
  } catch {
    return null
  }
}
