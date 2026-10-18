import { NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { selectEntitlements } from '@/app/lib/entitlement-policy'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie, Authorization' }
export async function GET() {
 try {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, entitlements: [] }, { status: auth.status, headers })
 const { data, error } = await createServiceClient().from('subscriptions')
 .select('user_id,module_id,status,started_at,current_period_end')
 .eq('user_id', auth.userId).in('status', ['active', 'past_due'])
 .gt('current_period_end', new Date().toISOString())
 if (error) throw new Error('subscription read failed')
 return NextResponse.json({ ok: true, userId: auth.userId, entitlements: selectEntitlements(data || [], auth.userId) }, { headers })
 } catch {
 return NextResponse.json({ ok: false, entitlements: [], error: '구독 권한을 확인하지 못했어요. 잠시 후 다시 확인해주세요.' }, { status: 503, headers })
 }
}
