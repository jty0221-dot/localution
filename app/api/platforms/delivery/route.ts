import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * 배달 플랫폼 연동 API
 * 배달의민족 / 요기요 / 쿠팡이츠는 공개 API 없음
 * → 사장님 계정 ID + 매장 ID 입력 방식으로 연결 정보만 저장
 * → 추후 Selenium 기반 자동 리뷰 수집으로 확장 예정
 *
 * POST /api/platforms/delivery
 * { platform: 'baemin' | 'yogiyo' | 'coupangeats', action: 'save' | 'reviews', ... }
 */

type DeliveryPlatform = 'baemin' | 'yogiyo' | 'coupangeats'

const PLATFORM_META: Record<DeliveryPlatform, { name: string; storeUrl: (id: string) => string }> = {
 baemin: {
 name: '배달의민족',
 storeUrl: (id) => `https://baemin.me/${id}`,
 },
 yogiyo: {
 name: '요기요',
 storeUrl: (id) => `https://www.yogiyo.co.kr/restaurant/${id}/`,
 },
 coupangeats: {
 name: '쿠팡이츠',
 storeUrl: (id) => `https://store.coupangeats.com/store/${id}`,
 },
}

// ── 배달의민족 사장님 광장 URL → 매장 ID 추출 ────────────────
function extractDeliveryId(platform: DeliveryPlatform, input: string): string | null {
 const s = input.trim()
 if (!s) return null

 // 숫자/영문 슬러그 ID 직접 입력
 if (/^[a-zA-Z0-9_-]{3,}$/.test(s)) return s

 if (platform === 'baemin') {
 const m = s.match(/baemin\.me\/([a-zA-Z0-9_-]+)/) ||
 s.match(/baemin\.com\/store\/([a-zA-Z0-9_-]+)/)
 return m?.[1] || null
 }
 if (platform === 'yogiyo') {
 const m = s.match(/yogiyo\.co\.kr\/restaurant\/(\d+)/) ||
 s.match(/restaurant\/(\d+)/)
 return m?.[1] || null
 }
 if (platform === 'coupangeats') {
 const m = s.match(/coupangeats\.com\/store\/([a-zA-Z0-9_-]+)/) ||
 s.match(/store\/([a-zA-Z0-9_-]+)/)
 return m?.[1] || null
 }
 return null
}

// ── POST /api/platforms/delivery ─────────────────────────────
export async function POST(req: NextRequest) {
 try {
 const body = await req.json()
 const { platform, action, input, storeId } = body

 if (!platform || !PLATFORM_META[platform as DeliveryPlatform]) {
 return NextResponse.json({ error: '유효하지 않은 플랫폼' }, { status: 400 })
 }
 const p = platform as DeliveryPlatform
 const meta = PLATFORM_META[p]

 // 1) ID 추출 + 검증
 if (action === 'verify') {
 const externalId = extractDeliveryId(p, input || '')
 if (!externalId) {
 return NextResponse.json({
 error: `유효한 ${meta.name} 매장 URL 또는 ID가 아닙니다`,
 }, { status: 400 })
 }
 return NextResponse.json({
 platform: p,
 externalId,
 name: `${meta.name} 매장 (${externalId})`,
 url: meta.storeUrl(externalId),
 verified: false,
 inputValidated: true,
 code: 'not_configured',
 error: '주소 형식만 확인했습니다. 실제 플랫폼 연결 검증이 준비되지 않았습니다.',
 }, { status: 503 })
 }

 return NextResponse.json({ error: 'unknown action' }, { status: 400 })
 } catch (err) {
 console.error('delivery platform error:', err)
 return NextResponse.json({ error: '서버 오류' }, { status: 500 })
 }
}

// ── GET /api/platforms/delivery?platform=baemin&storeId=xxx ──
export async function GET(req: NextRequest) {
 const platform = req.nextUrl.searchParams.get('platform') as DeliveryPlatform
 const storeId = req.nextUrl.searchParams.get('storeId')

 if (!platform || !storeId) {
 return NextResponse.json({ error: 'platform, storeId 필요' }, { status: 400 })
 }
 if (!PLATFORM_META[platform]) {
 return NextResponse.json({ error: '유효하지 않은 플랫폼' }, { status: 400 })
 }

 return NextResponse.json({
 platform,
 storeId,
 code: 'not_configured',
 error: '배달 플랫폼 리뷰 수집 연결이 준비되지 않았습니다.',
 }, { status: 503 })
}
