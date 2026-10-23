// app/api/naver-autoreply/run-now/route.ts
// ============================================================
// LU-018 W2-11 · 네이버 자동답글 '지금 생성' — 로그인한 사장님 자기 매장만
//
// 예전엔 화면이 크론 경로(/api/cron/naver-reply-generate)를 그냥 불러 항상 401 이었다
// (크론은 Bearer CRON_SECRET 만 통과 · fail-closed · SEC-002 — 크론 인증은 그대로 둔다).
//
// · 로그인 필수 + 사용자별 한도 (paid-quota · AI 호출 비용) : 분당 2회 · 하루 20회
// · 처리 대상은 로그인한 본인 user_id 하나뿐. 요청 본문의 user_id 같은 값은 읽지 않는다.
// · 크론과 같은 로직(runNaverAutoreplyForUser)을 쓰되 수동 실행은 초안만 만든다
//   (autoApprove=false · 최대 10건). 발행은 같은 화면에서 사장님이 승인.
// ============================================================
import { NextResponse } from 'next/server'
import { requirePaidQuota } from '@/app/lib/paid-quota'
import { createServiceClient } from '@/app/lib/adminAuth'
import { runNaverAutoreplyForUser } from '@/app/lib/naver-autoreply-run'
import { resolveNaverAutoreplyOptions, describeManualRun } from '@/app/lib/naver-autoreply-options'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST() {
  const gate = await requirePaidQuota('naver-autoreply-run-now', { perMinute: 2, perDay: 20 })
  if (!gate.ok) return gate.response
  const userId = gate.userId

  const svc = createServiceClient()
  const { data: cred, error } = await svc
    .from('platform_credentials')
    .select('extra_data')
    .eq('user_id', userId)
    .eq('platform', 'naver_place')
    .maybeSingle()

  if (error) {
    console.warn('[naver-autoreply/run-now] credential read failed:', error.message)
    return NextResponse.json({ ok: false, error: '네이버 연결 정보를 확인하지 못했어요. 잠시 후 다시 시도해주세요.' }, { status: 500 })
  }
  if (!cred) {
    return NextResponse.json(
      { ok: false, code: 'not_connected', error: '네이버 플레이스를 먼저 연결해주세요.', connect_href: '/my/platforms/naver_place/connect' },
      { status: 404 },
    )
  }

  const extra = (cred.extra_data as Record<string, unknown>) || {}
  const r = await runNaverAutoreplyForUser(svc, userId, resolveNaverAutoreplyOptions(extra, 'manual'))
  if (r.errors.length) console.warn('[naver-autoreply/run-now]', userId.slice(0, 8), r.errors.slice(0, 5))

  // 리뷰 조회 자체가 실패했으면 '만들 리뷰 없음' 으로 말하지 않는다
  if (r.candidates === 0 && r.errors.length > 0) {
    return NextResponse.json({ ok: false, error: '리뷰를 확인하지 못했어요. 잠시 후 다시 시도해주세요.' }, { status: 500 })
  }
  return NextResponse.json({
    ok: true,
    total_drafted: r.drafted,
    candidates: r.candidates,
    skipped: r.skipped,
    message: describeManualRun(r),
  })
}
