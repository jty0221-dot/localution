// app/api/cron/threads-publish/route.ts
// 예약 발행 cron — 매분 실행, scheduled_at 도달한 포스트를 BullMQ에 투입
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { enqueuePlatformJob } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

function isCronAuthorized(req: Request): boolean {
 const secret = process.env.CRON_SECRET
 // 시크릿 미설정은 '인증 통과'가 아니라 '설정 오류'다 · fail-closed (SEC-002)
 if (!secret) return false
 const auth = req.headers.get('authorization') || ''
 return auth === `Bearer ${secret}`
}

export async function GET(req: Request) {
 if (!isCronAuthorized(req)) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }

 const svc = createServiceClient()

 const { data: duePosts, error } = await svc
 .from('threads_posts')
 .select('id, user_id')
 .eq('status', 'scheduled')
 .lte('scheduled_at', new Date().toISOString())
 .lt('retry_count', 3)
 .limit(50)

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 })
 }

 if (!duePosts || duePosts.length === 0) {
 return NextResponse.json({ ok: true, count: 0 })
 }

 // 조회 목록은 후보일 뿐이다. scheduled 상태를 원자적으로 선점한 반환행만 큐에 넣는다.
 const claimTime = new Date().toISOString()
 const { data: claimedPosts, error: claimError } = await svc
 .from('threads_posts')
 .update({ status: 'publishing', updated_at: claimTime })
 .in('id', duePosts.map(p => p.id))
 .eq('status', 'scheduled')
 .lte('scheduled_at', claimTime)
 .lt('retry_count', 3)
 .select('id, user_id, updated_at')

 if (claimError) {
 return NextResponse.json({ ok: false, error: '예약 발행 작업 선점 실패' }, { status: 500 })
 }

 let enqueued = 0
 let failed = 0
 let recoveryFailed = 0
 for (const post of claimedPosts || []) {
 let result: Awaited<ReturnType<typeof enqueuePlatformJob>>
 try {
 result = await enqueuePlatformJob({
 platform: 'threads',
 action: 'threads_publish',
 userId: post.user_id,
 storeId: post.user_id,
 payload: { post_id: post.id },
 }, { priority: 1 })
 } catch {
 result = { ok: false, error: 'queue unavailable' }
 }

 if (result.ok) {
 enqueued++
 } else {
 failed++
 // 이 요청이 선점한 publishing 행만 실패로 바꾼다. 다른 실행의 상태는 덮어쓰지 않는다.
 const { data: recovered, error: recoveryError } = await svc
 .from('threads_posts')
 .update({
 status: 'failed',
 error_message: `enqueue failed: ${result.error}`,
 updated_at: new Date().toISOString(),
 })
 .eq('id', post.id)
 .eq('status', 'publishing')
 .eq('updated_at', post.updated_at)
 .select('id')
 if (recoveryError || !recovered?.length) recoveryFailed++
 }
 }

 if (failed) {
 return NextResponse.json({
 ok: false, count: enqueued, failed, recovery_failed: recoveryFailed,
 error: recoveryFailed ? '예약 발행 큐 등록과 상태 복구 확인이 필요합니다' : '일부 예약 발행 큐 등록에 실패했습니다',
 }, { status: 500 })
 }
 return NextResponse.json({ ok: true, count: enqueued })
}
