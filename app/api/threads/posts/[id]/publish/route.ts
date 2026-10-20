// app/api/threads/posts/[id]/publish/route.ts
// 포스트 즉시 발행 트리거 (BullMQ enqueue)
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { requireUser } from '@/app/lib/userAuth'
import { enqueuePlatformJob } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
 _request: Request,
 { params }: { params: Promise<{ id: string }> },
) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const svc = createServiceClient()
 const { id } = await params

 const { data: post } = await svc
 .from('threads_posts')
 .select('status, updated_at')
 .eq('id', id)
 .eq('user_id', auth.userId)
 .maybeSingle()

 if (!post) return NextResponse.json({ error: '포스트를 찾을 수 없습니다.' }, { status: 404 })
 if (!['draft', 'scheduled', 'failed'].includes(post.status)) {
 return NextResponse.json({ error: `${post.status} 상태는 발행할 수 없습니다.` }, { status: 400 })
 }

 // A read is only a candidate. Only the request that claims this exact version may enqueue.
 const claimTime = new Date().toISOString()
 const { data: claimed, error: claimError } = await svc
 .from('threads_posts')
 .update({ status: 'publishing', error_message: null, updated_at: claimTime })
 .eq('id', id)
 .eq('user_id', auth.userId)
 .eq('status', post.status)
 .eq('updated_at', post.updated_at)
 .select('id')
 .maybeSingle()
 if (claimError) return NextResponse.json({ error: '발행 준비 상태를 저장하지 못했습니다.' }, { status: 500 })
 if (!claimed) return NextResponse.json({ error: '다른 요청에서 상태가 변경됐습니다. 새로고침 후 확인해 주세요.' }, { status: 409 })

 const result = await enqueuePlatformJob({
 platform: 'threads',
 action: 'threads_publish',
 userId: auth.userId,
 storeId: auth.userId,
 payload: { post_id: id },
 }, { priority: 1 }).catch(() => ({ ok: false as const, error: 'queue unavailable' }))

 if (!result.ok) {
 const { data: recovered, error: recoveryError } = await svc
 .from('threads_posts')
 .update({ status: 'failed', error_message: result.error, updated_at: new Date().toISOString() })
 .eq('id', id)
 .eq('user_id', auth.userId)
 .eq('status', 'publishing')
 .eq('updated_at', claimTime)
 .is('error_message', null)
 .select('id')
 .maybeSingle()
 return NextResponse.json({ error: '발행 큐 등록에 실패했습니다.', recovery_required: !!recoveryError || !recovered }, { status: 500 })
 }

 return NextResponse.json({ ok: true, job_id: result.jobId })
}
