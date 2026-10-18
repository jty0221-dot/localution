import { createServiceClient } from './adminAuth'
import { encryptSecret, decryptSecret } from './crypto-utils'

export class KarrotError extends Error {
  constructor(public code: string, public status = 400) { super(code) }
}
export function karrotOrigin(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) throw new KarrotError('origin_rejected', 403)
}
export function karrotCredentials(advertiserId: unknown, apiKey: unknown) {
  if (typeof advertiserId !== 'string' || !/^\d{1,20}$/.test(advertiserId) || typeof apiKey !== 'string' || !apiKey.trim() || apiKey.length > 4096 || /[\r\n]/.test(apiKey)) throw new KarrotError('invalid_input')
  return { advertiserId, apiKey: apiKey.trim() }
}
export function karrotPeriod(start: unknown, end: unknown) {
  if (typeof start !== 'string' || typeof end !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) throw new KarrotError('invalid_period')
  const startDateTime = `${start}T00:00:00+09:00`, endDateTime = `${end}T23:59:59+09:00`
  const duration = Date.parse(endDateTime) - Date.parse(startDateTime)
  if (!Number.isFinite(duration) || duration <= 0 || duration > 31 * 86400000 || new Date(`${start}T00:00:00Z`).toISOString().slice(0, 10) !== start || new Date(`${end}T00:00:00Z`).toISOString().slice(0, 10) !== end) throw new KarrotError('invalid_period')
  return { startDateTime, endDateTime }
}
export async function karrotRead(advertiserId: string, apiKey: string, path: '/v1/campaigns' | '/v1/performance', body?: Record<string, unknown>) {
  const url = `https://ads-openapi.kr.karrotmarket.com${path}${path === '/v1/campaigns' ? '?pageNumber=1&pageSize=50' : ''}`
  const response = await fetch(url, { method: body ? 'POST' : 'GET', headers: { 'X-API-KEY': apiKey, 'X-ADVERTISER-ID': advertiserId, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new KarrotError(response.status === 429 ? 'rate_limited' : 'provider_rejected', response.status === 429 ? 429 : 502)
  const data = await response.json()
  if (!data || typeof data !== 'object') throw new KarrotError('provider_rejected', 502)
  return data
}
export async function karrotConnection(userId: string) {
  const { data, error } = await createServiceClient().from('karrot_ad_connections').select('advertiser_id,encrypted_key,updated_at').eq('user_id', userId).maybeSingle()
  if (error) throw new KarrotError('storage_unavailable', 503)
  if (!data) return null
  return data
}
export async function saveKarrotConnection(userId: string, advertiserId: string, apiKey: string) {
  const encryptedKey = encryptSecret(apiKey)
  const { data, error } = await createServiceClient().from('karrot_ad_connections').upsert({ user_id: userId, advertiser_id: advertiserId, encrypted_key: encryptedKey, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).select('user_id').single()
  if (error || !data) throw new KarrotError('storage_unavailable', 503)
}
export async function karrotReport(userId: string, start: unknown, end: unknown) {
  const period = karrotPeriod(start, end)
  const connection = await karrotConnection(userId)
  if (!connection) throw new KarrotError('not_connected', 409)
  const key = decryptSecret(connection.encrypted_key)
  const list = await karrotRead(connection.advertiser_id, key, '/v1/campaigns')
  if (!Array.isArray(list.campaigns) || list.campaigns.some((c: { id?: unknown; advertiserId?: unknown }) => typeof c.id !== 'string' || String(c.advertiserId) !== connection.advertiser_id)) throw new KarrotError('provider_rejected', 502)
  const campaigns = list.campaigns.slice(0, 50)
  const report = campaigns.length ? await karrotRead(connection.advertiser_id, key, '/v1/performance', { ...period, timeGranularity: 'DAY', analysisItem: 'Campaign', ids: campaigns.map((c: { id: string }) => c.id) }) : { performances: [] }
  if (!Array.isArray(report.performances)) throw new KarrotError('provider_rejected', 502)
  return { campaigns, performances: report.performances, pagination: list.pagination, limited_to: 50, queried_at: new Date().toISOString() }
}
export const karrotErrors: Record<string, string> = {
  invalid_input: '광고주 ID와 API 키를 확인해 주세요.', invalid_period: '조회 기간을 실제 날짜로 입력해 주세요. 최대 31일까지 조회할 수 있어요.', origin_rejected: '현재 사이트에서 다시 요청해 주세요.', storage_unavailable: '광고 계정 저장소를 준비하고 있어요. 잠시 후 다시 확인해 주세요.', not_connected: '당근 광고 계정을 먼저 연결해 주세요.', rate_limited: '당근 조회 한도에 도달했어요. 잠시 후 다시 조회해 주세요.', provider_rejected: '당근에서 조회를 승인하지 않았거나 응답을 확인하지 못했어요. 광고 계정과 키의 권한을 확인해 주세요.', configuration_required: '광고 연결 설정을 준비하고 있어요.', request_failed: '조회하지 못했어요. 연결 상태를 확인한 뒤 다시 시도해 주세요.'
}
