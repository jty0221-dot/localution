// app/lib/cookieSigningEdge.ts
// ============================================================
// localution_user 서명 쿠키 검증 — Edge 런타임(middleware) 용
//   · cookieSigning.ts 의 verifyCookie() 와 같은 형식 "<base64url payload>.<sig>" 을
//     같은 HMAC-SHA256 으로 검증한다. 단 Node crypto · Buffer 대신 Web Crypto · atob 사용.
//   · 미들웨어는 Edge 에서 돌기 때문에 node 'crypto' 를 import 하면 빌드/실행이 깨진다.
//   · 외부 import 없음 (scripts/*.test.mjs 에서 node 로 바로 불러 단언 테스트 가능).
// ============================================================

export type EdgeLocalutionUser = {
  id: string
  email?: string
  name?: string
  provider?: string
  iat?: number
}

const SIG_LENGTH = 43 // base64url SHA-256 (32 bytes → 43 chars, padding 없음)

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToUtf8(b64url: string): string {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const bin = atob(padded)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

async function hmacBase64Url(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  return bytesToBase64Url(new Uint8Array(sig))
}

/**
 * 서명 검증 + payload 추출. 서명 불일치 · 형식 오류 · 비밀값 없음 → null.
 * secret 은 호출하는 쪽에서 process.env.LOCALUTION_COOKIE_SECRET 를 넘긴다.
 */
export async function verifyCookieEdge(
  raw: string | null | undefined,
  secret: string | null | undefined,
): Promise<EdgeLocalutionUser | null> {
  try {
    if (!raw || !secret || secret.length < 16) return null
    let value = raw
    try { value = decodeURIComponent(raw) } catch {}
    const dotIdx = value.lastIndexOf('.')
    if (dotIdx <= 0) return null
    const b64 = value.slice(0, dotIdx)
    const sig = value.slice(dotIdx + 1)
    if (!sig || sig.length !== SIG_LENGTH) return null
    const expected = await hmacBase64Url(b64, secret)
    if (expected.length !== sig.length) return null
    let mismatch = 0
    for (let i = 0; i < sig.length; i++) {
      mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
    }
    if (mismatch !== 0) return null
    const parsed = JSON.parse(base64UrlToUtf8(b64))
    if (!parsed || typeof parsed !== 'object' || typeof parsed.id !== 'string') return null
    return parsed as EdgeLocalutionUser
  } catch {
    return null
  }
}

export type AdminGateDecision = 'allow' | 'deny' | 'defer'

/**
 * 미들웨어의 /admin 진입 판단 (순수 함수).
 *   · localution_user 쿠키 없음 → 'defer' (Supabase 세션 · /admin 레이아웃 · API 의 requireAdmin 이 막는다)
 *   · 쿠키는 있는데 서명 검증 실패 → 'deny' (위조 · 옛 형식)
 *     단 같은 요청에 Supabase 세션 쿠키가 있으면 'defer' (남은 옛 쿠키 때문에 Supabase 관리자가 막히지 않게)
 *   · 검증 성공 + email 없음 → 'defer' (requireAdmin 과 같은 규칙: Supabase 로 확인)
 *   · 검증 성공 + 관리자 email → 'allow', 아니면 'deny'
 */
export function decideAdminGate(
  hasCookie: boolean,
  user: EdgeLocalutionUser | null,
  isAdmin: (email: string) => boolean,
  hasSupabaseSession = false,
): AdminGateDecision {
  if (!hasCookie) return 'defer'
  if (!user) return hasSupabaseSession ? 'defer' : 'deny'
  const email = (user.email || '').toLowerCase().trim()
  if (!email) return 'defer'
  return isAdmin(email) ? 'allow' : 'deny'
}
