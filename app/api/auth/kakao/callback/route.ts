// app/api/auth/kakao/callback/route.ts
// ============================================================
// 카카오 OAuth 콜백 — 20차-1c (디버그 로깅 제거, 2026-04-21)
// · ?code=... &state=<base64 {uid, returnTo}>
// · code → token 교환 → /v2/user/me → kakao_tokens upsert
// · 성공: returnTo?connected=kakao 로 302
// · 실패: returnTo?connected=error&reason=... 로 302
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/app/lib/adminAuth'
import { requireUser } from '@/app/lib/userAuth'
import {
 exchangeCodeForToken,
 fetchKakaoMe,
} from '@/app/lib/kakao-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_RETURN_TO = '/marketing/blog-tracking'
// route.ts 는 정해진 것만 export 할 수 있어 상수는 start 와 각각 선언한다 (값이 같아야 한다)
const STATE_COOKIE = 'kakao_connect_state'

function decodeState(state: string): { uid?: string; returnTo?: string; nonce?: string } {
 try {
 const json = Buffer.from(state, 'base64url').toString('utf-8')
 return JSON.parse(json)
 } catch {
 return {}
 }
}

// SEC-001 · returnTo 는 같은 출처 상대경로만 허용한다.
// state 가 위조 가능하므로 여기서 거르지 않으면 new URL(returnTo, origin) 이 외부로 나간다.
function safeReturnTo(raw: string | null | undefined): string {
 const v = (raw || '').trim()
 if (!v.startsWith('/')) return DEFAULT_RETURN_TO
 if (v.startsWith('//')) return DEFAULT_RETURN_TO
 if (v.includes('\\')) return DEFAULT_RETURN_TO
 return v
}

function errRedirect(req: NextRequest, returnTo: string, reason: string) {
 const url = new URL(returnTo, req.nextUrl.origin)
 url.searchParams.set('connected', 'error')
 url.searchParams.set('reason', reason)
 return NextResponse.redirect(url)
}

export async function GET(req: NextRequest) {
 const code = req.nextUrl.searchParams.get('code')
 const error = req.nextUrl.searchParams.get('error')
 const state = req.nextUrl.searchParams.get('state') || ''

 const { uid, returnTo: rt, nonce } = decodeState(state)
 const returnTo = safeReturnTo(rt)

 if (error) {
 return errRedirect(req, returnTo, `kakao_${error}`)
 }
 if (!code) {
 return errRedirect(req, returnTo, 'missing_code')
 }
 if (!uid) {
 return errRedirect(req, returnTo, 'missing_state')
 }

 // SEC-001 (1) nonce 대조 — start 가 심은 HttpOnly 쿠키와 같아야 한다.
 // 이게 없으면 공격자가 state 를 통째로 만들어 보낼 수 있다 (로그인 CSRF).
 const cookieStore = await cookies()
 const storedNonce = cookieStore.get(STATE_COOKIE)?.value
 if (!nonce || !storedNonce || storedNonce !== nonce) {
 return errRedirect(req, returnTo, 'state_mismatch')
 }
 cookieStore.delete(STATE_COOKIE)

 // SEC-001 (2) uid 는 state 를 믿지 않고 현재 로그인 세션에서 확인한다.
 // state 의 uid 를 그대로 쓰면 남의 계정에 공격자 카카오 토큰이 붙는다 (계정 연결 탈취).
 const auth = await requireUser()
 if (!auth.ok || auth.userId !== uid) {
 return errRedirect(req, returnTo, 'session_mismatch')
 }

 try {
 // (1) code → token 교환
 const tok = await exchangeCodeForToken(code)

 // (2) 카카오 프로필 조회 (nickname 저장용, 실패해도 진행)
 let kakaoUserId: string | null = null
 let nickname: string | null = null
 try {
 const me = await fetchKakaoMe(tok.access_token)
 kakaoUserId = String(me.id)
 nickname = me.kakao_account?.profile?.nickname
 || me.properties?.nickname
 || null
 } catch { /* 프로필 조회 실패는 무시 */ }

 // (3) kakao_tokens upsert
 const now = Date.now()
 const svc = createServiceClient()
 const { error: upErr } = await svc
 .from('kakao_tokens')
 .upsert({
 user_id: uid,
 access_token: tok.access_token,
 refresh_token: tok.refresh_token,
 expires_at: new Date(now + tok.expires_in * 1000).toISOString(),
 refresh_expires_at: tok.refresh_token_expires_in
 ? new Date(now + tok.refresh_token_expires_in * 1000).toISOString()
 : null,
 scope: tok.scope || null,
 kakao_user_id: kakaoUserId,
 nickname,
 updated_at: new Date().toISOString(),
 }, { onConflict: 'user_id' })
 if (upErr) {
 return errRedirect(req, returnTo, `persist_${encodeURIComponent(upErr.message)}`)
 }

 // (3-b) 알림 흐름에서 들어온 경우 channel_kakao_talk 자동 활성화
 // returnTo 가 /settings 면 사용자가 알림용으로 동의한 것 → 자동 켜기
 if (returnTo.includes('/settings') && (tok.scope || '').includes('talk_message')) {
 try {
 await svc.from('user_notification_prefs').upsert({
 user_id: uid,
 channel_kakao_talk: true,
 updated_at: new Date().toISOString(),
 }, { onConflict: 'user_id' })
 } catch { /* best-effort */ }
 }

 // (4) 성공 리다이렉트
 const url = new URL(returnTo, req.nextUrl.origin)
 url.searchParams.set('connected', 'kakao')
 return NextResponse.redirect(url)
 } catch (e) {
 const msg = e instanceof Error ? e.message : 'unknown'
 return errRedirect(req, returnTo,
 'exchange_' + encodeURIComponent(msg))
 }
}
