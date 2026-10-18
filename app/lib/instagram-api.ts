import { createServiceClient } from './adminAuth'
import { decryptSecret, encryptSecret, type EncryptedPayload } from './crypto-utils'

export const INSTAGRAM_SCOPES = ['instagram_business_basic', 'instagram_business_content_publish']
export class InstagramError extends Error {
  constructor(public code: string, public status = 400) { super(code) }
}
export function instagramConfig() {
  const names = ['INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET', 'INSTAGRAM_CALLBACK_URL', 'INSTAGRAM_GRAPH_VERSION', 'ENCRYPTION_KEK_HEX'] as const
  const missing = names.filter(name => !process.env[name])
  if (missing.length) throw new InstagramError('configuration_required', 503)
  const callback = new URL(process.env.INSTAGRAM_CALLBACK_URL!)
  if (callback.protocol !== 'https:' || !/^v\d+\.\d+$/.test(process.env.INSTAGRAM_GRAPH_VERSION!)) throw new InstagramError('configuration_required', 503)
  return { appId: process.env.INSTAGRAM_APP_ID!, secret: process.env.INSTAGRAM_APP_SECRET!, callback: callback.toString(), version: process.env.INSTAGRAM_GRAPH_VERSION! }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin) throw new InstagramError('origin_rejected', 403)
}
export function publicMediaUrl(value: unknown) {
  if (typeof value !== 'string' || value.length > 2048) throw new InstagramError('invalid_media_url')
  let url: URL
  try { url = new URL(value) } catch { throw new InstagramError('invalid_media_url') }
  // The server never fetches this URL. Meta downloads publicly available media.
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !url.hostname.includes('.') || /(^localhost$|\.local$|^[\d.]+$|:)/i.test(url.hostname)) throw new InstagramError('invalid_media_url')
  return url.toString()
}
export async function instagramJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(20000) })
  const data = await response.json()
  if (!response.ok || data.error || data.error_message) throw new InstagramError('provider_rejected', 502)
  return data
}
export async function instagramGraph(token: string, path: string, fields?: string, body?: Record<string, string>) {
  const { version } = instagramConfig()
  const url = new URL(`https://graph.instagram.com/${version}/${path}`)
  if (fields) url.searchParams.set('fields', fields)
  return instagramJson(url.toString(), { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) }, ...(body ? { body: new URLSearchParams(body).toString() } : {}) })
}
export async function instagramAccount(userId: string) {
  const { data, error } = await createServiceClient().from('instagram_accounts').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw new InstagramError('storage_unavailable', 503)
  if (!data) throw new InstagramError('account_not_connected', 409)
  if (Date.parse(data.expires_at) <= Date.now()) throw new InstagramError('account_reconnect_required', 409)
  return { ...data, token: decryptSecret(data.encrypted_token as EncryptedPayload) }
}
export async function saveInstagramAccount(userId: string, token: string, expiresIn: number, profile: { id: string; username: string }) {
  const { data, error } = await createServiceClient().from('instagram_accounts').upsert({ user_id: userId, instagram_user_id: profile.id, username: profile.username, encrypted_token: encryptSecret(token), expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).select('user_id').single()
  if (error || !data) throw new InstagramError('storage_unavailable', 503)
}
export const instagramErrorText: Record<string, string> = {
  configuration_required: '서비스의 Instagram 앱 설정을 확인하고 있습니다. 관리자 설정이 완료되면 연결할 수 있어요.',
  storage_unavailable: '계정과 게시 기록 저장소가 아직 준비되지 않았거나 연결되지 않았어요.',
  account_not_connected: 'Instagram 프로페셔널 계정을 먼저 연결해주세요.',
  account_reconnect_required: 'Instagram 연결이 만료되었어요. 계정을 다시 연결해주세요.',
  provider_rejected: 'Instagram에서 요청을 승인하지 않았어요. 계정 권한과 미디어 조건을 확인해주세요.',
  invalid_media_url: '외부에서 열 수 있는 HTTPS 사진 또는 동영상 주소를 입력해주세요.',
  origin_rejected: '현재 사이트에서 다시 요청해주세요.',
  invalid_request: '입력 내용과 게시 확인을 확인해주세요.',
  publication_busy: '이미 처리했거나 확인이 필요한 요청이에요. 게시 기록을 먼저 조회해주세요.',
  media_not_ready: 'Instagram에서 미디어를 처리하고 있어요. 잠시 후 상태를 다시 확인해주세요.',
  receipt_reconciliation_required: '외부 게시 결과를 확인해야 해요. 다시 게시하지 말고 게시 기록을 확인해주세요.',
}
