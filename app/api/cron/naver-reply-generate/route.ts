// app/api/cron/naver-reply-generate/route.ts
// ============================================================
// Vercel 크론 — 네이버 리뷰 AI 자동답글 초안 생성
// · 하루 4회 실행 (vercel.json: 0 2,8,14,20 * * *)
// · autoreply_enabled=true 유저의 미답변 리뷰에 AI 초안 생성
// · auto_approve=true 이면 BullMQ에 바로 투입
// ============================================================
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { runNaverAutoreplyForUser } from '@/app/lib/naver-autoreply-run'
import { resolveNaverAutoreplyOptions } from '@/app/lib/naver-autoreply-options'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function isCronAuthorized(req: Request): boolean {
 const secret = process.env.CRON_SECRET
 // 시크릿 미설정은 '인증 통과'가 아니라 '설정 오류'다 · fail-closed (SEC-002)
 if (!secret) return false
 const auth = req.headers.get('authorization') || ''
 return auth === `Bearer ${secret}`
}

interface UserStat {
 userId: string
 drafted: number
 queued: number
 skipped: number
 errors: string[]
}

export async function GET(req: Request) {
 if (!isCronAuthorized(req)) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }

 const startTime = Date.now()
 const svc = createServiceClient()

 // 1. autoreply 활성화 유저 목록
 const { data: credRows, error: credErr } = await svc
 .from('platform_credentials')
 .select('user_id, extra_data')
 .eq('platform', 'naver_place')

 if (credErr || !credRows) {
 console.error('[naver-reply-generate] platform_credentials 조회 실패:', credErr?.message)
 return NextResponse.json({ ok: false, error: 'DB 조회 실패' }, { status: 500 })
 }

 // v38: 일정 제어 — skip_weekends / skip_holidays / business_hours_only 체크
 const { shouldRunAutoReply } = await import('@/app/lib/autoreply-schedule')

 const enabledUsers = credRows.filter(row => {
 const extra = (row.extra_data as Record<string, unknown>) || {}
 if (extra.autoreply_enabled !== true) return false
 const sched = {
 skip_weekends: extra.autoreply_skip_weekends === true,
 skip_holidays: extra.autoreply_skip_holidays === true,
 business_hours_only: extra.autoreply_business_hours_only === true,
 }
 const check = shouldRunAutoReply(sched)
 if (!check.allowed) {
 console.log('[naver-reply-generate] skip user', String(row.user_id || '').slice(0, 8), check.reason)
 return false
 }
 return true
 })

 if (enabledUsers.length === 0) {
 return NextResponse.json({ ok: true, message: '자동답글 활성화 유저 없음', processed: 0, elapsed_ms: Date.now() - startTime })
 }

 const summary: UserStat[] = []

 for (const cred of enabledUsers) {
 const userId: string = cred.user_id
 const extra = (cred.extra_data as Record<string, unknown>) || {}
 // LU-018 W2-11: 사용자 1명 처리는 lib 로 옮겨 '지금 생성'(run-now) 과 같이 쓴다
 const r = await runNaverAutoreplyForUser(svc, userId, resolveNaverAutoreplyOptions(extra, 'cron'))
 summary.push({ userId: userId.slice(0, 8) + '…', drafted: r.drafted, queued: r.queued, skipped: r.skipped, errors: r.errors })
 }

 const totalDrafted = summary.reduce((s, u) => s + u.drafted, 0)
 const totalQueued = summary.reduce((s, u) => s + u.queued, 0)
 const elapsed = Date.now() - startTime

 console.log(`[naver-reply-generate] users=${enabledUsers.length} drafted=${totalDrafted} queued=${totalQueued} elapsed=${elapsed}ms`)

 return NextResponse.json({
 ok: true,
 elapsed_ms: elapsed,
 users_processed: summary.length,
 total_drafted: totalDrafted,
 total_queued: totalQueued,
 summary,
 })
}
