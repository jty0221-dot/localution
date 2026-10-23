// app/api/place/keyword-history/route.ts
// ============================================================
// 키워드별 순위·점수 시계열 조회 (차트·표용)
//
//   GET /api/place/keyword-history?keyword_target_id={uuid}&days=30
//     · 단일 키워드의 일자별 순위/점수
//
//   GET /api/place/keyword-history?target_id={uuid}&days=7
//     · 한 매장의 전체 키워드를 한 번에 (모니터링 카드 그리드용)
//
// 응답의 rows 는 ts 오름차순 — 차트가 그대로 그릴 수 있는 순서
// 조회는 최근 쪽부터(ts 내림차순) 넉넉한 상한까지 받아 뒤집는다 (R-03).
// 오름차순 + 500행 상한이면 키워드가 많을 때 최근 날짜가 잘렸다. days 는 최대 31.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { collectRecentRows, historyDays } from '@/app/lib/keyword-history-window'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }

  const sp = new URL(req.url).searchParams
  const keywordTargetId = sp.get('keyword_target_id')
  const targetId = sp.get('target_id')

  if (!keywordTargetId && !targetId) {
    return NextResponse.json(
      { ok: false, error: 'keyword_target_id 또는 target_id 가 필요해요' },
      { status: 400 },
    )
  }

  const days = historyDays(sp.get('days'))
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const svc = createServiceClient()

  const page = (from: number, to: number) => {
    let q = svc
      .from('place_keyword_ranks')
      .select('id, keyword_target_id, keyword, rank, total, score, visitor_review_count, blog_review_count, rating, method, source, ts')
      .eq('user_id', auth.userId) // 소유권을 where 로 강제
      .gte('ts', since)
    if (keywordTargetId) q = q.eq('keyword_target_id', keywordTargetId)
    else if (targetId) q = q.eq('target_id', targetId)
    return q.order('ts', { ascending: false }).order('id', { ascending: false }).range(from, to)
  }

  const { rows, truncated, error } = await collectRecentRows(page)
  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 500 })
  }

  // 키워드별로 묶어서 반환 — 카드 그리드가 그대로 렌더 가능
  const byKeyword: Record<string, typeof rows> = {}
  for (const r of rows) {
    const k = r.keyword_target_id as string
    if (!byKeyword[k]) byKeyword[k] = []
    byKeyword[k].push(r)
  }

  return NextResponse.json({
    ok: true,
    days,
    count: rows.length,
    truncated, // true 면 가장 오래된 날짜 쪽이 일부 빠짐
    rows,
    by_keyword: byKeyword,
  })
}
