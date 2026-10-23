import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { rateLimit } from '@/app/lib/rate-limit'
import { naverSearchRequest, naverSearchErrorCode } from '@/app/lib/naverOpenApi'

export const dynamic = 'force-dynamic'

// GET /api/marketing/blog-top5?keyword=부천맛집
//   · LU-018: 로그인 사용자만 · 사용자당 1분 20회 · 1일 300회 (네이버 검색 API 일 할당량 보호)
//   · 네이버 호출은 공용 naverSearchRequest (NCP · 개발자센터 키 쌍 선택) 를 쓴다
export async function GET(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) {
 return NextResponse.json(
 { error: auth.status === 401 ? '로그인하면 쓸 수 있어요.' : auth.message, code: auth.status === 401 ? 'login_required' : 'auth_error' },
 { status: auth.status },
 )
 }

 const { searchParams } = new URL(req.url)
 const keyword = (searchParams.get('keyword') || '').trim().slice(0, 100)

 if (!keyword) return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 })

 const perMin = await rateLimit({ bucket: 'blog-top5-min', id: auth.userId, limit: 20, windowSec: 60 })
 const perDay = perMin.ok ? await rateLimit({ bucket: 'blog-top5-day', id: auth.userId, limit: 300, windowSec: 86400 }) : perMin
 if (!perMin.ok || !perDay.ok) {
 const retryAfter = (!perMin.ok ? perMin : perDay).retryAfter
 return NextResponse.json(
 { error: '조회가 너무 많아요. 잠시 후 다시 시도해주세요.', code: 'rate_limited', retryAfter },
 { status: 429, headers: { 'Retry-After': String(retryAfter || 60) } },
 )
 }

 const naver = naverSearchRequest('blog')
 if (!naver) {
 return NextResponse.json({ error: '네이버 검색 API 키가 설정되지 않았어요.' }, { status: 503 })
 }

 const url = `${naver.url}?query=${encodeURIComponent(keyword)}&display=5&sort=sim`

 try {
 const res = await fetch(url, {
 headers: naver.headers,
 next: { revalidate: 300 }, // 5분 캐시
 })
 if (!res.ok) {
 // 공급자 응답 본문은 돌려주지 않는다 (문서화된 오류 코드만)
 const code = await naverSearchErrorCode(res)
 return NextResponse.json({ error: `네이버 API 오류 ${res.status}${code ? ` (${code})` : ''}` }, { status: 502 })
 }
 const data = await res.json()
 // items: [{ title, link, description, bloggername, bloggerlink, postdate }]
 const items = (data.items || []).map((item: Record<string, string>, idx: number) => ({
 rank: idx + 1,
 title: (item.title || '').replace(/<[^>]*>/g, ''),
 link: item.link,
 description: (item.description || '').replace(/<[^>]*>/g, ''),
 bloggername: item.bloggername,
 bloggerlink: item.bloggerlink,
 postdate: item.postdate,
 }))
 return NextResponse.json({ ok: true, keyword, items })
 } catch {
 return NextResponse.json({ error: '서버 오류가 발생했어요.' }, { status: 500 })
 }
}
