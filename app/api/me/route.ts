import { NextRequest, NextResponse } from 'next/server'
import { signCookie, verifyCookie } from '@/app/lib/cookieSigning'
import { requireUser } from '@/app/lib/userAuth'
import { isAdminEmail } from '@/app/lib/admin-emails'
import { sessionCookieSetOpts, appendHostOnlyDuplicateClears, appendSessionCookieClears } from '@/app/lib/session-cookies'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 관리자 여부는 서버에서만 판정해 불리언으로 내려준다 (LU-018 · SEC-L01)
//   → 화면 번들에 관리자 이메일 목록이 실려 나가지 않는다. 실제 권한은 /admin 서버 레이아웃 · API requireAdmin 이 다시 본다.
const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie, Authorization' }
function respond(body: unknown, options?: { status: number }) {
 return NextResponse.json(body, { ...options, headers: PRIVATE_HEADERS })
}

async function fallbackIdentity(hint?: string) {
 try {
 const auth = await requireUser()
 if (auth.ok) return respond({ user: { id: auth.userId, email: auth.email, isAdmin: isAdminEmail(auth.email) }, source: auth.source })
 } catch { /* fail closed */ }
 return respond({ user: null, ...(hint ? { hint } : {}) }, { status: 401 })
}
export async function GET(req: NextRequest) {
 const userCookie = req.cookies.get('localution_user')?.value
 const sessionCookie = req.cookies.get('localution_session')?.value

 // 둘 다 없으면 진짜 로그아웃 상태 → 401
 if (!userCookie && !sessionCookie) {
 return fallbackIdentity()
 }

 // user 쿠키 없지만 session 있으면 (시그너처 손상 등) → 401 + reset 안내
 if (!userCookie && sessionCookie) {
 return fallbackIdentity('session_only')
 }

 // 1차: signed cookie verify
 const verified = verifyCookie(userCookie!)
 if (verified) {
 // Sliding session: 정상 검증되면 쿠키 만료 갱신 (방문할 때마다 +30일)
 //   → 매월 1번 이상 방문 사장님은 사실상 영구 로그인
 const res = respond({ user: { ...verified, isAdmin: isAdminEmail(verified.email) } })
 try {
 const renewed = signCookie({
 id: verified.id,
 email: verified.email,
 name: verified.name,
 provider: verified.provider,
 })
 // R-07: 로그인 콜백과 같은 속성(프로덕션 Domain=.localution.co.kr · 30일)으로 갱신한다.
 //   예전에는 Domain 없이 갱신해 같은 이름 쿠키가 두 벌 생겼다 → 호스트 전용 옛 쿠키는 지운다.
 const opts = sessionCookieSetOpts(req.url)
 res.cookies.set('localution_user', renewed, opts)
 if (sessionCookie) {
 res.cookies.set('localution_session', sessionCookie, opts)
 }
 appendHostOnlyDuplicateClears(res.headers, req.url, sessionCookie ? ['localution_user', 'localution_session'] : ['localution_user'])
 } catch (_) { /* secret missing 등 — 갱신만 실패, 로그인 상태는 유지 */ }
 return res
 }

 // 서명이 검증되지 않은 평문 쿠키는 사용자 표시의 근거로도 사용하지 않는다.
 return fallbackIdentity('verify_failed')
}

export async function DELETE(req: NextRequest) {
 const res = respond({ ok: true })
 // 호스트 전용 · Domain 지정 두 벌 모두 지운다 (R-07)
 appendSessionCookieClears(res.headers, req.url)
 return res
}
