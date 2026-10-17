// Search credentials and endpoint must be selected as one pair.
// Existing header-only exports remain for callers migrated separately.
export function naverOpenHeaders(): Record<string, string> {
  if (process.env.NCP_API_KEY_ID && process.env.NCP_API_KEY) return { 'X-NCP-APIGW-API-KEY-ID': process.env.NCP_API_KEY_ID, 'X-NCP-APIGW-API-KEY': process.env.NCP_API_KEY }
  return { 'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID || '', 'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET || '' }
}
export function hasNaverOpenApiCredentials(): boolean {
  return Boolean((process.env.NCP_API_KEY_ID && process.env.NCP_API_KEY) || (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET))
}
export function naverSearchRequest(type: 'local' | 'blog' | 'cafearticle'): { url: string; headers: Record<string, string> } | null {
  if (!hasNaverOpenApiCredentials()) return null
  const ncp = Boolean(process.env.NCP_API_KEY_ID && process.env.NCP_API_KEY)
  return { url: ncp ? `https://naverapihub.apigw.ntruss.com/search/v1/${type}` : `https://openapi.naver.com/v1/search/${type}.json`, headers: naverOpenHeaders() }
}
