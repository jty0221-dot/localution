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

// Presence is configuration evidence only, never proof of permission or successful search.
export function naverSearchDiagnostics() {
 const credentialFamily = process.env.NCP_API_KEY_ID && process.env.NCP_API_KEY ? 'ncp' : process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET ? 'naver_developers' : 'none'
 return {
  credentialFamily, configured: credentialFamily !== 'none', verified: false,
  selection: 'complete_ncp_pair_preferred', capabilityVerification: 'not_tested',
  capabilities: { local: 'not_tested', blog: 'not_tested', cafe: 'not_tested' },
  settingsUrl: credentialFamily === 'ncp' ? 'https://console.ncloud.com/' : 'https://developers.naver.com/apps/#/list',
  docsUrl: credentialFamily === 'ncp' ? 'https://api.ncloud-docs.com/docs/naver-api-hub-overview' : 'https://developers.naver.com/docs/common/openapiguide/errorcode.md',
 }
}
// Only documented codes, never provider message/details, credentials or response body.
export async function naverSearchErrorCode(response: Response): Promise<string | null> {
 const allowed = new Set(['024', '200', '401', '403', '429'])
 if (!response.body) return null
 const reader = response.body.getReader()
 let size = 0, text = ''
 const decoder = new TextDecoder()
 try {
  while (true) {
   const { done, value } = await reader.read()
   if (done) break
   size += value.byteLength
   if (size > 8192) { await reader.cancel(); return null }
   text += decoder.decode(value, { stream: true })
  }
  text += decoder.decode()
  const data = JSON.parse(text)
  const code = data?.errorCode ?? data?.error?.errorCode
  return typeof code === 'string' && allowed.has(code) ? code : null
 } catch { return null } finally { reader.releaseLock() }
}
