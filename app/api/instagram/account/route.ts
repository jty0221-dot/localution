import { NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { instagramAccount, instagramConfig, instagramGraph, InstagramError, instagramErrorText } from '@/app/lib/instagram-api'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET() {
  const headers = { 'Cache-Control': 'private, no-store' }
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, code: 'login_required', error: '로그인한 뒤 연결해주세요.' }, { status: 401, headers })
  try {
    instagramConfig()
    const account = await instagramAccount(auth.userId)
    const profile = await instagramGraph(account.token, 'me', 'user_id,username')
    if (String(profile.user_id || profile.id) !== account.instagram_user_id) throw new InstagramError('account_reconnect_required', 409)
    return NextResponse.json({ ok: true, connected: true, account: { id: account.instagram_user_id, username: profile.username, expiresAt: account.expires_at }, grantVerified: false, capabilities: { image: true, reel: true, scheduling: false } }, { headers })
  } catch (error) {
    const code = error instanceof InstagramError ? error.code : 'provider_rejected'
    return NextResponse.json({ ok: false, connected: false, code, error: instagramErrorText[code] }, { status: error instanceof InstagramError ? error.status : 502, headers })
  }
}
