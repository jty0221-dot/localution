// app/api/store-status/route.ts
// ============================================================
// LU-018 W2-3 · '내 가게 지금 상태' 카드용 읽기 전용 API
// GET /api/store-status
//
// · 로그인 사용자(requireUser) 본인 user_id 범위만 읽는다. 쓰기 없음 · 외부 호출 없음
// · 합산 점수 · 등급을 만들지 않는다. place_score · score 열은 select 하지 않는다
// · 미답글 기준은 /api/stores/me 와 같다 (has_reply 이거나 reply_status='submitted' 면 답글 완료)
//   /api/user/review-stats 는 has_reply=false 만 보므로 숫자가 다를 수 있다
// · 구역마다 따로 읽는다. 한 구역이 실패해도 나머지는 그대로 내리고 실패 구역은 state 로 밝힌다
// ============================================================
import { NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import {
  buildPlaceMetrics,
  buildReviewSummary,
  buildKeywordStatuses,
  buildStampSummary,
  kstPrevMonthStartIso,
  type Metric,
  type PlaceSnapshotRow,
  type ReviewRow,
  type KeywordRankRow,
  type StampEventRow,
} from '@/app/lib/store-status'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 1000
const MAX_REVIEW_ROWS = 20000
const MAX_STAMP_EVENTS = 20000
const KEYWORD_LOOKBACK_DAYS = 45
const VISIT_EVENT_TYPES = ['enrolled', 'stamped', 'reward_claimed']

type Section = 'read' | 'failed'

export async function GET() {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const svc = createServiceClient()
  const userId = auth.userId
  const nowIso = new Date().toISOString()
  const sections: Record<'place' | 'reviews' | 'keywords' | 'stamps', Section> = {
    place: 'failed', reviews: 'failed', keywords: 'failed', stamps: 'failed',
  }

  // ── 1) 플레이스 : 최근 측정된 추적 대상 하나의 스냅샷 ─────────
  let place: { targetId: string; placeId: string | null; name: string | null } | null = null
  let hasPlaceTarget: boolean | null = null
  let placeMetrics: Metric[] = buildPlaceMetrics(null)
  try {
    const { data: targets, error: tErr } = await svc
      .from('place_targets')
      .select('id, place_id, name, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (tErr) throw tErr
    hasPlaceTarget = (targets ?? []).length > 0
    if (hasPlaceTarget) {
      // 가장 최근에 측정된 대상을 고른다 (없으면 가장 최근 등록 대상)
      const { data: lastSnap, error: lErr } = await svc
        .from('place_snapshots')
        .select('target_id')
        .eq('user_id', userId)
        .order('ts', { ascending: false })
        .limit(1)
      if (lErr) throw lErr
      const owned = new Map((targets ?? []).map((t: any) => [t.id, t]))
      const chosen: any = (lastSnap && lastSnap[0] && owned.get(lastSnap[0].target_id)) || targets![0]
      place = { targetId: chosen.id, placeId: chosen.place_id ?? null, name: chosen.name ?? null }
      const { data: snaps, error: sErr } = await svc
        .from('place_snapshots')
        .select('ts, visitor_review_count, blog_review_count, rating, source')
        .eq('user_id', userId)
        .eq('target_id', chosen.id)
        .order('ts', { ascending: false })
        .limit(60)
      if (sErr) throw sErr
      placeMetrics = buildPlaceMetrics((snaps ?? []) as PlaceSnapshotRow[])
    }
    sections.place = 'read'
  } catch (e) {
    console.warn('[store-status] place read failed:', (e as any)?.message ?? e)
    hasPlaceTarget = null
    placeMetrics = placeMetrics.map(m => ({ ...m, state: 'unavailable' as const }))
  }

  // ── 2) 리뷰 : 미답글 · 최근 7일 새 리뷰 · 평균 별점 ─────────
  let reviewRows: ReviewRow[] | null = null
  let reviewsTruncated = false
  try {
    const rows: ReviewRow[] = []
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await svc
        .from('platform_reviews')
        .select('rating, has_reply, reply_status, posted_at, collected_at')
        .eq('user_id', userId)
        .order('collected_at', { ascending: false, nullsFirst: false })
        .range(from, from + PAGE_SIZE - 1)
      if (error) throw error
      rows.push(...((data ?? []) as ReviewRow[]))
      if (!data || data.length < PAGE_SIZE) break
      if (rows.length >= MAX_REVIEW_ROWS) { reviewsTruncated = true; break }
    }
    reviewRows = rows
    sections.reviews = 'read'
  } catch (e) {
    console.warn('[store-status] reviews read failed:', (e as any)?.message ?? e)
  }
  const reviews = reviewRows ? buildReviewSummary(reviewRows, nowIso) : null

  // ── 3) 키워드 순위 (등록돼 있으면) ──────────────────────────
  let keywords = buildKeywordStatuses(null, null)
  try {
    const { data: kt, error: kErr } = await svc
      .from('place_keyword_targets')
      .select('id, keyword')
      .eq('user_id', userId)
      .eq('enabled', true)
      .order('created_at', { ascending: true })
      .limit(20)
    if (kErr) throw kErr
    const targets = (kt ?? []) as Array<{ id: string; keyword: string }>
    let rankRows: KeywordRankRow[] = []
    if (targets.length > 0) {
      const since = new Date(Date.parse(nowIso) - KEYWORD_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()
      const { data: rr, error: rErr } = await svc
        .from('place_keyword_ranks')
        .select('keyword_target_id, keyword, rank, total, method, ts')
        .eq('user_id', userId)
        .in('keyword_target_id', targets.map(t => t.id))
        .gte('ts', since)
        .order('ts', { ascending: false })
        .limit(2000)
      if (rErr) throw rErr
      rankRows = (rr ?? []) as KeywordRankRow[]
    }
    keywords = buildKeywordStatuses(targets, rankRows)
    sections.keywords = 'read'
  } catch (e) {
    // 키워드 테이블이 없는 환경도 여기로 온다 → 카드는 키워드 줄을 '조회 실패' 로 둔다
    console.warn('[store-status] keywords read failed:', (e as any)?.message ?? e)
  }

  // ── 4) 스탬프 QR : 이번 달 · 지난 달 적립 ──────────────────
  let hasStampCard: boolean | null = null
  let stampEvents: StampEventRow[] = []
  let stampAvailable = false
  let stampsTruncated = false
  try {
    const { data: cards, error: cErr } = await svc.from('stamp_cards').select('id').eq('user_id', userId)
    if (cErr) throw cErr
    const cardIds = (cards ?? []).map((c: any) => c.id)
    hasStampCard = cardIds.length > 0
    sections.stamps = 'read'
    if (hasStampCard) {
      const since = kstPrevMonthStartIso(nowIso)
      try {
        for (let from = 0; ; from += PAGE_SIZE) {
          const { data, error } = await svc
            .from('stamp_events')
            .select('collection_id, created_at')
            .in('stamp_card_id', cardIds)
            .in('event_type', VISIT_EVENT_TYPES)
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .range(from, from + PAGE_SIZE - 1)
          if (error) throw error
          stampEvents.push(...((data ?? []) as StampEventRow[]))
          if (!data || data.length < PAGE_SIZE) break
          if (stampEvents.length >= MAX_STAMP_EVENTS) { stampsTruncated = true; break }
        }
        stampAvailable = true
      } catch (e) {
        console.warn('[store-status] stamp_events read failed:', (e as any)?.message ?? e)
        stampEvents = []
      }
    }
  } catch (e) {
    console.warn('[store-status] stamp_cards read failed:', (e as any)?.message ?? e)
  }
  const stamps = hasStampCard === null
    ? { ...buildStampSummary({ hasCard: true, available: false, events: null, nowIso }) }
    : buildStampSummary({ hasCard: hasStampCard, available: stampAvailable, events: stampEvents, nowIso })

  return NextResponse.json({
    ok: true,
    user_id: userId,
    read_at: nowIso,
    sections,
    place: place ? { name: place.name, placeId: place.placeId } : null,
    hasPlaceTarget,
    placeMetrics,
    reviews,
    reviewsTruncated,
    keywords,
    hasStampCard,
    stamps,
    stampsTruncated,
  })
}
