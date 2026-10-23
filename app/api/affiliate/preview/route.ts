// app/api/affiliate/preview/route.ts
// ============================================================
// 네이버 쇼핑 / 외부 URL 미리보기 메타데이터 추출
// GET /api/affiliate/preview?url=...
// 응답: { ok, image, title, description, price, rating, reviewCount, brand }
//
// · og:meta + JSON-LD product schema + 네이버 쇼핑 패턴
// · 5분 in-memory 캐시 (실시간 체크하되 부하 최소화)
// · 실패 시 graceful — null 필드 반환
// · 보안(SEC-L12): 로그인 필수 · 허용 호스트(제휴 미리보기 출처)만 · http(s) 기본 포트만
//   DNS 해석 IP 가 사설/루프백/링크로컬/메타데이터면 거부 · 리다이렉트 안 따라감
//   응답 1MB · 8초 상한 · 캐시 100개 상한 · CORS 와일드카드 제거
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../lib/userAuth'
import { safeFetchText } from '../../../lib/safe-fetch'
import { AFFILIATE_PREVIEW_HOSTS } from '../../../lib/affiliate-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ── In-memory cache (5분 TTL) ─────────────────────────
type CacheEntry = { at: number; data: any }
const CACHE: Map<string, CacheEntry> = (globalThis as any).__affiliate_cache || new Map()
;(globalThis as any).__affiliate_cache = CACHE
const TTL_MS = 5 * 60 * 1000
const CACHE_MAX = 100
const MAX_BYTES = 1_000_000
const TIMEOUT_MS = 8000

// 같은 출처 화면(qr-admin)만 부른다 → CORS 헤더 없음 · 응답은 사용자별로 캐시하지 않는다
const CORS_HEADERS = { 'Cache-Control': 'private, no-store' }

function cacheSet(key: string, entry: CacheEntry) {
 CACHE.delete(key)
 CACHE.set(key, entry)
 while (CACHE.size > CACHE_MAX) {
 const oldest = CACHE.keys().next().value
 if (oldest === undefined) break
 CACHE.delete(oldest)
 }
}

function pickMeta(html: string, names: string[]): string | null {
 for (const name of names) {
 // <meta property="og:image" content="..."> 또는 name="..."
 const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i')
 const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`, 'i')
 const m = html.match(re1) || html.match(re2)
 if (m && m[1]) return m[1].trim()
 }
 return null
}

function pickTitle(html: string): string | null {
 const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
 return m ? m[1].replace(/\s+/g, ' ').trim() : null
}

// JSON-LD product schema 추출
function pickJsonLd(html: string): any {
 const matches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || []
 for (const block of matches) {
 const raw = block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '')
 try {
 const parsed = JSON.parse(raw)
 const arr = Array.isArray(parsed) ? parsed : [parsed]
 for (const item of arr) {
 if (item && typeof item === 'object' && (item['@type'] === 'Product' || item.product)) {
 return item.product || item
 }
 }
 } catch {}
 }
 return null
}

function parseRatingFromHtml(html: string): { rating: number | null; reviewCount: number | null } {
 // 다양한 패턴 fallback
 // 네이버 쇼핑: data-rating, data-review-count, "reviewRating":4.8 등
 let rating: number | null = null
 let reviewCount: number | null = null

 // JSON 안의 rating value
 const ratingPatterns = [
 /"ratingValue"\s*:\s*"?(\d+(?:\.\d+)?)"?/,
 /"rating"\s*:\s*"?(\d+(?:\.\d+)?)"?/,
 /data-rating=["'](\d+(?:\.\d+)?)["']/,
 /평점[\s\S]{0,30}?(\d+\.\d)/,
 ]
 for (const p of ratingPatterns) {
 const m = html.match(p)
 if (m && m[1]) {
 const v = parseFloat(m[1])
 if (!isNaN(v) && v >= 0 && v <= 5) { rating = v; break }
 }
 }

 const reviewPatterns = [
 /"reviewCount"\s*:\s*"?(\d+)"?/,
 /"ratingCount"\s*:\s*"?(\d+)"?/,
 /data-review-count=["'](\d+)["']/,
 /리뷰[\s\S]{0,30}?(\d+,?\d{0,3})개/,
 ]
 for (const p of reviewPatterns) {
 const m = html.match(p)
 if (m && m[1]) {
 const v = parseInt(m[1].replace(/,/g, ''), 10)
 if (!isNaN(v)) { reviewCount = v; break }
 }
 }
 return { rating, reviewCount }
}

function parsePrice(html: string): { price: string | null; currency: string | null } {
 // og:price:amount, JSON-LD price, "lowPrice", "price"
 const ogPrice = pickMeta(html, ['product:price:amount', 'og:price:amount'])
 const ogCur = pickMeta(html, ['product:price:currency', 'og:price:currency'])
 if (ogPrice) {
 return { price: ogPrice, currency: ogCur || 'KRW' }
 }
 const jsonPatterns = [
 /"lowPrice"\s*:\s*"?(\d+)"?/,
 /"price"\s*:\s*"?(\d+(?:\.\d+)?)"?/,
 /"discountPrice"\s*:\s*"?(\d+)"?/,
 /"salePrice"\s*:\s*"?(\d+)"?/,
 ]
 for (const p of jsonPatterns) {
 const m = html.match(p)
 if (m && m[1]) return { price: m[1], currency: 'KRW' }
 }
 return { price: null, currency: null }
}

export async function GET(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) {
 return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401, headers: CORS_HEADERS })
 }

 const url = req.nextUrl.searchParams.get('url')
 if (!url || !/^https?:\/\//i.test(url)) {
 return NextResponse.json({ ok: false, error: 'invalid_url' }, { status: 400, headers: CORS_HEADERS })
 }

 // 캐시 확인
 const cached = CACHE.get(url)
 if (cached && Date.now() - cached.at < TTL_MS) {
 return NextResponse.json({ ok: true, cached: true, ...cached.data }, { headers: CORS_HEADERS })
 }

 try {
 const res = await safeFetchText(url, {
 allowedHosts: AFFILIATE_PREVIEW_HOSTS,
 maxBytes: MAX_BYTES,
 timeoutMs: TIMEOUT_MS,
 headers: {
 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
 'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
 },
 })
 if (!res.ok) {
 const status = res.error === 'invalid_url' || res.error === 'host_not_allowed' ? 400 : 502
 return NextResponse.json({ ok: false, error: res.error, status: res.status }, { status, headers: CORS_HEADERS })
 }
 const html = res.text

 const ogImage = pickMeta(html, ['og:image', 'og:image:secure_url', 'twitter:image'])
 const ogTitle = pickMeta(html, ['og:title', 'twitter:title']) || pickTitle(html)
 const ogDesc = pickMeta(html, ['og:description', 'twitter:description', 'description'])
 const brand = pickMeta(html, ['og:site_name', 'product:brand', 'al:web:url'])
 const ld = pickJsonLd(html)

 let title = ogTitle
 let image = ogImage
 let description = ogDesc
 let priceRaw = parsePrice(html).price
 let { rating, reviewCount } = parseRatingFromHtml(html)
 let brandName = brand

 if (ld) {
 title = title || ld.name || null
 image = image || (Array.isArray(ld.image) ? ld.image[0] : ld.image) || null
 description = description || ld.description || null
 if (ld.offers) {
 const offer = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers
 priceRaw = priceRaw || offer.price || offer.lowPrice || null
 }
 if (ld.aggregateRating) {
 if (rating == null) rating = parseFloat(ld.aggregateRating.ratingValue) || null
 if (reviewCount == null) reviewCount = parseInt(ld.aggregateRating.reviewCount || ld.aggregateRating.ratingCount || '0', 10) || null
 }
 brandName = brandName || (typeof ld.brand === 'string' ? ld.brand : ld.brand?.name) || null
 }

 // 가격 포맷 (숫자 → "29,000원")
 let priceFormatted: string | null = null
 if (priceRaw) {
 const num = parseInt(String(priceRaw).replace(/[^0-9]/g, ''), 10)
 if (!isNaN(num)) priceFormatted = num.toLocaleString('ko-KR') + '원'
 }

 const data = {
 url,
 title: title ? title.slice(0, 120) : null,
 image: image || null,
 description: description ? description.slice(0, 200) : null,
 price: priceFormatted,
 priceRaw,
 rating: rating ?? null,
 reviewCount: reviewCount ?? null,
 brand: brandName ? brandName.slice(0, 60) : null,
 }
 cacheSet(url, { at: Date.now(), data })
 return NextResponse.json({ ok: true, cached: false, ...data }, { headers: CORS_HEADERS })
 } catch (e: any) {
 return NextResponse.json({ ok: false, error: 'parse_failed' }, { status: 500, headers: CORS_HEADERS })
 }
}
