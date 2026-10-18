import { createServiceClient } from './adminAuth'
import { InstagramError, instagramAccount, instagramGraph, publicMediaUrl } from './instagram-api'
import { createHash } from 'crypto'

const fields = 'id,instagram_user_id,media_type,media_url,caption,status,container_id,media_id,permalink,created_at'
const validId = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
export async function instagramPublication(userId: string, id: string) {
  if (!validId(id)) throw new InstagramError('invalid_request')
  const { data, error } = await createServiceClient().from('instagram_publications').select(fields).eq('id', id).eq('user_id', userId).maybeSingle()
  if (error) throw new InstagramError('storage_unavailable', 503)
  if (!data) throw new InstagramError('invalid_request', 404)
  return data
}
export async function prepareInstagram(userId: string, input: Record<string, unknown>) {
  if (!validId(input.requestId) || !['IMAGE', 'REELS'].includes(String(input.mediaType)) || typeof input.caption !== 'string' || input.caption.length > 2200) throw new InstagramError('invalid_request')
  const mediaUrl = publicMediaUrl(input.mediaUrl)
  const media = new URL(mediaUrl)
  const hostedPrefix = '/storage/v1/object/public/instagram-media/instagram/'
  if (media.pathname.includes(hostedPrefix)) {
    const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://invalid.local').host
    const folder = `instagram/${createHash('sha256').update(userId).digest('hex')}`
    const path = decodeURIComponent(media.pathname.split('/storage/v1/object/public/instagram-media/')[1] || '')
    const name = path.slice(folder.length + 1)
    if (media.host !== host || !path.startsWith(folder + '/') || !/^[0-9a-f-]{36}\.(jpg|mp4)$/.test(name)) throw new InstagramError('invalid_media_url')
    const { data, error } = await createServiceClient().storage.from('instagram-media').list(folder, { search: name, limit: 2 })
    const file = data?.find(item => item.name === name)
    const type = input.mediaType === 'IMAGE' ? 'image/jpeg' : 'video/mp4'
    const limit = type === 'image/jpeg' ? 8 * 1024 * 1024 : 100 * 1024 * 1024
    if (error || !file || file.metadata?.mimetype !== type || !(Number(file.metadata?.size) > 0) || Number(file.metadata?.size) > limit) throw new InstagramError('invalid_media_url')
  }
  const account = await instagramAccount(userId)
  const svc = createServiceClient()
  const { data: row, error } = await svc.from('instagram_publications').insert({ id: input.requestId, user_id: userId, instagram_user_id: account.instagram_user_id, media_type: input.mediaType, media_url: mediaUrl, caption: input.caption, status: 'preparing' }).select('id').single()
  if (error || !row) {
    if (error?.code === '23505') return instagramPublication(userId, String(input.requestId))
    throw new InstagramError('storage_unavailable', 503)
  }
  try {
    const container = await instagramGraph(account.token, `${account.instagram_user_id}/media`, undefined, { caption: input.caption, ...(input.mediaType === 'REELS' ? { media_type: 'REELS', video_url: mediaUrl } : { image_url: mediaUrl }) })
    if (!/^\d+$/.test(String(container.id || ''))) throw new InstagramError('provider_rejected', 502)
    const saved = await svc.from('instagram_publications').update({ container_id: String(container.id), status: 'prepared' }).eq('id', row.id).eq('user_id', userId).eq('status', 'preparing').select('id').maybeSingle()
    if (saved.error || !saved.data) throw new InstagramError('storage_unavailable', 503)
    return instagramPublication(userId, row.id)
  } catch (error) {
    await svc.from('instagram_publications').update({ status: 'prepare_failed' }).eq('id', row.id).eq('user_id', userId).eq('status', 'preparing')
    throw error
  }
}
export async function publishInstagram(userId: string, input: Record<string, unknown>) {
  if (!validId(input.id) || input.confirm !== true) throw new InstagramError('invalid_request')
  const row = await instagramPublication(userId, String(input.id))
  if (row.media_id) return row
  if (row.status !== 'prepared' || !row.container_id) throw new InstagramError('publication_busy', 409)
  const account = await instagramAccount(userId)
  if (account.instagram_user_id !== row.instagram_user_id) throw new InstagramError('account_reconnect_required', 409)
  const state = await instagramGraph(account.token, row.container_id, 'status_code')
  if (state.status_code !== 'FINISHED') throw new InstagramError('media_not_ready', 409)
  const svc = createServiceClient()
  // Atomic claim is durable before the irreversible provider request. Never reset this claim on ambiguous results.
  const claim = await svc.from('instagram_publications').update({ status: 'publishing' }).eq('id', row.id).eq('user_id', userId).eq('status', 'prepared').select('id').maybeSingle()
  if (claim.error) throw new InstagramError('storage_unavailable', 503)
  if (!claim.data) throw new InstagramError('publication_busy', 409)
  let mediaId: string | null = null
  try {
    const result = await instagramGraph(account.token, `${account.instagram_user_id}/media_publish`, undefined, { creation_id: row.container_id })
    if (!/^\d+$/.test(String(result.id || ''))) throw new Error('missing receipt')
    mediaId = String(result.id)
    const saved = await svc.from('instagram_publications').update({ media_id: mediaId, status: 'published_unverified' }).eq('id', row.id).eq('user_id', userId).eq('status', 'publishing').select('id').maybeSingle()
    if (saved.error || !saved.data) throw new Error('receipt save failed')
    return { ...row, status: 'published_unverified', media_id: mediaId }
  } catch {
    // Preserve a confirmed ID where possible. If storage is down the durable publishing claim still prevents a retry.
    try { await svc.from('instagram_publications').update({ status: 'reconciliation_required', ...(mediaId ? { media_id: mediaId } : {}) }).eq('id', row.id).eq('user_id', userId).eq('status', 'publishing') } catch {}
    return { id: row.id, status: 'reconciliation_required', media_id: mediaId, retryAllowed: false }
  }
}
export async function verifyInstagram(userId: string, id: string) {
  const row = await instagramPublication(userId, id)
  const account = await instagramAccount(userId)
  if (account.instagram_user_id !== row.instagram_user_id) throw new InstagramError('account_reconnect_required', 409)
  if (!row.media_id) {
    const container = row.container_id ? await instagramGraph(account.token, row.container_id, 'status_code') : null
    return { ...row, containerStatus: container?.status_code || null, verified: false }
  }
  const receipt = await instagramGraph(account.token, row.media_id, 'id,permalink,media_type,timestamp')
  if (String(receipt.id) !== row.media_id || typeof receipt.permalink !== 'string' || !/^https:\/\/(www\.)?instagram\.com\//.test(receipt.permalink)) throw new InstagramError('receipt_reconciliation_required', 409)
  const saved = await createServiceClient().from('instagram_publications').update({ status: 'verified', permalink: receipt.permalink }).eq('id', row.id).eq('user_id', userId).select('id').maybeSingle()
  if (saved.error || !saved.data) throw new InstagramError('storage_unavailable', 503)
  return { ...row, status: 'verified', permalink: receipt.permalink, verified: true }
}
