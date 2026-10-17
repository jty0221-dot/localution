import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/yogiyo-reply
 * 요기요 리뷰에 사장님 답글 등록
 */
export async function POST(req: NextRequest) {
 const { storeId, token, reviewId, reply } = await req.json()

 if (!storeId || !reviewId || !reply) {
 return NextResponse.json({ ok: false, error: 'storeId, reviewId, reply 필수' }, { status: 400 })
 }

 const apiToken = token || process.env.YOGIYO_API_KEY || ''

 if (!apiToken) {
 return NextResponse.json({ ok: false, code: 'not_configured', error: '요기요 답글 등록 연결이 준비되지 않았습니다.' }, { status: 503 })
 }

 try {
 const res = await fetch(
 `https://partner-api.yogiyo.co.kr/api/v1/restaurants/${storeId}/reviews/${reviewId}/reply`,
 {
 method: 'POST',
 headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
 body: JSON.stringify({ content: reply }),
 }
 )
 if (!res.ok) {
 const err = await res.text()
 return NextResponse.json({ ok: false, error: `요기요 API 오류 (${res.status}): ${err}` }, { status: 502 })
 }
 return NextResponse.json({ ok: true })
 } catch (e: any) {
 return NextResponse.json({ ok: false, error: e.message }, { status: 502 })
 }
}
