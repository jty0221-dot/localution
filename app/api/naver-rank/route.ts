import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { rateLimitByIp } from '@/app/lib/rateLimit'
import { scanPlaceRank } from '@/app/lib/place-rank'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30
const fail = (status: number, code: string, error: string) => NextResponse.json({ ok: false, rank: null, code, error }, { status, headers: { 'Cache-Control': 'no-store' } })
export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return fail(auth.status, 'login_required', '로그인한 뒤 확인해보세요.')
  const limit = rateLimitByIp(req, `naver-rank:${auth.userId}`, 20, 60)
  if (!limit.ok) return fail(429, 'rate_limited', `${limit.resetIn}초 후 다시 확인해보세요.`)
  const sp = new URL(req.url).searchParams
  const keyword = (sp.get('keyword') || '').trim()
  const placeId = (sp.get('placeId') || '').trim()
  if (!keyword || keyword.length > 80 || /[\u0000-\u001f\u007f]/.test(keyword) || !/^\d{1,30}$/.test(placeId)) return fail(400, 'invalid_input', '검색어 1~80자와 숫자로 된 플레이스 ID를 입력해보세요.')
  const result = await scanPlaceRank({ keyword, placeId, maxRank: 100 })
  if (result.method === 'none') {
    const code = result.errors[0] || 'upstream_failed'
    const error = code === 'upstream_access_denied' ? '네이버가 이 서버의 검색 접근을 제한했어요. 이전 결과를 유지했어요. 네이버 검색 화면에서 직접 확인하거나 잠시 후 다시 시도해보세요.' : code === 'upstream_rate_limited' ? '네이버 검색 요청이 제한됐어요. 잠시 후 다시 확인해보세요.' : code === 'upstream_timeout' ? '네이버 검색 응답 시간이 길어졌어요. 잠시 후 다시 확인해보세요.' : '순서가 확인되는 네이버 검색 자료를 받지 못했어요. 잠시 후 다시 확인해보세요.'
    return fail(code === 'upstream_timeout' ? 504 : code === 'upstream_rate_limited' ? 429 : 502, code, error)
  }
  return NextResponse.json({ ok: true, ...result, keyword, placeId, matchedTitle: result.matchedName, source: 'naver_map_ordered_list', scope: 'returned_map_list', note: '조회한 지도 검색 목록의 순서예요. 위치·기기·광고에 따라 다른 검색 화면의 순서와 다를 수 있어요.' }, { headers: { 'Cache-Control': 'no-store' } })
}
