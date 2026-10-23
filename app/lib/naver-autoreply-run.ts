// app/lib/naver-autoreply-run.ts
// ============================================================
// LU-018 W2-11 · 네이버 자동답글 초안 생성 — 한 사용자분
//   크론(/api/cron/naver-reply-generate)과 사장님 '지금 생성'(/api/naver-autoreply/run-now)이
//   같은 로직을 쓴다. 크론에 있던 사용자 1명 처리 부분을 그대로 옮겼다.
//   호출하는 쪽이 user_id 를 정한다 — 사용자 라우트는 로그인한 본인 id 만 넘긴다.
// ============================================================
import type { createServiceClient } from '@/app/lib/adminAuth'
import { loadStoreInfo, generateNaverReply } from '@/app/lib/generate-naver-reply'
import { enqueuePlatformJob } from '@/app/lib/queue'
import type { NaverAutoreplyRunOptions } from '@/app/lib/naver-autoreply-options'

type Svc = ReturnType<typeof createServiceClient>

export interface NaverAutoreplyUserStat {
  candidates: number
  drafted: number
  queued: number
  skipped: number
  errors: string[]
}

export async function runNaverAutoreplyForUser(
  svc: Svc,
  userId: string,
  opts: NaverAutoreplyRunOptions,
): Promise<NaverAutoreplyUserStat> {
  const stat: NaverAutoreplyUserStat = { candidates: 0, drafted: 0, queued: 0, skipped: 0, errors: [] }
  const { tone, autoApprove, maxPerRun, bizId } = opts

  try {
    // 1. 이 유저의 미답변 + draft 없는 리뷰
    const { data: reviews, error: revErr } = await svc
      .from('platform_reviews')
      .select('id, content, rating, photos, platform_review_id')
      .eq('user_id', userId)
      .eq('platform', 'naver_place')
      .eq('has_reply', false)
      .is('draft_reply', null)
      .not('reply_status', 'in', '("submitted","queued","rejected")')
      .order('posted_at', { ascending: false })
      .limit(maxPerRun)

    if (revErr) {
      stat.errors.push(`리뷰 조회 실패: ${revErr.message}`)
      return stat
    }
    if (!reviews || reviews.length === 0) return stat
    stat.candidates = reviews.length

    // 2. 매장 정보 1회 로드
    const storeInfo = await loadStoreInfo(userId)

    // stores.id 1회 조회 (BullMQ payload용)
    const { data: storeRow } = await svc
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()
    const storeId: string = (storeRow as { id?: string } | null)?.id || userId

    for (const rev of reviews as Array<{ id: string; content: unknown; rating: unknown; photos: unknown; platform_review_id: string | null }>) {
      const reviewInfo = {
        content: String(rev.content || ''),
        rating: typeof rev.rating === 'number' ? rev.rating : null,
        photos: Array.isArray(rev.photos) ? (rev.photos as string[]) : [],
      }

      // 3. AI 생성
      const result = await generateNaverReply(storeInfo, reviewInfo, tone)
      if (!result.ok) {
        stat.errors.push(`review ${rev.id}: ${result.error}`)
        stat.skipped++
        continue
      }

      const newStatus = autoApprove ? 'queued' : 'draft'
      const nowIso = new Date().toISOString()

      // 4. draft 저장 (user_id 조건을 같이 걸어 다른 계정 행을 건드리지 않는다)
      const { error: updateErr } = await svc
        .from('platform_reviews')
        .update({
          draft_reply: result.reply,
          reply_status: newStatus,
          reply_tone: result.tone || tone, // 'auto' 면 실제로 쓰인 톤을 남긴다
          reply_queued_at: autoApprove ? nowIso : null,
        })
        .eq('id', rev.id)
        .eq('user_id', userId)

      if (updateErr) {
        stat.errors.push(`DB update 실패 (${rev.id}): ${updateErr.message}`)
        stat.skipped++
        continue
      }
      stat.drafted++

      // 5. auto_approve 이면 BullMQ 투입
      if (autoApprove) {
        const enqResult = await enqueuePlatformJob({
          platform: 'naver_place',
          action: 'post_reply',
          userId,
          storeId,
          payload: {
            platform_review_id: rev.platform_review_id || rev.id,
            reply_text: result.reply,
            ...(bizId ? { biz_id: bizId } : {}),
          },
        })
        if (enqResult.ok) {
          stat.queued++
        } else {
          stat.errors.push(`enqueue 실패 (${rev.id}): ${enqResult.error}`)
          // 큐 투입 실패 → pending으로 롤백
          await svc
            .from('platform_reviews')
            .update({ reply_status: 'draft', reply_queued_at: null })
            .eq('id', rev.id)
            .eq('user_id', userId)
        }
      }
    }
  } catch (e: unknown) {
    stat.errors.push(`처리 오류: ${e instanceof Error ? e.message : String(e)}`)
  }
  return stat
}
