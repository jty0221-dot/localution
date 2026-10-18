/**
 * GatedRoute — 페이지 전체 또는 컴포넌트를 엔타이틀먼트로 감싸는 가드
 *
 * 사용법:
 * // 페이지 전체 보호
 * <GatedRoute moduleId="ai-review">
 * <ReviewAdminPage />
 * </GatedRoute>
 *
 * // 여러 모듈 중 하나라도 필요
 * <GatedRoute moduleIds={['keyword', 'competitor']} mode="any">
 * ...
 * </GatedRoute>
 */

'use client'

import { useEntitlements } from '../lib/entitlements'
import type { ModuleId } from '../lib/modules'
import LockedBanner from './LockedBanner'

interface GatedRouteProps {
 moduleId?: ModuleId
 moduleIds?: ModuleId[]
 mode?: 'all' | 'any'
 /** 잠금 시 배너 대신 커스텀 UI */
 fallback?: React.ReactNode
 /** 로딩 중 표시 */
 loadingFallback?: React.ReactNode
 children: React.ReactNode
}

export default function GatedRoute({
 moduleId,
 moduleIds,
 mode = 'any',
 fallback,
 loadingFallback,
 children,
}: GatedRouteProps) {
 const { has, hasAll, hasAny, loading, error } = useEntitlements()

 if (loading) {
 return (
 <>
 {loadingFallback ?? (
 <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>
 권한 확인 중...
 </div>
 )}
 </>
 )
 }

 const ids = moduleId ? [moduleId] : moduleIds ?? []
 if (ids.length === 0) {
 // 모듈 지정 없음 = 그냥 통과
 return <>{children}</>
 }

 if (error) {
 return (
 <div role="alert" className="rounded-[10px] border border-[var(--lu-line)] bg-white p-6 text-sm text-[var(--lu-ink)]">
 <p>{error}</p>
 <p className="mt-2 text-[var(--lu-muted)]">로그인 상태와 연결을 확인한 후 다시 조회해주세요.</p>
 <button type="button" onClick={() => window.dispatchEvent(new Event('localution:auth-changed'))}
 className="mt-4 min-h-11 rounded-[6px] bg-[var(--lu-accent)] px-4 text-white">권한 다시 확인</button>
 </div>
 )
 }
 const allowed = mode === 'all' ? hasAll(ids) : hasAny(ids)

 if (allowed) {
 return <>{children}</>
 }

 // 잠금 상태
 if (fallback) return <>{fallback}</>

 return <LockedBanner moduleId={ids[0]} additionalIds={ids.slice(1)} />
}

