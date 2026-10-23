// app/lib/supabase-cookie-shape.ts
// ============================================================
// Supabase 세션 쿠키(sb-*-auth-token) 형식 검사 · Edge/Node 공용 (LU-018 · SEC-L01 잔여)
//   · Edge 미들웨어는 Supabase JWT 서명을 검증할 비밀값이 없다.
//     그래도 'sb-아무거나-auth-token=1' 같은 값 하나로 보호 경로를 통과하지 못하게
//     access_token 이 JWT 형태(base64url 3조각 · JSON 헤더/본문)이고 exp 가 미래인지까지는 본다.
//   · 쿠키 해석 규칙은 app/lib/userAuth.ts extractAccessToken 과 같다
//     (base64- 접두 · URL 인코딩 JSON · 배열[0] · {access_token} · {currentSession.access_token}).
//   · 이것은 '형식 위조'만 거른다. 실제 권한은 각 API 의 requireUser · requireAdmin 이
//     Supabase 에 토큰을 다시 검증해서 판단한다 (서명 위조 토큰은 거기서 막힌다).
//   · Buffer 를 쓰지 않는다(Edge) → atob 로 base64/base64url 을 푼다.
// ============================================================

const B64URL_PART = /^[A-Za-z0-9_-]+$/

function b64ToString(input: string): string | null {
  try {
    let s = input.replace(/-/g, '+').replace(/_/g, '/')
    while (s.length % 4 !== 0) s += '='
    const bin = atob(s)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

function parseJsonObject(text: string | null): Record<string, unknown> | null {
  if (!text) return null
  try {
    const v = JSON.parse(text)
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** 쿠키 원문에서 access_token 문자열을 꺼낸다 (userAuth.extractAccessToken 과 같은 규칙) */
export function extractAccessTokenFromCookieValue(rawValue: string | null | undefined): string | null {
  if (!rawValue) return null
  let raw = rawValue
  if (raw.startsWith('base64-')) {
    const decoded = b64ToString(raw.slice(7))
    if (decoded == null) return null
    raw = decoded
  } else {
    try { raw = decodeURIComponent(raw) } catch { /* 그대로 */ }
  }
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return null }
  if (Array.isArray(parsed) && typeof parsed[0] === 'string') return parsed[0]
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>
    if (typeof obj.access_token === 'string') return obj.access_token
    if (typeof obj.currentSession === 'object' && obj.currentSession) {
      const cs = obj.currentSession as Record<string, unknown>
      if (typeof cs.access_token === 'string') return cs.access_token
    }
  }
  return null
}

/** JWT 형태(3조각 base64url · JSON 헤더에 alg · 본문에 미래 exp)인지. 서명은 보지 않는다 */
export function isPlausibleUnexpiredJwt(token: string | null | undefined, nowSec: number = Math.floor(Date.now() / 1000)): boolean {
  if (!token || token.length > 8192) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  if (!parts.every(p => p.length > 0 && B64URL_PART.test(p))) return false
  const header = parseJsonObject(b64ToString(parts[0]))
  const payload = parseJsonObject(b64ToString(parts[1]))
  if (!header || !payload) return false
  if (typeof header.alg !== 'string' || header.alg.toLowerCase() === 'none') return false
  const exp = payload.exp
  if (typeof exp !== 'number' || !Number.isFinite(exp)) return false
  return exp > nowSec
}

/** 쿠키 목록 중 형식이 맞고 만료 안 된 Supabase 세션 쿠키가 하나라도 있는지 */
export function hasPlausibleSupabaseSession(cookies: Array<{ name: string; value: string }>, nowSec?: number): boolean {
  return cookies.some(c =>
    c.name.startsWith('sb-') && c.name.endsWith('-auth-token') && !!c.value &&
    isPlausibleUnexpiredJwt(extractAccessTokenFromCookieValue(c.value), nowSec),
  )
}
