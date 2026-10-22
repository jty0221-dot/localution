import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { rateLimitByIp } from '@/app/lib/rateLimit'
import { hasNaverOpenApiCredentials, naverSearchRequest, naverSearchDiagnostics, naverSearchErrorCode } from '@/app/lib/naverOpenApi'
import { BUSINESS_INDUSTRIES, BUSINESS_SEARCH_MODES, searchText, safeSearchUrl, type BusinessSearchItem } from '@/app/lib/business-search'

export const dynamic = 'force-dynamic'
const ready = () => ({ naver: { local: hasNaverOpenApiCredentials(), blog: hasNaverOpenApiCredentials(), cafe: hasNaverOpenApiCredentials() }, google: { local: Boolean(process.env.GOOGLE_PLACES_API_KEY), blog: false, cafe: false } })
const fail = (status: number, code: string, error: string) => NextResponse.json({ ok: false, code, error }, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET() {
 const auth = await requireUser()
 return NextResponse.json({ ok: true, providers: ready(), verified: false, ...(auth.ok ? { diagnostics: { naver: naverSearchDiagnostics() } } : {}) }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return fail(auth.status, 'login_required', '로그인한 뒤 검색해보세요.')
 const limit = rateLimitByIp(req, `business-search:${auth.userId}`, 20, 60)
 if (!limit.ok) return fail(429, 'rate_limited', `${limit.resetIn}초 후 다시 검색해보세요.`)
 let input: Record<string, unknown>
 try {
 if (Number(req.headers.get('content-length') || 0) > 4096) return fail(400, 'invalid_input', '검색 입력이 너무 길어요.')
 const body = await req.text()
 if (body.length > 4096) return fail(400, 'invalid_input', '검색 입력이 너무 길어요.')
 const parsed = JSON.parse(body)
 if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fail(400, 'invalid_input', '검색 조건을 확인해보세요.')
 input = parsed
 } catch { return fail(400, 'invalid_input', '검색 조건을 확인해보세요.') }
 const { provider, mode, industry } = input
 const region = typeof input.region === 'string' ? input.region.trim() : ''
 const keyword = typeof input.keyword === 'string' ? input.keyword.trim() : ''
 if (!['naver', 'google'].includes(String(provider)) || !BUSINESS_SEARCH_MODES.some(item => item.value === mode)
 || !BUSINESS_INDUSTRIES.some(item => item.value === industry) || (provider === 'google' && mode !== 'local')
 || !region || region.length > 40 || keyword.length < 2 || keyword.length > 80 || /[\u0000-\u001f\u007f]/.test(region + keyword)) {
 return fail(400, 'invalid_input', '지역은 1~40자, 검색어는 2~80자로 입력하고 검색 종류를 확인해보세요.')
 }
 const configured = ready()
 if (!configured[provider as 'naver' | 'google'][mode as 'local' | 'blog' | 'cafe']) return fail(503, 'provider_not_configured', '선택한 검색 서비스의 연결 준비가 필요해요. 다른 검색 서비스를 선택하거나 관리자에게 문의해보세요.')
 const query = `${region} ${keyword}`
 const controller = new AbortController()
 const timer = setTimeout(() => controller.abort(), 10000)
 try {
 const naverType = mode === 'cafe' ? 'cafearticle' : String(mode)
 const sourceUrl = provider === 'google'
 ? 'https://developers.google.com/maps/documentation/places/web-service/legacy/search-text'
 : `https://developers.naver.com/docs/serviceapi/search/${naverType}/${naverType}.md`
 const naverRequest = provider === 'naver' ? naverSearchRequest(naverType as 'local' | 'blog' | 'cafearticle') : null
 if (provider === 'naver' && !naverRequest) return fail(503, 'provider_not_configured', '검색 연결 준비가 필요해요.')
 const url = provider === 'google'
 ? 'https://maps.googleapis.com/maps/api/place/textsearch/json?' + new URLSearchParams({ query, language: 'ko', key: process.env.GOOGLE_PLACES_API_KEY || '' })
 : naverRequest!.url + '?' + new URLSearchParams({ query, display: mode === 'local' ? '5' : '10', sort: mode === 'local' ? 'random' : 'sim' })
 const response = await fetch(url, { headers: naverRequest?.headers, signal: controller.signal, cache: 'no-store', redirect: 'error' })
 if (response.status === 429) return fail(429, 'provider_rate_limited', '검색 서비스의 요청 한도에 도달했어요. 잠시 후 다시 검색해보세요.')
 if (response.status === 401 || response.status === 403) {
  if (provider !== 'naver') return fail(502, 'provider_auth_failed', '검색 서비스 인증이나 이용 권한을 확인해야 해요. 관리자에게 API 키와 검색 서비스 사용 설정 확인을 요청해 주세요.')
  const upstreamCode = await naverSearchErrorCode(response)
  return NextResponse.json({ ok: false, code: 'provider_auth_failed', error: '네이버 검색 인증이나 API 사용 권한을 확인해야 해요. 관리자가 선택된 연결의 Client ID와 Secret 조합 및 검색 API 사용 설정을 확인해야 합니다.', diagnostics: { naver: { ...naverSearchDiagnostics(), capabilityVerification: 'request_failed', requestedCapability: mode, upstreamStatus: response.status, upstreamCode } } }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
 }
 if (!response.ok) return fail(502, 'provider_failed', '검색 서비스가 응답하지 못했어요. 잠시 후 다시 검색해보세요.')
 const data = await response.json()
 if (!data || typeof data !== 'object' || data._mock) return fail(502, 'invalid_provider_response', '확인할 수 있는 검색 결과를 받지 못했어요. 다시 검색해보세요.')
 let raw: Record<string, unknown>[]
 if (provider === 'google') {
 if (data.status === 'OVER_QUERY_LIMIT') return fail(429, 'provider_rate_limited', 'Google 매장 검색의 요청 한도에 도달했어요. 잠시 후 다시 검색해보세요.')
 if (data.status === 'REQUEST_DENIED') return fail(502, 'provider_auth_failed', 'Google 매장 검색의 인증이나 이용 권한을 확인해야 해요. 관리자에게 API 키와 Places 서비스 사용 설정 확인을 요청해 주세요.')
 if (!['OK', 'ZERO_RESULTS'].includes(data.status) || !Array.isArray(data.results)) return fail(502, 'provider_failed', 'Google 매장 검색을 사용할 수 없어요. 연결 상태와 이용 권한을 확인해보세요.')
 raw = data.results.slice(0, 10)
 } else {
 if (!Array.isArray(data.items)) return fail(502, 'invalid_provider_response', '확인할 수 있는 검색 결과를 받지 못했어요. 다시 검색해보세요.')
 raw = data.items.slice(0, mode === 'local' ? 5 : 10)
 }
 if (raw.some(item => !item || typeof item !== 'object' || item._mock || typeof (provider === 'google' ? item.name : item.title) !== 'string')) return fail(502, 'invalid_provider_response', '확인할 수 있는 검색 결과를 받지 못했어요. 다시 검색해보세요.')
 const attributionRaw: unknown[] = provider === 'google' ? [
 ...(Array.isArray(data.html_attributions) ? data.html_attributions : []),
 ...raw.flatMap(item => Array.isArray(item.html_attributions) ? item.html_attributions : []),
 ] : []
 const attributions = attributionRaw.filter((value: unknown): value is string => typeof value === 'string').map((value: string) => ({
 text: searchText(value), url: safeSearchUrl(value.match(/href=["']([^"']+)["']/i)?.[1]),
 }))
 const items: BusinessSearchItem[] = raw.map(item => ({
 title: searchText(provider === 'google' ? item.name : item.title),
 description: searchText(provider === 'google' ? item.business_status : item.description),
 address: searchText(provider === 'google' ? item.formatted_address : item.roadAddress || item.address),
 source: provider === 'google' ? 'Google Maps' : mode === 'local' ? '네이버 지역 검색' : mode === 'blog' ? '네이버 블로그 검색' : '네이버 카페 글 검색',
 url: provider === 'google'
 ? typeof item.place_id === 'string' ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(searchText(item.name)) + '&query_place_id=' + encodeURIComponent(item.place_id) : null
 : safeSearchUrl(item.link),
 }))
 return NextResponse.json({ ok: true, provider, mode, industry, query, fetchedAt: new Date().toISOString(), items, sourceUrl, attributions }, { headers: { 'Cache-Control': 'no-store' } })
 } catch {
 return controller.signal.aborted
 ? fail(504, 'provider_timeout', '검색 응답을 기다리는 시간이 길어졌어요. 잠시 후 다시 검색해보세요.')
 : fail(502, 'provider_failed', '검색 정보를 가져오지 못했어요. 잠시 후 다시 검색해보세요.')
 } finally { clearTimeout(timer) }
}
