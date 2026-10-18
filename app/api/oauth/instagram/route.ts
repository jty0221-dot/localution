import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { requireUser } from '@/app/lib/userAuth'
import { instagramConfig, INSTAGRAM_SCOPES } from '@/app/lib/instagram-api'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  const auth = await requireUser()
  const origin = new URL(request.url).origin
  if (!auth.ok) return NextResponse.redirect(new URL('/login', origin))
  try {
    const config = instagramConfig()
    if (new URL(config.callback).origin !== origin) throw new Error('origin')
    const state = randomBytes(32).toString('hex')
    const jar = await cookies()
    const options = { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/api/oauth/instagram', maxAge: 600 }
    jar.set('instagram_oauth_state', state, options)
    jar.set('instagram_oauth_uid', auth.userId, options)
    const url = new URL('https://www.instagram.com/oauth/authorize')
    Object.entries({ client_id: config.appId, redirect_uri: config.callback, response_type: 'code', scope: INSTAGRAM_SCOPES.join(','), state, enable_fb_login: '0' }).forEach(([key, value]) => url.searchParams.set(key, value))
    return NextResponse.redirect(url)
  } catch { return NextResponse.redirect(new URL('/marketing/instagram-feed?instagram_error=configuration_required', origin)) }
}
