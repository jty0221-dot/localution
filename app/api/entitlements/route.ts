import { NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { selectEntitlements, entitlementFailureMessage } from '@/app/lib/entitlement-policy'
import { resolveVerifiedIdentity } from '@/app/lib/verified-identity'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie, Authorization' }
export async function GET() {
 try {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, entitlements: [] }, { status: auth.status, headers })
 const identity = await resolveVerifiedIdentity(auth)
 if (!identity.ok) return NextResponse.json({
 ok: false, entitlements: [], code: identity.code === 'identity_mapping_required' ? 'identity_mapping_required' : 'subscription_read_failed',
 error: identity.code === 'identity_mapping_required' ? entitlementFailureMessage('identity_mapping_required') : identity.error,
 user_action: '고객지원에 현재 로그인 방식과 기존 구독 내역 확인을 요청해주세요. 운영자가 인증된 계정 소유 관계를 확인하고 구독 회원 연결을 복구해야 합니다. 추가 결제로 해결하지 마세요.',
 }, { status: identity.status, headers })
 const { data, error } = await createServiceClient().from('subscriptions')
 .select('user_id,module_id,status,started_at,current_period_end')
 .eq('user_id', identity.userId).in('status', ['active', 'past_due'])
 .gt('current_period_end', new Date().toISOString())
 if (error) throw new Error('subscription read failed')
 return NextResponse.json({ ok: true, userId: identity.userId, entitlements: selectEntitlements(data || [], identity.userId) }, { headers })
 } catch {
 return NextResponse.json({ ok: false, entitlements: [], code: 'subscription_read_failed', error: entitlementFailureMessage('subscription_read_failed') }, { status: 503, headers })
 }
}
