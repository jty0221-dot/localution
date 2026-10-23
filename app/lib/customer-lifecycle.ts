// app/lib/customer-lifecycle.ts
// ============================================================
// 고객 방문 기반 자동 태그 (LU-018 W2-4 · W2-5) · 순수 함수
//
// 기준은 재방문 분석(app/lib/revisit-analysis.ts)과 같다
// · 단골 = 2회 이상 방문 (revisit-analysis 의 regulars : days.length >= 2)
// · 휴면 = 마지막 방문이 90일을 넘음 (revisit-analysis DORMANT_DAYS · 고객 화면 '휴면 (90일+)')
// · 신규 = 방문 1회 · 휴면 아님
// · VIP · 블랙리스트는 사장님이 직접 붙이는 태그라 건드리지 않는다
//   (CLAUDE.md CRM 절의 VIP 기준 '월 3회 이상 or 월 5만원 이상' 은 월별 방문 · 매출 기록이 있어야 해서 자동 판정하지 않는다)
// · 방문 기록이 하나도 없으면(직접 등록 · 방문 0회) 사장님이 고른 태그를 그대로 둔다
// ============================================================
import { DORMANT_DAYS, REGULAR_MIN_VISITS, toKstDate } from './revisit-analysis'

export const AUTO_TAGS = ['신규', '단골', '휴면'] as const
export type AutoTag = typeof AUTO_TAGS[number]

const DAY_MS = 24 * 60 * 60 * 1000

export type VisitFacts = {
  visits: number | null | undefined
  lastVisitAt: string | null | undefined // ISO 또는 YYYY-MM-DD
}

function kstDayIndex(isoOrDate: string): number | null {
  const s = String(isoOrDate || '').trim()
  if (!s) return null
  const day = /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : (Number.isFinite(Date.parse(s)) ? toKstDate(s) : '')
  if (!day) return null
  const t = Date.parse(day + 'T00:00:00Z')
  return Number.isFinite(t) ? Math.round(t / DAY_MS) : null
}

// 방문 사실로 자동 태그 하나를 고른다. 방문 기록이 없으면 null (판정하지 않음)
export function lifecycleTag(facts: VisitFacts, now: Date = new Date()): AutoTag | null {
  const visits = Math.max(0, Math.floor(Number(facts.visits) || 0))
  const last = facts.lastVisitAt ? kstDayIndex(facts.lastVisitAt) : null
  if (visits === 0 && last === null) return null
  if (last !== null) {
    const since = kstDayIndex(now.toISOString())! - last
    if (since > DORMANT_DAYS) return '휴면'
  }
  if (visits >= REGULAR_MIN_VISITS) return '단골'
  return '신규'
}

// 기존 태그에서 자동 태그만 바꿔 끼운다. 사장님 태그(VIP · 블랙리스트 등) 순서는 유지
export function applyLifecycleTags(tags: readonly string[] | null | undefined, facts: VisitFacts, now: Date = new Date()): string[] {
  const current = Array.isArray(tags) ? tags.filter(t => typeof t === 'string') : []
  const auto = lifecycleTag(facts, now)
  if (auto === null) return [...current]
  const kept = current.filter(t => !(AUTO_TAGS as readonly string[]).includes(t))
  return [...kept, auto]
}

export function sameTags(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((t, i) => t === b[i])
}
