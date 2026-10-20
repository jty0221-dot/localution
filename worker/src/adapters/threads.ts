// worker/src/adapters/threads.ts
// ============================================================
// Threads 자동발행 어댑터 — REST API 전용 (Playwright 불필요)
//   · 2단계 발행: container 생성 → publish
//   · container_id 저장으로 생성 단계를 재사용. 외부 발행 후 영수증 오류는 수동 대조 필요
// ============================================================
import { randomUUID } from 'node:crypto'
import type { Logger } from 'pino'
import type { JobResult } from '../jobs'
import { getServiceClient } from '../lib/supabase'
import { loadThreadsToken, refreshThreadsTokenIfNeeded } from '../lib/threads-token'

const THREADS_API = 'https://graph.threads.net/v1.0'
const CONTAINER_POLL_MAX_MS = 30_000
const CONTAINER_POLL_INTERVAL_MS = 2_000

interface ThreadsOpts {
  userId: string
  log: Logger
}

async function pollContainerStatus(
  containerId: string,
  token: string,
  log: Logger,
): Promise<boolean> {
  const deadline = Date.now() + CONTAINER_POLL_MAX_MS
  while (Date.now() < deadline) {
    const res = await fetch(
      `${THREADS_API}/${containerId}?fields=status,error_message&access_token=${token}`
    )
    const data = await res.json() as { status?: string; error_message?: string }
    if (data.status === 'FINISHED') return true
    if (data.status === 'ERROR') {
      log.error({ containerId, error: data.error_message }, '[threads] container error')
      return false
    }
    await new Promise(r => setTimeout(r, CONTAINER_POLL_INTERVAL_MS))
  }
  log.warn({ containerId }, '[threads] container poll timeout')
  return false
}

export async function runThreadsPublish(
  opts: ThreadsOpts,
  payload: Record<string, unknown> | undefined,
): Promise<JobResult> {
  const { userId, log } = opts
  const svc = getServiceClient()
  const postId = payload?.post_id as string | undefined

  if (!postId) {
    return { status: 'failed', message: 'payload.post_id missing' }
  }

  // 1. DB에서 포스트 조회
  const { data: post, error: fetchErr } = await svc
    .from('threads_posts')
    .select('*')
    .eq('id', postId)
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchErr || !post) {
    return { status: 'failed', message: `post not found: ${postId}` }
  }
  if (post.status === 'published' || post.threads_post_id) {
    return { status: 'skipped', message: 'already published' }
  }

  if (post.user_id !== userId || post.status !== 'publishing') {
    return { status: 'skipped', message: 'post is not owned or not queued for publication' }
  }
  if (String(post.error_message || '').startsWith('publication_attempt_in_flight')) {
    return { status: 'skipped', message: 'publication_reconciliation_required: previous execution must be checked', data: { retryAllowed: false } }
  }
  // Durable execution claim. A process crash or timeout must not start another publication.
  const executionMarker = `publication_attempt_in_flight:${randomUUID()}: 발행 결과 확인 필요. 자동 재발행 금지`
  let claimQuery = svc.from('threads_posts').update({
    error_message: executionMarker,
    updated_at: new Date().toISOString(),
  }).eq('id', postId).eq('user_id', userId).eq('status', 'publishing')
    .eq('updated_at', post.updated_at)
  claimQuery = post.error_message == null ? claimQuery.is('error_message', null) : claimQuery.eq('error_message', post.error_message)
  const { data: claimed, error: claimError } = await claimQuery.select('id').maybeSingle()
  if (claimError || !claimed) return { status: 'skipped', message: 'publication claim unavailable', data: { retryAllowed: false } }

  // 2. 토큰 로드 + 갱신 체크
  await refreshThreadsTokenIfNeeded(svc, userId)
  const tokenData = await loadThreadsToken(svc, userId)
  if (!tokenData) {
    await svc.from('threads_posts').update({
      status: 'failed',
      error_message: 'token_missing: Threads 계정 연결 필요',
      updated_at: new Date().toISOString(),
    }).eq('id', postId).eq('user_id', userId).eq('error_message', executionMarker)
    return { status: 'failed', message: 'threads token missing' }
  }

  const { access_token: token, threads_user_id: threadsUserId } = tokenData

  // 3. 본문 조합 (텍스트 + 해시태그)
  const hashtags = Array.isArray(post.hashtags) && post.hashtags.length > 0
    ? '\n\n' + post.hashtags.map((t: string) => (t.startsWith('#') ? t : `#${t}`)).join(' ')
    : ''
  const fullText = post.text_content + hashtags

  let publishedId: string | undefined
  let publicationAttempted = false
  const reconciliationRequired = (): JobResult => {
    log.error({ postId, threadId: publishedId, code: 'receipt_reconciliation_required' }, '[threads] publication outcome requires reconciliation; do not republish')
    return {
      status: 'skipped',
      message: 'receipt_reconciliation_required: verify publication outcome; do not republish',
      data: { code: 'receipt_reconciliation_required', postId, threadsPostId: publishedId, externalPublished: !!publishedId, retryAllowed: false },
    }
  }
  try {
    let containerId = post.container_id as string | null

    // 4a. container_id 없으면 새로 생성 (Step 1)
    if (!containerId) {
      const params = new URLSearchParams()
      params.set('media_type', post.media_type)
      params.set('text', fullText)
      params.set('access_token', token)
      if (post.media_type === 'IMAGE' && post.image_url) {
        params.set('image_url', post.image_url)
      }

      const createRes = await fetch(
        `${THREADS_API}/${threadsUserId}/threads`,
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() }
      )
      const createData = await createRes.json() as { id?: string; error?: { message: string } }

      if (!createData.id) {
        const errMsg = createData.error?.message || 'container creation failed'
        log.error({ postId, err: errMsg }, '[threads] container create failed')
        await svc.from('threads_posts').update({
          status: 'failed',
          error_message: errMsg,
          retry_count: (post.retry_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        }).eq('id', postId).eq('user_id', userId).eq('error_message', executionMarker)
        return { status: 'failed', message: errMsg }
      }

      containerId = createData.id
      // container_id 즉시 저장 — 이후 재시도 시 Step 1 스킵
      await svc.from('threads_posts').update({
        container_id: containerId,
        updated_at: new Date().toISOString(),
      }).eq('id', postId).eq('user_id', userId).eq('error_message', executionMarker)

      log.info({ postId, containerId }, '[threads] container created')
    }

    // 4b. 컨테이너 상태 폴링 (FINISHED 대기)
    const ready = await pollContainerStatus(containerId, token, log)
    if (!ready) {
      await svc.from('threads_posts').update({
        status: 'failed',
        error_message: 'container not ready (timeout or error)',
        retry_count: (post.retry_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      }).eq('id', postId).eq('user_id', userId).eq('error_message', executionMarker)
      return { status: 'failed', message: 'container not ready' }
    }

    // 5. 발행 (Step 2)
    const publishParams = new URLSearchParams()
    publishParams.set('creation_id', containerId)
    publishParams.set('access_token', token)

    publicationAttempted = true
    const publishRes = await fetch(
      `${THREADS_API}/${threadsUserId}/threads_publish`,
      { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: publishParams.toString() }
    )
    const publishData = await publishRes.json() as { id?: string; error?: { message: string } }

    if (!publishData.id) {
      // Even an error response may follow an accepted request. Keep the durable claim.
      return reconciliationRequired()
    }

    publishedId = publishData.id
    // The external side effect is irreversible. Never route receipt failures to failed/retry.
    const { data: savedReceipt, error: receiptError } = await svc.from('threads_posts').update({
      status: 'published',
      threads_post_id: publishData.id,
      published_at: new Date().toISOString(),
      error_message: null,
      updated_at: new Date().toISOString(),
    }).eq('id', postId).eq('user_id', userId).eq('error_message', executionMarker).select('id').maybeSingle()
    if (receiptError || !savedReceipt) return reconciliationRequired()

    log.info({ postId, threadId: publishData.id }, '[threads] published successfully')

    // 7. 답글 체인 발행 (thread_replies)
    const replies = Array.isArray(post.thread_replies) ? post.thread_replies as { text_content: string; image_url?: string | null }[] : []
    if (replies.length > 0) {
      let replyToId = publishData.id
      for (let i = 0; i < replies.length; i++) {
        const reply = replies[i]
        if (!reply.text_content?.trim()) continue
        try {
          const rParams = new URLSearchParams()
          rParams.set('media_type', reply.image_url ? 'IMAGE' : 'TEXT')
          rParams.set('text', reply.text_content)
          rParams.set('reply_to_id', replyToId)
          rParams.set('access_token', token)
          if (reply.image_url) rParams.set('image_url', reply.image_url)

          const rCreate = await fetch(
            `${THREADS_API}/${threadsUserId}/threads`,
            { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: rParams.toString() }
          )
          const rCreateData = await rCreate.json() as { id?: string; error?: { message: string } }
          if (!rCreateData.id) {
            log.warn({ postId, replyIndex: i, err: rCreateData.error?.message }, '[threads] reply container failed')
            continue
          }

          const rReady = await pollContainerStatus(rCreateData.id, token, log)
          if (!rReady) {
            log.warn({ postId, replyIndex: i }, '[threads] reply container not ready')
            continue
          }

          const rPubParams = new URLSearchParams()
          rPubParams.set('creation_id', rCreateData.id)
          rPubParams.set('access_token', token)
          const rPub = await fetch(
            `${THREADS_API}/${threadsUserId}/threads_publish`,
            { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: rPubParams.toString() }
          )
          const rPubData = await rPub.json() as { id?: string; error?: { message: string } }
          if (rPubData.id) {
            replyToId = rPubData.id
            log.info({ postId, replyIndex: i, threadId: rPubData.id }, '[threads] reply published')
          } else {
            log.warn({ postId, replyIndex: i, err: rPubData.error?.message }, '[threads] reply publish failed')
          }
        } catch (re: any) {
          log.warn({ postId, replyIndex: i, err: re?.message }, '[threads] reply unexpected error')
        }
      }
    }

    return { status: 'ok', message: `published: ${publishData.id}` }

  } catch (e: any) {
    if (publicationAttempted || publishedId) return reconciliationRequired()
    const errMsg = e?.message || String(e)
    log.error({ postId, err: errMsg }, '[threads] unexpected error')
    await svc.from('threads_posts').update({
      status: 'failed',
      error_message: errMsg,
      retry_count: (post.retry_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    }).eq('id', postId).eq('user_id', userId).eq('error_message', executionMarker)
    return { status: 'failed', message: errMsg }
  }
}
