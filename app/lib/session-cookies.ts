// app/lib/session-cookies.ts
// ============================================================
// OAuth 콜백에서 세션 쿠키(localution_session, localution_user) 발급 시
// 공통으로 쓰는 옵션 헬퍼.
//
// 배경 (2026-07-30 hotfix):
//   · 사장님이 www.localution.co.kr 에서 네이버 로그인 후 /my/platforms 에서
//     "연결하기" 클릭 시 /login 으로 튕겨나가는 이슈 발생
//   · 원인: OAuth 콜백이 localution.co.kr(www 없음) 또는 www.localution.co.kr
//     중 한쪽에서 실행되면 쿠키가 해당 호스트 스코프로만 발급 → 다른
//     서브도메인 방문 시 안 보임 → middleware 세션 판단 실패 → login 리다이렉트
//
// 해결책:
//   · 프로덕션(localution.co.kr) 요청은 domain=".localution.co.kr" 지정 →
//     www/root 어디서든 유효
//   · Vercel Preview / localhost 등은 domain 지정 없이 발급 (host 스코프)
// ============================================================

const THIRTY_DAYS = 30 * 24 * 60 * 60

/**
 * 요청 host 에서 프로덕션 apex 도메인을 추출.
 * · www.localution.co.kr → .localution.co.kr
 * · localution.co.kr     → .localution.co.kr
 * · localution.vercel.app / localhost / preview URL 등 → null (host 스코프)
 */
export function detectApexDomain(host: string | null | undefined): string | null {
  if (!host) return null
  const hostname = host.split(':')[0].toLowerCase()
  if (hostname === 'localution.co.kr' || hostname.endsWith('.localution.co.kr')) {
    return '.localution.co.kr'
  }
  return null
}

/**
 * 요청 URL 기준으로 세션 쿠키에 붙일 공통 옵션을 반환.
 * (httpOnly 는 콜백에서 명시 — signCookie 사용 시 true 권장)
 */
export function sessionCookieOpts(requestUrl: string) {
  const domain = detectApexDomain(new URL(requestUrl).host)
  return {
    secure: true,
    sameSite: 'lax' as const,
    maxAge: THIRTY_DAYS,
    path: '/',
    ...(domain ? { domain } : {}),
  }
}

/**
 * 로그아웃 시 세션 쿠키 삭제 옵션.
 * domain 을 지정한 쿠키는 반드시 같은 domain 으로 delete 해야 지워짐.
 */
export function sessionCookieDeleteOpts(requestUrl: string) {
  const domain = detectApexDomain(new URL(requestUrl).host)
  return {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    ...(domain ? { domain } : {}),
  }
}

// ============================================================
// LU-018 · R-07 — 세션 쿠키를 심고 · 갱신하고 · 지우는 곳을 한 규칙으로 맞춘다
//   · 프로덕션은 Domain=.localution.co.kr 로 심는다(위 sessionCookieOpts). 그런데 예전 /api/me 갱신 ·
//     관리자 임시 로그인은 Domain 없이(호스트 전용) 심어서, 같은 이름 쿠키가 두 벌 생겼다.
//   · 브라우저는 두 벌을 다 보내고(먼저 만든 것이 앞) 서버는 첫 번째만 읽는다 → 쿠키 비밀키 회전 뒤
//     미들웨어가 Domain 본만 지우면 호스트 전용 옛 쿠키가 남아 /login 으로 계속 돌려보낸다.
//   · Next 의 res.cookies / cookies() 는 이름 하나에 Set-Cookie 하나만 남긴다(같은 이름 두 번 set 하면 뒤가 이김).
//     그래서 '두 벌 지우기' 는 Set-Cookie 원문을 직접 덧붙인다. 원문은 cookies.set 을 다 한 뒤에 붙인다
//     (ResponseCookies.set 은 set-cookie 헤더를 자기 목록으로 다시 쓴다).
// ============================================================
export const SESSION_COOKIE_NAMES = ['localution_user', 'localution_session'] as const

/** 세션 쿠키 발급 · 갱신 옵션 (httpOnly 포함) — 콜백 · /api/me 갱신 · 임시 로그인이 모두 이것을 쓴다 */
export function sessionCookieSetOpts(requestUrl: string, maxAge?: number) {
  return { ...sessionCookieOpts(requestUrl), httpOnly: true, ...(typeof maxAge === 'number' ? { maxAge } : {}) }
}

/** 지우는 Set-Cookie 원문: 호스트 전용 1개 + (프로덕션이면) Domain 지정 1개 */
export function sessionCookieClearHeaders(requestUrl: string, names: readonly string[] = SESSION_COOKIE_NAMES, opts: { hostOnly?: boolean; domain?: boolean } = {}): string[] {
  const domain = detectApexDomain(new URL(requestUrl).host)
  const base = 'Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; SameSite=Lax'
  const out: string[] = []
  for (const name of names) {
    if (opts.hostOnly !== false) out.push(`${name}=; ${base}`)
    if (domain && opts.domain !== false) out.push(`${name}=; ${base}; Domain=${domain}`)
  }
  return out
}

/** 응답 헤더에 '두 벌 지우기' 를 덧붙인다 (res.cookies.set 을 모두 끝낸 뒤 부른다) */
export function appendSessionCookieClears(headers: Headers, requestUrl: string, names: readonly string[] = SESSION_COOKIE_NAMES): void {
  for (const h of sessionCookieClearHeaders(requestUrl, names)) headers.append('Set-Cookie', h)
}

/** 프로덕션에서 Domain 본을 새로 심을 때, 남아 있을 수 있는 호스트 전용 옛 쿠키만 지운다 */
export function appendHostOnlyDuplicateClears(headers: Headers, requestUrl: string, names: readonly string[]): void {
  if (!detectApexDomain(new URL(requestUrl).host)) return // 호스트 전용으로 심는 환경이면 지우면 안 된다
  for (const h of sessionCookieClearHeaders(requestUrl, names, { domain: false })) headers.append('Set-Cookie', h)
}
