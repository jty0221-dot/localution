import { NextRequest, NextResponse } from 'next/server'
import { lookupPlace, PlaceLookupError } from '@/app/lib/naver-place'
import { requireUser } from '@/app/lib/userAuth'
import { rateLimitByIp } from '@/app/lib/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
 // 인증 + rate limit (네이버 외부 호출 보호)
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: '로그인이 필요합니다' }, { status: auth.status })
 const rl = rateLimitByIp(req, `place-lookup:${auth.userId}`, 30, 60)
 if (!rl.ok) {
 return NextResponse.json({ ok: false, error: 'rate_limited', message: `${rl.resetIn}초 후 다시 시도해주세요.` }, { status: 429 })
 }

 const id = req.nextUrl.searchParams.get('id')
 const hintCategory = req.nextUrl.searchParams.get('category')

 if (!id || !/^\d+$/.test(id)) {
 return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 })
 }

 let info
 try { info = await lookupPlace(id, hintCategory) } catch (e) {
 const code = e instanceof PlaceLookupError ? e.code : 'network'
 return NextResponse.json({ ok: false, code, error: 'upstream_unavailable', message: '네이버 조회가 제한되거나 응답하지 못했어요. 매장 정보와 연결 상태를 유지하고 잠시 후 다시 확인해보세요.' }, { status: e instanceof PlaceLookupError ? e.status : 502 })
 }
 if (!info) {
 return NextResponse.json(
 { ok: false, error: 'not_found', message: '네이버 플레이스에서 해당 ID를 찾지 못했습니다. 비공개 업체이거나 ID가 잘못됐을 수 있어요.' },
 { status: 404 },
 )
 }

 return NextResponse.json({ ok: true, info })
}
