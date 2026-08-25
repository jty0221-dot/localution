// app/api/place/keyword-competition/route.ts
// ============================================================
// 키워드 경쟁력 분석 조회
//
//   GET /api/place/keyword-competition?keyword_target_id={uuid}
//
// 가장 최근 수집 배치의 경쟁 매장 목록을 읽어 지표를 계산해 돌려준다.
// 계산은 app/lib/place-competition.ts 단일 출처를 쓴다 —
// 수집 시점(크론)과 조회 시점(이 API)이 같은 함수를 쓰므로 값이 어긋나지 않는다.
//
// 응답의 각 지표에는 confidence 가 붙는다:
//   measured(확정)  — 네이버가 준 값으로만 계산
//   estimated(추정) — 우리 해석이 섞인 점수
// 화면은 이 값으로 배지를 분기한다.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { computeCompetition } from '@/app/lib/place-competition'
import type { PlaceCandidate } from '@/app/lib/place-rank'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }

  const keywordTargetId = new URL(req.url).searchParams.get('keyword_target_id')
  if (!keywordTargetId) {
    return NextResponse.json({ ok: false, error: 'keyword_target_id 가 필요해요' }, { status: 400 })
  }

  const svc = createServiceClient()

  // 소유권 확인 + 키워드 정보
  const { data: kt, error: ktErr } = await svc
    .from('place_keyword_targets')
    .select('id, user_id, target_id, keyword')
    .eq('id', keywordTargetId)
    .maybeSingle()

  if (ktErr) return NextResponse.json({ ok: false, error: ktErr.message }, { status: 500 })
  if (!kt || kt.user_id !== auth.userId) {
    return NextResponse.json({ ok: false, error: '해당 키워드를 찾을 수 없어요' }, { status: 404 })
  }

  // 최신 순위 스냅샷
  const { data: latest } = await svc
    .from('place_keyword_ranks')
    .select('rank, total, naver_score, score, score_source, visitor_review_count, blog_review_count, rating, save_count, ts, method')
    .eq('keyword_target_id', keywordTargetId)
    .order('ts', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latest) {
    return NextResponse.json({
      ok: true,
      keyword: kt.keyword,
      collected: false,
      message: '아직 수집된 기록이 없어요. 새로고침을 눌러 지금 측정해보세요.',
    })
  }

  // 최신 배치의 경쟁 매장 목록
  const { data: comps } = await svc
    .from('place_keyword_competitors_latest')
    .select('rank, place_id, name, category, visitor_review_count, blog_review_count, rating, naver_score, is_mine')
    .eq('keyword_target_id', keywordTargetId)
    .order('rank', { ascending: true })

  const competitors: PlaceCandidate[] = (comps ?? []).map(c => ({
    rank: c.rank as number,
    placeId: (c.place_id as string) ?? null,
    name: (c.name as string) ?? '',
    category: (c.category as string) ?? null,
    visitorReviewCount: c.visitor_review_count as number | null,
    blogReviewCount: c.blog_review_count as number | null,
    rating: c.rating as number | null,
    naverScore: c.naver_score as number | null,
  }))

  // 매장 업종 (연관 신호 계산에 사용)
  const { data: target } = await svc
    .from('place_targets')
    .select('category_name, name')
    .eq('id', kt.target_id)
    .maybeSingle()

  const result = computeCompetition({
    rank: latest.rank,
    total: latest.total,
    keyword: kt.keyword,
    naverScore: latest.naver_score,
    mine: {
      visitorReviewCount: latest.visitor_review_count,
      blogReviewCount: latest.blog_review_count,
      saveCount: latest.save_count,
      rating: latest.rating,
      category: target?.category_name ?? null,
    },
    competitors,
  })

  return NextResponse.json({
    ok: true,
    collected: true,
    keyword: kt.keyword,
    store_name: target?.name ?? null,
    rank: latest.rank,
    total: latest.total,
    method: latest.method,
    collected_at: latest.ts,
    metrics: result.metrics,
    naver_score: result.naverScore,
    score_source: result.scoreSource,
    peer_top_score: result.peerTopScore,
    peer_count: result.peerCount,
    competitors: competitors.slice(0, 10),
  })
}
