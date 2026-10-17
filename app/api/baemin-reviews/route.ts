import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/baemin-reviews?storeId=...&token=...
 * 배달의민족 리뷰 목록 조회
 *
 * 필요 환경변수 (Vercel에 등록):
 * BAEMIN_CLIENT_ID — 배민 개발자 포털 클라이언트 ID
 * BAEMIN_CLIENT_SECRET — 배민 개발자 포털 클라이언트 Secret
 *
 * 또는 URL 파라미터로 직접 전달:
 * ?storeId={storeId}&token={bearerToken}
 */
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
 const { searchParams } = req.nextUrl
 const storeId = searchParams.get('storeId') || process.env.BAEMIN_STORE_ID || ''
 const token = searchParams.get('token') || ''
 const isTest = searchParams.get('test') === 'true'
 const clientId = process.env.BAEMIN_CLIENT_ID || ''
 const clientSec = process.env.BAEMIN_CLIENT_SECRET || ''

 if (!storeId) {
 return NextResponse.json({ error: 'storeId 파라미터가 필요합니다' }, { status: 400 })
 }

 // ── 연동 테스트 모드 ──
 if (isTest) {
 const configured = Boolean(clientId && clientSec)
 if (!configured) {
 return NextResponse.json({ ok: false, code: 'not_configured', error: '배민 연동 설정이 준비되지 않았습니다.', verified: false }, { status: 503 })
 }
 return NextResponse.json({ configured: true, verified: false, status: 'verification_required', message: '설정은 있으나 실제 조회로 연결 상태를 확인해야 합니다.' })
 }

 // ── OAuth 토큰 취득 (환경변수 방식) ──
 let bearerToken = token
 if (!bearerToken && clientId && clientSec) {
 try {
 const tokenRes = await fetch('https://auth.baemin.com/oauth/token', {
 method: 'POST',
 headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
 body: new URLSearchParams({
 grant_type: 'client_credentials',
 client_id: clientId,
 client_secret: clientSec,
 scope: 'review',
 }),
 })
 const tokenData = await tokenRes.json()
 if (!tokenData.access_token) throw new Error('토큰 취득 실패')
 bearerToken = tokenData.access_token
 } catch (e: any) {
 return NextResponse.json({ error: '배민 OAuth 토큰 취득 실패: ' + e.message }, { status: 502 })
 }
 }

 if (!bearerToken) {
 return NextResponse.json({ ok: false, code: 'not_configured', error: '배민 리뷰 조회 연결이 준비되지 않았습니다.' }, { status: 503 })
 }

 // ── 실제 배민 API 호출 ──
 try {
 const res = await fetch(`https://api.baemin.com/api/v1/stores/${storeId}/reviews?page=0&size=50`, {
 headers: {
 'Authorization': `Bearer ${bearerToken}`,
 'Content-Type': 'application/json',
 },
 })
 if (!res.ok) {
 const errBody = await res.text()
 return NextResponse.json({ error: `배민 API 오류 (${res.status}): ${errBody}` }, { status: 502 })
 }
 const data = await res.json()
 const rawReviews = data.content ?? data.reviews
 if (!Array.isArray(rawReviews)) return NextResponse.json({ code: 'upstream_failed', error: '배민 리뷰 응답 형식을 확인할 수 없습니다.' }, { status: 502 })
 const reviews = rawReviews.map((r: any) => ({
 id: r.reviewId || r.id,
 rating: r.starRating || r.rating,
 author: r.writerNickname || r.author || '손님',
 date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('ko-KR') : '',
 text: r.content || r.text || '',
 menuItems: r.orderMenuNames || [],
 replied: !!(r.replyContent || r.replyText),
 replyText: r.replyContent || r.replyText || '',
 }))
 return NextResponse.json({ reviews })
 } catch (e: any) {
 return NextResponse.json({ code: 'upstream_failed', error: '리뷰 공급자에 연결하지 못했습니다.' }, { status: 502 })
 }
}
