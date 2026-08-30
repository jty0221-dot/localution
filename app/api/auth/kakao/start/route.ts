// app/api/auth/kakao/start/route.ts
// ============================================================
// 카카오 OAuth 시작 — 20차-1c (디버그 로깅 제거, 2026-04-21)
// · /api/auth/kakao/start?redirect=/marketing/blog-tracking
// · state 에 user_id + returnTo 를 base64 JSON 으로 동봉
// · 302 리다이렉트로 kauth.kakao.com 으로 이동
//
// 비로그인 시: JSON 대신 /login 으로 302 리다이렉트
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireUser } from '@/app/lib/userAuth'
import { buildAuthorizeUrl } from '@/app/lib/kakao-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_RETURN_TO = '/marketing/blog-tracking'
// route.ts 는 정해진 것만 export 할 수 있어 상수는 콜백과 각각 선언한다 (값이 같아야 한다)
const STATE_COOKIE = 'kakao_connect_state'

// SEC-001 · returnTo 는 같은 출처 상대경로만 허용한다.
// 절대 URL(https://evil...) 과 프로토콜 상대 URL(//evil) 은 오픈 리다이렉트가 된다.
function safeReturnTo(raw: string | null | undefined): string {
 const v = (raw || '').trim()
 if (!v.startsWith('/')) return DEFAULT_RETURN_TO
 if (v.startsWith('//')) return DEFAULT_RETURN_TO
 if (v.includes('\\')) return DEFAULT_RETURN_TO
 return v
}

export async function GET(req: NextRequest) {
 const returnTo = safeReturnTo(req.nextUrl.searchParams.get('redirect'))

 const auth = await requireUser()
 if (!auth.ok) {
 const loginUrl = new URL('/login', req.nextUrl.origin)
 loginUrl.searchParams.set('redirect', returnTo)
 loginUrl.searchParams.set('connect_hint', 'kakao')
 return NextResponse.redirect(loginUrl)
 }

 const nonce = crypto.randomUUID()
 const statePayload = { uid: auth.userId, returnTo, nonce }
 const state = Buffer.from(JSON.stringify(statePayload), 'utf-8').toString('base64url')

 // SEC-001 · nonce 를 서버측 HttpOnly 쿠키에 심는다.
 // state 는 base64 평문이라 위조 가능하므로 콜백에서 이 쿠키와 대조해야 의미가 생긴다.
 const cookieStore = await cookies()
 cookieStore.set(STATE_COOKIE, nonce, {
 httpOnly: true,
 secure: true,
 sameSite: 'lax',
 maxAge: 600,
 path: '/',
 })

 try {
 const url = buildAuthorizeUrl(state, 'talk_message')
 return NextResponse.redirect(url)
 } catch (e) {
 const errUrl = new URL(returnTo, req.nextUrl.origin)
 errUrl.searchParams.set('connected', 'error')
 errUrl.searchParams.set('reason',
 'config_' + encodeURIComponent(e instanceof Error ? e.message : 'unknown'))
 return NextResponse.redirect(errUrl)
 }
}
