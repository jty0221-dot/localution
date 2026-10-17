export type SourceState = 'read' | 'unconfirmed'
export type AccountPlatform = {
  platform: string; label: string; connected: boolean; platform_store_name?: string | null
  review_count?: number; unreplied_count?: number; latest_collected_at?: string | null
}
export type StoreSnapshot = {
  user_id: string; store: { name?: string | null; address?: string | null; phone?: string | null; category?: string | null } | null
  platforms: AccountPlatform[]; source_states?: { credentials?: string; store?: string; reviews?: string }
}
export type IssueSnapshot = { user_id?: string; source_state?: string; issues: { platform: string; status: string; store_name?: string | null }[] }
export type PlatformOverview = { id: string; label: string; storeName: string; status: string; detail: string; collectedAt: string | null; href: string; action: string; priority: number }
export function validCollectionDate(value: unknown, now: number): string | null {
  if (typeof value !== 'string') return null
  const date = Date.parse(value)
  return Number.isFinite(date) && date <= now ? new Date(date).toISOString() : null
}
export function buildManagementOverview(store: StoreSnapshot, issues: IssueSnapshot | null, now = Date.now()) {
  const reviewsRead = store.source_states?.reviews === 'read'
  const credentialsRead = store.source_states?.credentials === 'read'
  const issuesRead = issues?.source_state === 'read' && issues.user_id === store.user_id
  const platforms: PlatformOverview[] = store.platforms.map(p => {
    const issue = issuesRead ? issues?.issues.find(i => i.platform === p.platform) : null
    const collectedAt = reviewsRead ? validCollectionDate(p.latest_collected_at, now) : null
    const href = `/my/platforms/${encodeURIComponent(p.platform)}/connect`
    const base = { id: p.platform, label: p.label, storeName: p.platform_store_name || '연결 대상 미확인', collectedAt, href, action: '연결 확인하기' }
    if (issue) return { ...base, status: issue.status === 'no_store_id' ? '매장 등록 필요' : '연결 재확인 필요', detail: '계정 연결 기록에서 문제가 확인됐어요. 연결 화면에서 대상과 권한을 확인해보세요.', priority: 0 }
    if (!credentialsRead || !issuesRead) return { ...base, status: '연결 상태 미확인', detail: '연결 점검 자료를 모두 읽지 못했어요. 저장된 리뷰가 있어도 현재 접근 권한은 확인이 필요해요.', priority: 1 }
    if (!reviewsRead) return { ...base, status: '리뷰 조회 미확인', detail: '저장 리뷰를 읽지 못했어요. 연결 설정 유무와 관계없이 다시 확인해보세요.', priority: 1 }
    if (!p.connected) return { ...base, status: '연결 자료 없음', detail: '이 계정의 자격증명 연결 자료와 저장 리뷰가 확인되지 않아요. 플레이스 등록 여부는 연결 화면에서 확인해보세요.', priority: 3 }
    if (!collectedAt) return { ...base, status: '수집 기록 미확인', detail: p.review_count === 0 ? '계정에 저장된 리뷰는 0건이에요. 외부 매체의 리뷰 수와 수집 성공 여부는 미확인이에요.' : '저장 리뷰의 수집 시각이 확인되지 않아요. 현재 외부 매체의 수집 성공 여부는 미확인이에요.', href: '/reviews', action: '리뷰 확인하기', priority: 2 }
    const stale = now - Date.parse(collectedAt) > 7 * 86400000
    const pending = typeof p.unreplied_count === 'number' && Number.isInteger(p.unreplied_count) && p.unreplied_count >= 0 ? p.unreplied_count : null
    return { ...base, status: stale ? '수집 기록 오래됨' : '저장 자료 확인', detail: `${pending === null ? '미답글 수는 미확인이에요.' : `계정 저장 리뷰 중 미답글 ${pending}건이에요.`} 현재 매체의 발행 상태는 리뷰 화면에서 확인해보세요.`, href: '/reviews', action: '리뷰 확인하기', priority: stale || (pending ?? 0) > 0 ? 2 : 4 }
  })
  const missing = store.source_states?.store === 'read' && store.store ? (['address', 'phone', 'category'] as const).filter(k => !store.store?.[k]?.trim()) : null
  return { platforms, priorities: platforms.filter(p => p.priority < 3).sort((a, b) => a.priority - b.priority), missing, checkedPlatforms: platforms.filter(p => p.collectedAt !== null).length }
}
