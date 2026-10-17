import { NextRequest, NextResponse } from 'next/server'

// HTML 태그 제거 (네이버 API가 <b>강조</b> 태그를 포함해서 반환함)
function stripHtml(str: string) {
 return str.replace(/<[^>]*>/g, '').trim()
}

// 네이버 플레이스 URL에서 검색 키워드 추출
function extractQueryFromUrl(input: string): string {
 try {
 // naver.me 단축 URL → 매장명을 직접 검색
 if (input.includes('naver.me') || input.includes('place.naver.com') || input.includes('map.naver.com')) {
 // URL에서 검색 가능한 텍스트 추출
 const decoded = decodeURIComponent(input)
 const match = decoded.match(/search\/([^/\?&]+)/)
 if (match) return match[1]
 // place URL에서 place ID 추출 (향후 Place API 연동 시 사용)
 const placeMatch = decoded.match(/place\/(\d+)/)
 if (placeMatch) return placeMatch[1]
 return decoded // 파싱 실패 시 원본 반환
 }
 return input
 } catch {
 return input
 }
}

export async function GET(req: NextRequest) {
 const { searchParams } = new URL(req.url)
 const rawQuery = searchParams.get('query') || ''

 if (!rawQuery.trim()) {
 return NextResponse.json({ error: '검색어를 입력해주세요' }, { status: 400 })
 }

 // 환경변수 체크
 const clientId = process.env.NAVER_CLIENT_ID
 const clientSecret = process.env.NAVER_CLIENT_SECRET

 if (!clientId || !clientSecret) {
 return NextResponse.json({ code: 'not_configured', error: '네이버 검색 연결이 준비되지 않았습니다.' }, { status: 503 })
 }

 // 네이버 지역검색 API 호출
 const query = extractQueryFromUrl(rawQuery)
 const naverUrl = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5&sort=random`

 try {
 const res = await fetch(naverUrl, {
 headers: {
 'X-Naver-Client-Id': clientId,
 'X-Naver-Client-Secret': clientSecret,
 },
 // Next.js 캐시 비활성화 (항상 최신 결과)
 cache: 'no-store',
 })

 if (!res.ok) {
 const errText = await res.text()
 console.error('[Naver API Error]', res.status, errText)
 return NextResponse.json(
 { error: `네이버 API 오류 (${res.status}): API 키를 확인해주세요` },
 { status: 502 }
 )
 }

 const data = await res.json()
 if (!Array.isArray(data.items)) return NextResponse.json({ code: 'upstream_failed', error: '네이버 검색 응답 형식을 확인할 수 없습니다.' }, { status: 502 })

 // HTML 태그 제거 후 반환
 const items = data.items.map((item: Record<string, string>) => ({
 ...item,
 title: stripHtml(item.title),
 category: stripHtml(item.category),
 }))

 return NextResponse.json({
 total: data.total,
 items,
 })
 } catch (err) {
 console.error('[Naver API Fetch Error]', err)
 return NextResponse.json(
 { error: '네이버 API 연결에 실패했습니다' },
 { status: 502 }
 )
 }
}
