import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { timingSafeEqual } from 'crypto'
import { requireUser } from '@/app/lib/userAuth'
import { instagramConfig, instagramJson, instagramGraph, saveInstagramAccount, InstagramError } from '@/app/lib/instagram-api'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  const url = new URL(request.url)
  const destination = new URL('/marketing/instagram-feed', url.origin)
  const jar = await cookies()
  const stored = jar.get('instagram_oauth_state')?.value || ''
  const uid = jar.get('instagram_oauth_uid')?.value
  for (const key of ['instagram_oauth_state', 'instagram_oauth_uid']) jar.set(key, '', { path: '/api/oauth/instagram', maxAge: 0, secure: true, httpOnly: true, sameSite: 'lax' })
  try {
    const auth = await requireUser()
    const state = url.searchParams.get('state') || ''
    if (!auth.ok || auth.userId !== uid || !stored || state.length !== stored.length || !timingSafeEqual(Buffer.from(state), Buffer.from(stored)) || url.searchParams.has('error') || !url.searchParams.get('code')) throw new InstagramError('invalid_request', 403)
    const config = instagramConfig()
    if (new URL(config.callback).origin !== url.origin) throw new InstagramError('configuration_required', 503)
    const short = await instagramJson('https://api.instagram.com/oauth/access_token', { method: 'POST', body: new URLSearchParams({ client_id: config.appId, client_secret: config.secret, grant_type: 'authorization_code', redirect_uri: config.callback, code: url.searchParams.get('code')! }) })
    const token = short.access_token || (Array.isArray(short.data) && short.data.length === 1 ? short.data[0]?.access_token : null)
    if (typeof token !== 'string') throw new InstagramError('provider_rejected', 502)
    const longUrl = new URL('https://graph.instagram.com/access_token')
    Object.entries({ grant_type: 'ig_exchange_token', client_secret: config.secret, access_token: token }).forEach(([key, value]) => longUrl.searchParams.set(key, value))
    const long = await instagramJson(longUrl.toString())
    if (typeof long.access_token !== 'string' || !(long.expires_in > 0)) throw new InstagramError('provider_rejected', 502)
    const profile = await instagramGraph(long.access_token, 'me', 'user_id,username')
    const id = String(profile.user_id || profile.id || '')
    if (!/^\d+$/.test(id) || typeof profile.username !== 'string') throw new InstagramError('provider_rejected', 502)
    await saveInstagramAccount(auth.userId, long.access_token, long.expires_in, { id, username: profile.username })
    destination.searchParams.set('instagram_connected', '1')
  } catch (error) { destination.searchParams.set('instagram_error', error instanceof InstagramError ? error.code : 'provider_rejected') }
  const response = NextResponse.redirect(destination)
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
