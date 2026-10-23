// app/lib/review-inbox.ts
// ============================================================
// LU-018 W2-9 · 통합 리뷰 수신함 순수 로직
//
// · 답글 판정 기준은 /api/stores/me 와 같다:
//   답글 완료 = has_reply = true OR reply_status = 'submitted'
//   답글 안 단 리뷰 = has_reply = false AND reply_status <> 'submitted' (null 포함)
// · 모르는 수(조회 실패 · 미집계)는 null 로 들고 다니고 화면에는 '-' 로 그린다.
//   0 으로 바꾸지 않는다.
// ============================================================

export type InboxFilter = 'all' | 'unanswered'

export interface ReplyFlags {
  has_reply?: boolean | null
  reply_status?: string | null
}

/** 답글 완료 여부 — stores/me 집계와 같은 기준 */
export function isReviewReplied(r: ReplyFlags | null | undefined): boolean {
  if (!r) return false
  return r.has_reply === true || r.reply_status === 'submitted'
}

/** ?filter= 값 해석. 알 수 없는 값은 전체로 본다 */
export function parseInboxFilter(raw: string | string[] | null | undefined): InboxFilter {
  const v = (Array.isArray(raw) ? raw[0] : raw || '').trim().toLowerCase()
  if (v === 'unanswered' || v === 'unreplied' || v === 'pending') return 'unanswered'
  return 'all'
}

/**
 * /reviews → /review-admin 이동 주소. 들어온 쿼리를 그대로 보존한다.
 * searchParams 는 Next.js page props 모양(Record<string, string | string[] | undefined>).
 */
export function buildReviewsRedirect(
  searchParams: Record<string, string | string[] | undefined> | null | undefined,
  base = '/review-admin',
): string {
  const qs = new URLSearchParams()
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value === undefined) continue
      if (Array.isArray(value)) for (const v of value) qs.append(key, v)
      else qs.append(key, value)
    }
  }
  const s = qs.toString()
  return s ? `${base}?${s}` : base
}

export interface PlatformCountInput {
  review_count?: number | null
  unreplied_count?: number | null
}

/**
 * stores/me 플랫폼 행에서 미답변 · 리뷰 수를 꺼낸다.
 * reviewsRead 가 false 면(리뷰 집계 실패 · 응답에 상태 없음) 모르는 수 → null.
 */
export function readPlatformCounts(
  p: PlatformCountInput | null | undefined,
  reviewsRead: boolean,
): { reviewCount: number | null; unreplied: number | null } {
  if (!reviewsRead || !p) return { reviewCount: null, unreplied: null }
  const rc = typeof p.review_count === 'number' && Number.isFinite(p.review_count) ? p.review_count : null
  const ur = typeof p.unreplied_count === 'number' && Number.isFinite(p.unreplied_count) ? p.unreplied_count : null
  return { reviewCount: rc, unreplied: ur }
}

/** 합계 — 하나라도 모르면 합계도 모른다(null) */
export function sumKnown(values: Array<number | null | undefined>): number | null {
  let total = 0
  for (const v of values) {
    if (typeof v !== 'number' || !Number.isFinite(v)) return null
    total += v
  }
  return total
}

/** 화면 표기 — 모르는 수는 '-' */
export function formatCount(n: number | null | undefined): string {
  return typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString('ko-KR') : '-'
}

/** 피드 필터 적용 */
export function filterFeed<T extends { replied: boolean; platform: string }>(
  feed: T[],
  opts: { filter: InboxFilter; platform: string | 'all' },
): T[] {
  return feed.filter((r) => {
    if (opts.platform !== 'all' && r.platform !== opts.platform) return false
    if (opts.filter === 'unanswered' && r.replied) return false
    return true
  })
}
