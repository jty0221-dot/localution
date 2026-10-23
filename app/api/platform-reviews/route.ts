// app/api/platform-reviews/route.ts
// ============================================================
// LU-018 · 자동답글 화면(app/review-admin/naver/autoreply)용 읽기 전용 목록
//
// GET /api/platform-reviews?platform=naver_place&has_reply=false&reply_status=draft&limit=30
// · 로그인 사장님 본인(user_id) 리뷰만 반환 (posted_at DESC)
// · platform      기본 naver_place
// · has_reply     true / false 일 때만 필터
// · reply_status  지정 시 그 상태만 (예: draft = 승인 대기)
// · limit         기본 30 · 상한 100
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const REPLY_STATUSES = new Set(['none', 'draft', 'queued', 'submitting', 'submitted', 'failed', 'rejected'])

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }

  const u = new URL(req.url)
  const platform = (u.searchParams.get('platform') || 'naver_place').trim()
  const hasReplyRaw = (u.searchParams.get('has_reply') || '').toLowerCase()
  const replyStatus = (u.searchParams.get('reply_status') || '').trim()
  const limit = Math.min(100, Math.max(1, Number(u.searchParams.get('limit')) || 30))

  if (replyStatus && !REPLY_STATUSES.has(replyStatus)) {
    return NextResponse.json({ ok: false, error: 'reply_status 값이 올바르지 않습니다.' }, { status: 400 })
  }

  const svc = createServiceClient()
  let q = svc
    .from('platform_reviews')
    .select('id, platform, content, rating, posted_at, has_reply, draft_reply, reply_status, reply_tone, author_mask')
    .eq('user_id', auth.userId)
    .eq('platform', platform)
    .order('posted_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (hasReplyRaw === 'true' || hasReplyRaw === 'false') {
    q = q.eq('has_reply', hasReplyRaw === 'true')
  }
  if (replyStatus) {
    q = q.eq('reply_status', replyStatus)
  }

  const { data, error } = await q
  if (error) {
    return NextResponse.json({ ok: false, error: '리뷰를 불러오지 못했습니다.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, reviews: data ?? [] })
}
