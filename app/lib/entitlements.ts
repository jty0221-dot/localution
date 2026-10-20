"use client"
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ModuleId } from './modules'
import { getModule, MODULES } from './modules'
import { entitlementFailureMessage, type VerifiedEntitlement } from './entitlement-policy'
export type Entitlement = VerifiedEntitlement
// Synchronous callers have no authenticated response context and must fail closed.
export function getActiveModuleIds(): ModuleId[] { return [] }
export function hasEntitlement(_moduleId: ModuleId): boolean { return false }
export interface UseEntitlementsResult {
 active: ModuleId[]; loading: boolean; error: string | null; verified: boolean
 has: (id: ModuleId) => boolean; hasAll: (ids: ModuleId[]) => boolean; hasAny: (ids: ModuleId[]) => boolean
 entitlements: Entitlement[]
}
export function useEntitlements(): UseEntitlementsResult {
 const [state, setState] = useState<{ entitlements: Entitlement[]; loading: boolean; verified: boolean; error: string | null }>({ entitlements: [], loading: true, verified: false, error: null })
 const generation = useRef(0)
 useEffect(() => {
 let controller: AbortController | null = null
 let disposed = false
 async function refresh(clear = true) {
 const sequence = ++generation.current
 controller?.abort(); controller = new AbortController()
 const requestController = controller
 const timeout = window.setTimeout(() => requestController.abort(), 15000)
 if (clear) setState({ entitlements: [], loading: true, verified: false, error: null })
 try {
 const res = await fetch('/api/entitlements', { credentials: 'include', cache: 'no-store', signal: controller.signal })
 const data = await res.json()
 if (disposed || sequence !== generation.current) return
 if (!res.ok || !data.ok || typeof data.userId !== 'string' || !Array.isArray(data.entitlements)) throw new Error(data.code === 'identity_mapping_required' ? 'identity_mapping_required' : 'unverified')
 const allowed = new Set<string>(MODULES.map(m => m.id))
 const entitlements = data.entitlements.filter((e: Entitlement) => allowed.has(e.moduleId) && ['active', 'past_due'].includes(e.status) && Date.parse(e.renewsAt) > Date.now())
 setState({ entitlements, loading: false, verified: true, error: null })
 } catch (error) {
 if (disposed || sequence !== generation.current) return
 setState({ entitlements: [], loading: false, verified: false, error: entitlementFailureMessage(error instanceof Error ? error.message : undefined) })
 } finally { window.clearTimeout(timeout) }
 }
 function visibility() { if (document.visibilityState === 'visible') void refresh(false); else { ++generation.current; controller?.abort() } }
 void refresh()
 const invalidate = () => { void refresh(true) }
 const recheck = () => { void refresh(false) }
 window.addEventListener('focus', recheck)
 window.addEventListener('localution:auth-changed', invalidate)
 window.addEventListener('storage', invalidate)
 document.addEventListener('visibilitychange', visibility)
 const timer = window.setInterval(() => { void refresh(false) }, 30000)
 return () => { disposed = true; ++generation.current; controller?.abort(); clearInterval(timer); window.removeEventListener('focus', recheck); window.removeEventListener('localution:auth-changed', invalidate); window.removeEventListener('storage', invalidate); document.removeEventListener('visibilitychange', visibility) }
 }, [])
 const active = state.verified ? state.entitlements.filter(e => Date.parse(e.renewsAt) > Date.now()).map(e => e.moduleId) : []
 const has = useCallback((id: ModuleId) => active.includes(id), [active])
 const hasAll = useCallback((ids: ModuleId[]) => ids.every(has), [has])
 const hasAny = useCallback((ids: ModuleId[]) => ids.some(has), [has])
 return { ...state, active, has, hasAll, hasAny }
}
export function useModuleWithStatus(moduleId: ModuleId) {
 const { has, entitlements, loading } = useEntitlements()
 return { module: getModule(moduleId), entitlement: entitlements.find(e => e.moduleId === moduleId), hasAccess: has(moduleId), loading }
}
