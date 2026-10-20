// app/api/threads/posts/[id]/route.ts
// 포스트 수정 / 삭제
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { requireUser } from '@/app/lib/userAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(
 request: Request,
 { params }: { params: Promise<{ id: string }> },
) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const svc = createServiceClient()
 const { id } = await params

 const { data: existing } = await svc
 .from('threads_posts')
 .select('status, updated_at')
 .eq('id', id)
 .eq('user_id', auth.userId)
 .maybeSingle()

 if (!existing) return NextResponse.json({ error: '포스트를 찾을 수 없습니다.' }, { status: 404 })
 if (!['draft', 'scheduled'].includes(existing.status)) {
 return NextResponse.json({ error: `${existing.status} 상태는 수정할 수 없습니다.` }, { status: 400 })
 }

 const body = await request.json() as {
 text_content?: string
 hashtags?: string[]
 image_url?: string
 scheduled_at?: string | null
 }

 const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
 if (body.text_content !== undefined) updates.text_content = body.text_content.trim()
 if (body.hashtags !== undefined) updates.hashtags = body.hashtags
 if (body.image_url !== undefined) updates.image_url = body.image_url || null
 if (body.scheduled_at !== undefined) {
 const when = body.scheduled_at ? new Date(body.scheduled_at) : null
 if (when && (!Number.isFinite(when.getTime()) || when.getTime() <= Date.now())) {
 return NextResponse.json({ error: '예약 시간은 현재보다 이후로 지정해 주세요.' }, { status: 400 })
 }
 updates.scheduled_at = when?.toISOString() ?? null
 updates.status = when ? 'scheduled' : 'draft'
 }
 if (body.image_url !== undefined) {
 updates.media_type = body.image_url ? 'IMAGE' : 'TEXT'
 }

 const { data: saved, error } = await svc.from('threads_posts').update(updates).eq('id', id).eq('user_id', auth.userId)
 .eq('status', existing.status).eq('updated_at', existing.updated_at).select('id').maybeSingle()
 if (error) return NextResponse.json({ error: error.message }, { status: 500 })
 if (!saved) return NextResponse.json({ error: '상태가 변경됐습니다. 새로고침해 주세요.' }, { status: 409 })

 return NextResponse.json({ ok: true })
}

export async function DELETE(
 _request: Request,
 { params }: { params: Promise<{ id: string }> },
) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const svc = createServiceClient()
 const { id } = await params

 const { data: existing } = await svc
 .from('threads_posts')
 .select('status, updated_at')
 .eq('id', id)
 .eq('user_id', auth.userId)
 .maybeSingle()

 if (!existing) return NextResponse.json({ error: '포스트를 찾을 수 없습니다.' }, { status: 404 })
 if (!['draft', 'scheduled', 'failed'].includes(existing.status)) {
 return NextResponse.json({ error: '발행된 포스트는 삭제할 수 없습니다.' }, { status: 400 })
 }

 const { data: deleted, error } = await svc.from('threads_posts').delete().eq('id', id).eq('user_id', auth.userId)
 .eq('status', existing.status).eq('updated_at', existing.updated_at).select('id').maybeSingle()
 if (error) return NextResponse.json({ error: '삭제하지 못했습니다.' }, { status: 500 })
 if (!deleted) return NextResponse.json({ error: '상태가 변경됐습니다. 새로고침해 주세요.' }, { status: 409 })
 return NextResponse.json({ ok: true })
}
