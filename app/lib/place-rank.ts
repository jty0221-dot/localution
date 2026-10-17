export type RankMethod = 'map_api' | 'mobile_list' | 'local_openapi' | 'none'
export type PlaceCandidate = { rank: number; placeId: string | null; name: string; category?: string | null; visitorReviewCount?: number | null; blogReviewCount?: number | null; rating?: number | null; naverScore?: number | null }
export type PlaceRankResult = {
  rank: number | null; total: number; method: RankMethod; matchedName: string | null
  competitors: PlaceCandidate[]; errors: string[]; scannedCount?: number; checkedAt?: string | null
  status?: 'measured' | 'not_found' | 'unavailable'
}
export const COMPETITOR_KEEP = 20
export type ScanRankParams = { keyword: string; placeId?: string | null; businessName?: string | null; maxRank?: number }
const unavailable = (code: string): PlaceRankResult => ({ rank: null, total: 0, method: 'none', matchedName: null, competitors: [], errors: [code], scannedCount: 0, checkedAt: null, status: 'unavailable' })
const text = (value: unknown) => typeof value === 'string' ? value.replace(/<[^>]*>/g, '').trim() : ''
const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null

// Only a structured ordered map result is a rank source. Official local search
// returns discovery items, and arbitrary IDs in HTML do not prove ordering.
// No proxy, browser challenge bypass, or fallback request after access denial.
export async function scanPlaceRank(params: ScanRankParams): Promise<PlaceRankResult> {
  const keyword = typeof params?.keyword === 'string' ? params.keyword.trim() : ''
  const placeId = typeof params?.placeId === 'string' ? params.placeId.trim() : ''
  if (!keyword || keyword.length > 80 || /[\u0000-\u001f\u007f]/.test(keyword)) return unavailable('invalid_keyword')
  if (!/^\d{1,30}$/.test(placeId)) return unavailable('place_id_required')
  const maxRank = Number.isInteger(params.maxRank) && params.maxRank! > 0 ? Math.min(params.maxRank!, 100) : 100
  const collected: PlaceCandidate[] = []
  const seen = new Set<string>()
  let total = 0
  for (let page = 1; collected.length < maxRank && page <= Math.ceil(maxRank / 50); page++) {
    const url = 'https://map.naver.com/p/api/search/allSearch?' + new URLSearchParams({ query: keyword, type: 'place', searchCoord: '', page: String(page), displayCount: '50' })
    let response: Response
    try { response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(9000), headers: { Accept: 'application/json' } }) }
    catch (error) { return unavailable(error && typeof error === 'object' && 'name' in error && ['TimeoutError', 'AbortError'].includes(String(error.name)) ? 'upstream_timeout' : 'upstream_network') }
    if (!response.ok) return unavailable(response.status === 403 || response.status === 401 ? 'upstream_access_denied' : response.status === 429 ? 'upstream_rate_limited' : 'upstream_failed')
    let json: any
    try { json = await response.json() } catch { return unavailable('upstream_invalid_json') }
    const place = json?.result?.place
    if (json?._mock || !place || !Array.isArray(place.list) || typeof place.totalCount !== 'number' || !Number.isSafeInteger(place.totalCount) || place.totalCount < 0) return unavailable('upstream_schema_changed')
    total = place.totalCount
    if (!place.list.length) {
      if (page === 1 && total !== 0) return unavailable('upstream_schema_changed')
      break
    }
    for (const item of place.list) {
      const id = typeof item?.id === 'string' || typeof item?.id === 'number' ? String(item.id) : ''
      const name = text(item?.name)
      if (!/^\d{1,30}$/.test(id) || !name || seen.has(id) || item?._mock || item?.isAd === true || item?.advertisement === true) return unavailable('upstream_order_unverified')
      seen.add(id)
      if (collected.length < maxRank) collected.push({ rank: collected.length + 1, placeId: id, name, category: text(item.category) || null, visitorReviewCount: count(item.visitorReviewCount), blogReviewCount: count(item.blogReviewCount), rating: count(item.visitorReviewScore), naverScore: null })
    }
    if (place.list.length < 50 || collected.length >= total) break
  }
  const match = collected.find(item => item.placeId === placeId)
  return { rank: match?.rank ?? null, total, method: 'map_api', matchedName: match?.name ?? null, competitors: collected.slice(0, COMPETITOR_KEEP), errors: [], scannedCount: collected.length, checkedAt: new Date().toISOString(), status: match ? 'measured' : 'not_found' }
}
