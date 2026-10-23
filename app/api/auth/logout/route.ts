import { NextResponse } from 'next/server'
import { appendSessionCookieClears } from '@/app/lib/session-cookies'

// 모든 인증/캐시 쿠키를 호스트 전용 · Domain(.localution.co.kr) 지정 두 벌 모두 지운다 (LU-018 · R-07)
//   예전 코드는 cookies() 에 같은 이름을 세 번 set/delete 했는데, Next 는 이름 하나에 Set-Cookie 하나만
//   남겨 마지막(호스트 전용 삭제)만 나갔다 → 프로덕션의 Domain 쿠키가 로그아웃 뒤에도 남았다.
const KEYS = ['localution_session', 'localution_user', 'sb-access-token', 'sb-refresh-token']

export async function GET(request: Request) {
  const baseUrl = new URL(request.url).origin
  const res = NextResponse.redirect(new URL('/login', baseUrl))
  appendSessionCookieClears(res.headers, request.url, KEYS)
  return res
}

// 클라이언트 fetch('/api/auth/logout', { method: 'POST' }) 호환
export async function POST(request: Request) {
  const res = NextResponse.json({ ok: true })
  appendSessionCookieClears(res.headers, request.url, KEYS)
  return res
}
