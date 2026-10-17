'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ModuleId } from './modules'
import { getModule } from './modules'

export interface Entitlement { moduleId: ModuleId; startedAt: string; renewsAt: string; status: 'active' | 'paused' | 'cancelled' }
const UNVERIFIED = '구독 권한 조회 연결을 확인해야 해요. 결제수단 등록만으로 모듈 이용 권한이 활성화되지는 않아요.'
// No user-scoped subscription endpoint is available. Unverified grants fail closed.
// Browser storage and development flags must never issue product entitlements.
export function getActiveModuleIds(): ModuleId[] { return [] }
export function hasEntitlement(_moduleId: ModuleId): boolean { return false }
export interface UseEntitlementsResult {
 active: ModuleId[]; loading: boolean; error: string | null; verified: boolean
 has: (id: ModuleId) => boolean; hasAll: (ids: ModuleId[]) => boolean; hasAny: (ids: ModuleId[]) => boolean
 entitlements: Entitlement[]
}
export function useEntitlements(): UseEntitlementsResult {
 const [loading, setLoading] = useState(true)
 useEffect(() => {
 // Remove previously issued client-only flags without trusting or migrating them.
 try { localStorage.removeItem('localution_entitlements') } catch {}
 setLoading(false)
 }, [])
 const has = useCallback((_id: ModuleId) => false, [])
 const hasAll = useCallback((ids: ModuleId[]) => ids.length === 0, [])
 const hasAny = useCallback((_ids: ModuleId[]) => false, [])
 return { active: [], loading, error: loading ? null : UNVERIFIED, verified: false, has, hasAll, hasAny, entitlements: [] }
}
export function useModuleWithStatus(moduleId: ModuleId) {
 const { has, entitlements, loading } = useEntitlements()
 return { module: getModule(moduleId), entitlement: entitlements.find(e => e.moduleId === moduleId), hasAccess: has(moduleId), loading }
}
