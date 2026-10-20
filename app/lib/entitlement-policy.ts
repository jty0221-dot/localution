import { MODULES, type ModuleId } from './modules'
export interface VerifiedEntitlement { moduleId: ModuleId; startedAt: string; renewsAt: string; status: 'active' | 'past_due' }
export function selectEntitlements(rows: unknown[], userId: string, now = Date.now()): VerifiedEntitlement[] {
 const allowed = new Set<string>(MODULES.map(m => m.id))
 return rows.flatMap((value: any) => {
 if (!value || value.user_id !== userId || !allowed.has(value.module_id) || !['active', 'past_due'].includes(value.status)) return []
 if (!Number.isFinite(Date.parse(value.current_period_end)) || Date.parse(value.current_period_end) <= now) return []
 return [{ moduleId: value.module_id as ModuleId, startedAt: value.started_at, renewsAt: value.current_period_end, status: value.status as 'active' | 'past_due' }]
 })
}

// Subscription ownership is an auth.users UUID, never an OAuth provider identifier.
export function isSubscriptionUserId(value: string): boolean {
 return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}
export function entitlementFailureMessage(code: unknown): string {
 if (code === 'identity_mapping_required') return '로그인 계정과 구독 회원의 연결 확인이 필요해요. 고객지원에 로그인 방식과 구독 내역 확인을 요청해주세요. 확인 전에는 추가 결제하지 마세요.'
 return '구독 권한을 확인하지 못했어요. 잠시 후 다시 확인해주세요.'
}
