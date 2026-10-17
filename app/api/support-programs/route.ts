import { NextRequest, NextResponse } from 'next/server'
import { normalizeSupportPrograms, supportFilters } from '../../lib/support-programs'
import { rateLimitByIp } from '../../lib/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const MAX_BYTES = 2 * 1024 * 1024
const reply = (status: number, code: string, error: string) => NextResponse.json({ ok: false, code, error, items: [], fetchedAt: null, source: '기업마당' }, { status, headers: { 'Cache-Control': 'no-store' } })
export async function GET(req: NextRequest) {
 let filters: ReturnType<typeof supportFilters>
 try { filters = supportFilters(new URL(req.url).searchParams) } catch { return reply(400, 'invalid_input', '지역과 분야 또는 검색어를 확인해주세요. 검색어는 100자까지 입력할 수 있어요.') }
 const key = process.env.BIZINFO_API_KEY?.trim()
 if (!key) return reply(503, 'not_configured', '지원사업 조회 연결을 준비하고 있어요. 기업마당 공식 사이트에서 공고를 확인해주세요.')
 const limit = rateLimitByIp(req, 'support-programs', 30, 60)
 if (!limit.ok) return reply(429, 'rate_limited', '요청이 많아요. 잠시 후 다시 확인해주세요.')
 const params = new URLSearchParams({ crtfcKey: key, dataType: 'json', searchCnt: '30', pageUnit: '30', pageIndex: '1' })
 const region = ['광주', '전남'].includes(filters.region) ? '전남광주' : filters.region
 const tags = [region, filters.field].filter(Boolean)
 if (tags.length) params.set('hashtags', tags.join(','))
 const controller = new AbortController()
 const timer = setTimeout(() => controller.abort(), 12000)
 try {
 const response = await fetch('https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do?' + params.toString(), { signal: controller.signal, cache: 'no-store', redirect: 'error', headers: { Accept: 'application/json' } })
 if (!response.ok || Number(response.headers.get('content-length') || 0) > MAX_BYTES || !response.body) return reply(502, 'upstream_unavailable', '공식 공고를 가져오지 못했어요. 잠시 후 다시 확인해주세요.')
 const reader = response.body.getReader()
 const decoder = new TextDecoder()
 let text = '', size = 0
 try {
 while (true) {
 const { done, value } = await reader.read()
 if (done) break
 size += value.byteLength
 if (size > MAX_BYTES) { await reader.cancel(); throw new Error('response_too_large') }
 text += decoder.decode(value, { stream: true })
 }
 text += decoder.decode()
 } finally { reader.releaseLock() }
 const items = normalizeSupportPrograms(JSON.parse(text), filters.q)
 return NextResponse.json({ ok: true, items, fetchedAt: new Date().toISOString(), source: '기업마당' }, { headers: { 'Cache-Control': 'no-store' } })
 } catch {
 return controller.signal.aborted ? reply(504, 'upstream_timeout', '공식 공고 조회가 지연되고 있어요. 잠시 후 다시 확인해주세요.') : reply(502, 'upstream_unavailable', '공식 공고 응답을 확인하지 못했어요. 잠시 후 다시 확인해주세요.')
 } finally { clearTimeout(timer) }
}
