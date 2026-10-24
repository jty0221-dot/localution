// app/api/admin/platform-issues-overview/route.ts
// ============================================================
// v38: 시스템 전체 플랫폼 이슈 한눈에 보기
//   · 자격증명 오류 (credentials_invalid)
//   · 최근 24h failed 답글
//   · 최근 24h failed 수집 (last_login_status='failed')
//   · stuck queued 답글
//   · place_id 누락 사용자
//   · 스탬프 → 고객 자동 등록 실패 (stamp_events.event_type='crm_sync_failed' · LU-018 W2-4)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  const svc = createServiceClient()
  const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString()

  // 1) 자격증명 오류 사용자 — last_login_status 는 'success' 또는 'success:note' 또는 'failed:note' 형식
  //    'success' 로 시작하지 않는 모든 값 = 실패/잠금 상태
  const { data: allCreds } = await svc
    .from('platform_credentials')
    .select('user_id, platform, last_login_status, last_error_message, last_login_at, platform_store_name')
    .not('last_login_status', 'is', null)
    .order('last_login_at', { ascending: false })
    .limit(200)

  const failedCreds = (allCreds || []).filter(c => {
    const s = String(c.last_login_status || '')
    return !!s && !s.startsWith('success')
  }).slice(0, 50)

  // 2) 누락 place_id 사용자 (자격증명 있지만 store_id 없음)
  const { data: nullPlaceId } = await svc
    .from('platform_credentials')
    .select('user_id, platform')
    .or('platform_store_id.is.null,platform_store_id.eq.')
    .limit(20)

  // 3) 24h failed 답글 (replies) 집계
  const { data: failedReplies, count: failedReplyCount } = await svc
    .from('platform_reviews')
    .select('user_id, platform, reply_error', { count: 'exact' })
    .eq('reply_status', 'failed')
    .gte('reply_submitted_at', since24h)
    .limit(20)

  // failed_reply 패턴 분석
  const failedReplyPatterns: Record<string, number> = {}
  for (const r of (failedReplies || [])) {
    const err = String(r.reply_error || '')
    let pattern = '기타'
    if (err.includes('login failed')) pattern = '로그인 실패'
    else if (err.includes('안전하지 않은') || err.includes('비정상')) pattern = '네이버 잠금'
    else if (err.includes('silent reject')) pattern = 'silent reject'
    else if (err.includes('review card not found')) pattern = '리뷰 카드 못찾음'
    else if (err.includes('입력란')) pattern = '답글 입력란 없음'
    else if (err.includes('credentials_invalid') || err.includes('아이디 또는 비밀번호')) pattern = '자격증명 오류'
    else if (err.includes('큐 분실')) pattern = '큐 분실'
    failedReplyPatterns[pattern] = (failedReplyPatterns[pattern] || 0) + 1
  }

  // 4) stuck queued 답글
  const { data: stuckQueued, count: stuckCount } = await svc
    .from('platform_reviews')
    .select('user_id, platform, reply_queued_at', { count: 'exact' })
    .eq('reply_status', 'queued')
    .lte('reply_queued_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
    .limit(20)

  // 4-B) 스탬프 → /customers 고객 자동 등록 실패 (24h) — 예전에는 catch 로 조용히 사라졌다
  //   reason 별 건수만 집계 (전화번호 · 사장님 ID 는 이벤트에 남기지 않음)
  const { data: crmSyncFails, count: crmSyncFailCount, error: crmSyncError } = await svc
    .from('stamp_events')
    .select('meta', { count: 'exact' })
    .eq('event_type', 'crm_sync_failed')
    .gte('created_at', since24h)
    .limit(200)
  const crmSyncReasons: Record<string, number> = {}
  for (const r of (crmSyncFails || [])) {
    const reason = String((r.meta as { reason?: unknown } | null)?.reason || 'unknown')
    crmSyncReasons[reason] = (crmSyncReasons[reason] || 0) + 1
  }

  // 5) 플랫폼별 사용자 카운트
  const { data: platformStats } = await svc
    .from('platform_credentials')
    .select('platform, last_login_status')

  const platformCounts: Record<string, { total: number; success: number; failed: number; disabled: number; never: number }> = {}
  for (const p of (platformStats || [])) {
    const plat = p.platform
    if (!platformCounts[plat]) platformCounts[plat] = { total: 0, success: 0, failed: 0, disabled: 0, never: 0 }
    platformCounts[plat].total++
    const status = String(p.last_login_status || '')
    // markLoginStatus 는 'success' / 'success:note' / 'failed:note' / 'credentials_invalid:note' 등 형식 저장
    if (status.startsWith('success')) platformCounts[plat].success++
    else if (status.startsWith('disabled') || status === 'not_connected') platformCounts[plat].disabled++
    else if (status) platformCounts[plat].failed++  // 비어있지 않으면 실패 계열
    else platformCounts[plat].never++
  }

  // 6) 연동 · 수집 상태 — 매장 × 매체마다 로그인 상태와 마지막 리뷰 수집 시각을 나란히 본다.
  //    '로그인 성공'만으로는 수집이 되는지 알 수 없다(2026-07-31 이후 배민 · 요기요가 성공 기록만 남기고 0건 수집).
  const PLATFORM_ALIAS: Record<string, string> = { kakao: 'kakao_map' }
  const since7d = new Date(Date.now() - 7 * 86400 * 1000).toISOString()
  const [{ data: connRows }, { data: storeRows }] = await Promise.all([
    svc.from('platform_credentials').select('user_id, platform, platform_store_name, last_login_status, last_login_at').limit(300),
    svc.from('stores').select('user_id, name').limit(1000),
  ])
  // 매장 × 매체마다 최신 1건 + 7일 건수 (전체를 한 번에 받으면 1000행 상한에 잘린다)
  const lastCollected = new Map<string, { at: string; n7d: number }>()
  await Promise.all(((connRows || []) as Array<{ user_id: string; platform: string }>).map(async c => {
    const plat = PLATFORM_ALIAS[c.platform] || c.platform
    const [latest, recent] = await Promise.all([
      svc.from('platform_reviews').select('collected_at').eq('user_id', c.user_id).eq('platform', plat).order('collected_at', { ascending: false }).limit(1).maybeSingle(),
      svc.from('platform_reviews').select('id', { count: 'exact', head: true }).eq('user_id', c.user_id).eq('platform', plat).gte('collected_at', since7d),
    ])
    const at = (latest.data as { collected_at?: string } | null)?.collected_at
    if (at) lastCollected.set(`${c.user_id}|${plat}`, { at, n7d: recent.count || 0 })
  }))
  const storeName = new Map((storeRows || []).map((s: { user_id: string; name: string | null }) => [s.user_id, s.name || '']))
  const collectionHealth = ((connRows || []) as Array<{ user_id: string; platform: string; platform_store_name: string | null; last_login_status: string | null; last_login_at: string | null }>)
    .filter(c => c.platform !== 'threads' && c.platform !== 'instagram' && c.platform !== 'youtube')
    .map(c => {
      const lc = lastCollected.get(`${c.user_id}|${PLATFORM_ALIAS[c.platform] || c.platform}`)
      const loginOk = String(c.last_login_status || '').startsWith('success')
      const days = lc ? Math.floor((Date.now() - Date.parse(lc.at)) / 86400000) : null
      // 판정 문구만 쓴다(점수 없음). 새 리뷰가 실제로 없는 매장도 '3일 넘게 없음'으로 보일 수 있다.
      const state = !lc ? (loginOk ? '로그인 성공 · 수집 기록 없음 (의심)' : '수집 기록 없음')
        : days! > 3 ? (loginOk ? `로그인 성공 · ${days}일째 새 리뷰 없음` : `${days}일째 새 리뷰 없음`)
        : '정상'
      return {
        store: storeName.get(c.user_id) || c.platform_store_name || c.user_id.slice(0, 8),
        platform: c.platform,
        login_status: c.last_login_status || '기록 없음',
        last_login_at: c.last_login_at,
        last_collected_at: lc?.at || null,
        collected_7d: lc?.n7d || 0,
        state,
        ok: state === '정상',
      }
    })
    .sort((a, b) => Number(a.ok) - Number(b.ok) || a.store.localeCompare(b.store))

  // failed creds 사용자별 그룹화 (UI 친화)
  const credsByUser: Record<string, any[]> = {}
  for (const c of (failedCreds || [])) {
    const u = c.user_id
    if (!credsByUser[u]) credsByUser[u] = []
    credsByUser[u].push({
      platform: c.platform,
      status: c.last_login_status,
      error: String(c.last_error_message || '').slice(0, 150),
      last_login_at: c.last_login_at,
      store: c.platform_store_name,
    })
  }

  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    summary: {
      failed_credentials_count: failedCreds?.length || 0,
      null_place_id_count: nullPlaceId?.length || 0,
      failed_replies_24h: failedReplyCount || 0,
      stuck_queued_count: stuckCount || 0,
      crm_sync_failed_24h: crmSyncError ? null : (crmSyncFailCount || 0),
    },
    crm_sync_failed_reasons: crmSyncReasons,
    collection_health: collectionHealth,
    platform_counts: platformCounts,
    failed_replies_pattern: failedReplyPatterns,
    failed_credentials_users: Object.entries(credsByUser).slice(0, 20).map(([uid, list]) => ({
      user_id: uid.slice(0, 12) + '...',
      issues: list,
    })),
    null_place_id_users: (nullPlaceId || []).map(r => ({
      user_id: r.user_id.slice(0, 12) + '...',
      platform: r.platform,
    })),
    stuck_queued_sample: (stuckQueued || []).slice(0, 10).map(r => ({
      user_id: r.user_id.slice(0, 12) + '...',
      platform: r.platform,
      queued_at: r.reply_queued_at,
    })),
    triggered_by: admin.email,
    hint: '문제 발견 시: 자격증명 오류 → 사용자에게 재연결 안내. 누락 place_id → sync-naver-store-ids. stuck queued → admin/queue-control 의 4번 액션. crm_sync_failed (owner_key_uuid) → supabase/migrations/20261023_crm_owner_key_text.sql 실행 필요.',
  })
}
