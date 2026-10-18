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
