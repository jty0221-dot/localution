import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { requireUser } from '@/app/lib/userAuth'
import { rateLimitByIp } from '@/app/lib/rateLimit'

const AD_BASE = 'https://api.searchad.naver.com'
const QUERY_TIMEOUT_MS = 12000

type KeywordItem = Record<string, unknown> & { relKeyword: string }
type QueryResult = { ok: true; keywords: KeywordItem[] } | { ok: false; timeout: boolean }

async function queryKeywords(hints: string[]): Promise<QueryResult> {
 const controller = new AbortController()
 const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS)
 try {
 const path = '/keywordstool'
 const qs = '?hintKeywords=' + encodeURIComponent(hints.join(',')) + '&showDetail=1'
 const res = await fetch(AD_BASE + path + qs, {
 headers: adHeaders('GET', path), signal: controller.signal, cache: 'no-store',
 })
 if (!res.ok) return { ok: false, timeout: false }
 const data = await res.json()
 if (!Array.isArray(data.keywordList) || data.keywordList.some((item: unknown) =>
 !item || typeof item !== 'object' || typeof (item as KeywordItem).relKeyword !== 'string'
 )) return { ok: false, timeout: false }
 return { ok: true, keywords: data.keywordList }
 } catch {
 return { ok: false, timeout: controller.signal.aborted }
 } finally {
 clearTimeout(timer)
 }
}

function queryFailure(results: QueryResult[]) {
 const timedOut = results.some(result => !result.ok && result.timeout)
 return NextResponse.json({
 ok: false, code: timedOut ? 'upstream_timeout' : 'upstream_unavailable',
 error: timedOut
 ? '네이버 키워드 조회 시간이 초과됐어요. 잠시 후 다시 조회해보세요.'
 : '네이버 키워드 정보를 가져오지 못했어요. 잠시 후 다시 조회해보세요.',
 }, { status: timedOut ? 504 : 502 })
}

function sign(timestamp: number, method: string, path: string): string {
 const secret = process.env.NAVER_AD_SECRET_KEY || ''
 return crypto.createHmac('sha256', secret).update(timestamp + '.' + method + '.' + path).digest('base64')
}
function adHeaders(method: string, path: string) {
 const ts = Date.now()
 return {
 'Content-Type': 'application/json; charset=UTF-8',
 'X-Timestamp': String(ts),
 'X-API-KEY': process.env.NAVER_AD_API_KEY || '',
 'X-Customer': process.env.NAVER_AD_CUSTOMER_ID || '',
 'X-Signature': sign(ts, method, path),
 }
}
function checkEnv() {
 if (!process.env.NAVER_AD_API_KEY || !process.env.NAVER_AD_SECRET_KEY || !process.env.NAVER_AD_CUSTOMER_ID) {
 return '네이버 광고 API 키가 설정되지 않았습니다.'
 }
 return null
}

function expandHints(kw: string): string[] {
 const hints: string[] = [kw]
 const separated = kw
 .replace(/([가-힣]{2,5}(?:구|시|군|동|읍|역|로|길|면))([가-힣])/, '$1 $2')
 .replace(/([가-힣]{2,4})(맛집|음식점|식당|카페|헬스|미용|네일|피부|병원|학원|약국|마트|편의점|꽃집|세탁)/, '$1 $2')
 if (separated !== kw) hints.push(separated)

 const areaMatch = kw.match(/^([가-힣]{2,5}(?:구|시|군|동|읍|역)?)/)
 const area = areaMatch?.[1] || ''
 const catRaw = area ? kw.slice(area.length).replace(/^\s+/, '') : kw
 const cat = catRaw || '맛집'

 if (area) {
 const synonymMap: Record<string, string[]> = {
 '맛집': ['음식점', '식당', '레스토랑', '맛집 추천', '맛집 순위', '맛집 top', '점심 맛집', '저녁 맛집', '혼밥', '데이트 맛집', '가족 외식', '회식 맛집'],
 '카페': ['커피', '디저트카페', '브런치', '카페 추천', '카페 인기', '감성카페'],
 '헬스': ['헬스장', 'PT', '피트니스', '헬스 추천'],
 '미용실': ['헤어샵', '헤어살롱', '미용 추천', '커트'],
 '네일': ['네일샵', '젤네일', '네일아트'],
 }
 const synonyms = synonymMap[cat] || [cat + ' 추천', cat + ' 순위', cat + ' 인기', cat + ' 잘하는', cat + ' 저렴한']
 for (const syn of synonyms.slice(0, 8)) hints.push(area + ' ' + syn)
 const base = area.replace(/(구|시|군|동|역|읍|면)$/, '')
 if (base && base !== area) { hints.push(base + '역 ' + cat); hints.push(base + '역 근처 ' + cat) }
 hints.push(area + ' 근처 ' + cat); hints.push(area + ' 주변 ' + cat)
 }
 hints.push(kw + ' 추천'); hints.push(kw + ' 순위')
 return [...new Set(hints)].slice(0, 25)
}

export async function GET(req: NextRequest) {
 // 인증 + rate limit (네이버 광고 유료 API 보호)
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: auth.status })
 const rl = rateLimitByIp(req, `naver-ads:${auth.userId}`, 30, 60)
 if (!rl.ok) {
 return NextResponse.json({ error: 'rate_limited', message: `${rl.resetIn}초 후 다시 시도해주세요.` }, { status: 429 })
 }

 const { searchParams } = new URL(req.url)
 const type = searchParams.get('type') || 'volume'
 const keyword = searchParams.get('keyword') || ''
 const keywords = searchParams.get('keywords') || keyword

 if (!keywords.trim()) return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 })

 const envErr = checkEnv()
 if (envErr) return NextResponse.json({ error: envErr }, { status: 503 })

 const kwList = keywords.split(',').map(k => k.trim()).filter(Boolean).slice(0, 5)
 if (kwList.length === 0) return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 })

 try {
 // ── 키워드 확장 (힌트 25개 변형 → 배치 5회) ─────────────────────
 if (type === 'volume') {
 const allHints: string[] = []
 for (const kw of kwList) for (const h of expandHints(kw)) allHints.push(h)
 const uniqueHints = [...new Set(allHints)].slice(0, 25)
 const batches: string[][] = []
 for (let i = 0; i < uniqueHints.length; i += 5) batches.push(uniqueHints.slice(i, i + 5))

 const rawResults = await Promise.all(batches.slice(0, 5).map(queryKeywords))
 const successful = rawResults.filter((result): result is Extract<QueryResult, { ok: true }> => result.ok)
 if (successful.length === 0) return queryFailure(rawResults)
 const failedBatches = rawResults.length - successful.length

 const seen = new Set<string>()
 const merged: Record<string, unknown>[] = []
 for (const result of successful) {
 for (const item of result.keywords) {
 const key = (item.relKeyword || '').replace(/\s+/g, '')
 if (!key || seen.has(key)) continue
 seen.add(key); merged.push(item)
 }
 }
 merged.sort((a, b) =>
 ((Number(b.monthlyPcQcCnt) || 0) + (Number(b.monthlyMobileQcCnt) || 0)) -
 ((Number(a.monthlyPcQcCnt) || 0) + (Number(a.monthlyMobileQcCnt) || 0))
 )
 return NextResponse.json({
 ok: true, type: 'volume', keywords: merged, partial: failedBatches > 0,
 successfulBatches: successful.length, failedBatches,
 warning: failedBatches > 0 ? '일부 키워드를 조회하지 못했어요. 가져온 결과만 표시했으니 다시 조회해보세요.' : null,
 })
 }

 // 실제 키워드 메타데이터만 확인. 순위별 입찰가는 미집계.
 if (type === 'bid') {
 const kw = kwList[0]
 const result = await queryKeywords([kw])
 if (!result.ok) return queryFailure([result])
 const item = result.keywords.find(k => k.relKeyword.replace(/\s+/g, '') === kw.replace(/\s+/g, '')) || result.keywords[0]
 if (!item) return NextResponse.json({
 ok: true, type: 'bid', keyword: kw, estimated: false, empty: true, unavailable: 'bid_not_collected',
 compIdx: null, pcVol: null, mobileVol: null, avgPcCtr: null, avgMobileCtr: null, rows: [],
 })
 const compIdx = typeof item.compIdx === 'string' && ['높음', '중간', '낮음'].includes(item.compIdx) ? item.compIdx : null
 const metric = (value: unknown) => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value)
 const pcVol = metric(item.monthlyPcQcCnt)
 const mobileVol = metric(item.monthlyMobileQcCnt)
 const avgPcCtr = metric(item.monthlyAvePcCtr)
 const avgMobileCtr = metric(item.monthlyAveMobileCtr)

 // Keyword Tool returns measured keyword metadata, not rank-specific bid prices.
 // No observed bid adapter exists: do not manufacture prices from competition labels.
 return NextResponse.json({
 ok: true, type: 'bid', keyword: kw, estimated: false, unavailable: 'bid_not_collected',
 compIdx, pcVol, mobileVol, avgPcCtr, avgMobileCtr, rows: [],
 })
 }

 return NextResponse.json({ error: '잘못된 type.' }, { status: 400 })

 } catch {
 return NextResponse.json({ ok: false, error: '키워드 정보를 처리하지 못했어요. 잠시 후 다시 조회해보세요.' }, { status: 500 })
 }
}
