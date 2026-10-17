import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/yogiyo-reviews?storeId=...&token=...
 * 요기요 리뷰 목록 조회
 *
 * 요기요는 공개 API 없음 → 파트너 계약 후 개별 발급
 * 파트너 문의: partner@yogiyo.co.kr
 */
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
 const { searchParams } = req.nextUrl
 const storeId = searchParams.get('storeId') || process.env.YOGIYO_STORE_ID || ''
 const token = searchParams.get('token') || process.env.YOGIYO_API_KEY || ''
 const isTest = searchParams.get('test') === 'true'

 if (!storeId) {
 return NextResponse.json({ error: 'storeId 파라미터 필요' }, { status: 400 })
 }

 if (isTest) {
 const configured = Boolean(process.env.YOGIYO_API_KEY)
 if (!configured) {
 return NextResponse.json({ ok: false, code: 'not_configured', error: '요기요 연동 설정이 준비되지 않았습니다.', verified: false }, { status: 503 })
 }
 return NextResponse.json({ configured: true, verified: false, status: 'verification_required', message: '설정은 있으나 실제 조회로 연결 상태를 확인해야 합니다.' })
 }

 // ── API Key 없으면 데모 데이터 ──
 if (!token) {
 return NextResponse.json({ ok: false, code: 'not_configured', error: '요기요 리뷰 조회 연결이 준비되지 않았습니다.' }, { status: 503 })
 }

 // ── 실제 요기요 파트너 API 호출 ──
 try {
 const res = await fetch(`https://partner-api.yogiyo.co.kr/api/v1/restaurants/${storeId}/reviews?page=1&size=50`, {
 headers: {
 'Authorization': `Bearer ${token}`,
 'X-Partner-Token': token,
 'Content-Type': 'application/json',
 },
 })
 if (!res.ok) {
 const err = await res.text()
 return NextResponse.json({ error: `요기요 API 오류 (${res.status}): ${err}` }, { status: 502 })
 }
 const data = await res.json()
 const rawReviews = data.reviews ?? data.data
 if (!Array.isArray(rawReviews)) return NextResponse.json({ code: 'upstream_failed', error: '요기요 리뷰 응답 형식을 확인할 수 없습니다.' }, { status: 502 })
 const reviews = rawReviews.map((r: any) => ({
 id: r.reviewId || r.id,
 rating: r.starRating || r.rating,
 author: r.author || r.nickName || '손님',
 date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('ko-KR') : '',
 text: r.content || '',
 menuItems: r.menuNames || [],
 replied: !!(r.reply || r.replyContent),
 replyText: r.reply || r.replyContent || '',
 }))
 return NextResponse.json({ reviews })
 } catch (e: any) {
 return NextResponse.json({ code: 'upstream_failed', error: '리뷰 공급자에 연결하지 못했습니다.' }, { status: 502 })
 }
}
