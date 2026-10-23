import { NextResponse, type NextRequest } from 'next/server'
import { isAdminEmail } from '@/app/lib/admin-emails'
import { verifyCookieEdge, decideAdminGate } from '@/app/lib/cookieSigningEdge'

// 로그인 필수 경로 (prefix 매칭)
// ⚠️ 공개 페이지 절대 추가 금지:
//   - /review/[storeId]  ← QR 스캔한 고객이 보는 페이지. 고객은 로그인 없음.
//   - /inquiry           ← 비로그인 사용자가 견적·문의 보내는 공개 페이지.
//   - /login, /service-intro, /pricing, /community, /  ← 마케팅·공개 페이지
//   - /marketing/*       ← 자영업자가 서비스 미리 체험할 수 있는 공개 도구 페이지
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/admin',
  '/admin-biz',
  '/customers',
  '/crm',
  '/review-admin',
  '/reviews',
  '/qr-admin',
  '/settings',
  '/settlement',
  '/my',
  '/reservations',
  '/partner-points',
  '/whoami',
]

// 관리자 전용 경로 (prefix 매칭) — 로그인 + 관리자 화이트리스트 모두 통과해야 함
const ADMIN_PREFIXES = ['/admin', '/whoami']

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(prefix =>
    pathname === prefix || pathname.startsWith(prefix + '/')
  )
}

function isAdminPath(pathname: string): boolean {
  return ADMIN_PREFIXES.some(prefix =>
    pathname === prefix || pathname.startsWith(prefix + '/')
  )
}

// 세션 쿠키 존재 판단 — 듀얼 모드
//   1) localution_session  : 네이버/카카오/구글 OAuth
//   2) sb-*-auth-token     : Supabase Auth (브라우저 SDK)
function hasAnySession(request: NextRequest): boolean {
  if (request.cookies.get('localution_session')?.value) return true

  // Supabase 클라이언트가 심는 쿠키는 sb-<projectref>-auth-token 형식
  // Next.js RequestCookies 는 getAll() 지원
  const all = request.cookies.getAll()
  if (all.some(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token') && c.value)) {
    return true
  }
  return false
}

// localution_user 쿠키 서명 검증 (LU-018)
//   · 쿠키는 OAuth 콜백에서 signCookie() 로 "<base64url payload>.<sig>" 형식으로 발급된다.
//   · 예전 코드는 이 값을 JSON.parse 해서 항상 실패 → null → 관리자 검사가 통째로 건너뛰어졌다.
//   · Edge 런타임이라 node crypto 대신 Web Crypto 로 같은 HMAC 을 검증한다 (cookieSigningEdge.ts).
//   · Supabase 세션만 있는 경우는 여기서 판단하지 않고(defer) /admin 레이아웃과
//     /api/admin/** 의 requireAdmin() 이 막는다.
async function adminGateFromCookie(request: NextRequest) {
  const raw = request.cookies.get('localution_user')?.value
  const user = raw ? await verifyCookieEdge(raw, process.env.LOCALUTION_COOKIE_SECRET) : null
  return decideAdminGate(!!raw, user, isAdminEmail)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!isProtected(pathname)) {
    return NextResponse.next({ request })
  }

  if (!hasAnySession(request)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // /admin* 은 관리자 화이트리스트 추가 검증
  //   OAuth 로그인의 경우: 서명 검증한 쿠키의 email 로 즉시 차단 (위조·옛 형식 쿠키도 차단)
  //   Supabase 로그인의 경우: layout 검사 + API requireAdmin 으로 폴백
  if (isAdminPath(pathname)) {
    const decision = await adminGateFromCookie(request)
    if (decision === 'deny') {
      const homeUrl = request.nextUrl.clone()
      homeUrl.pathname = '/'
      homeUrl.search = ''
      return NextResponse.redirect(homeUrl)
    }
  }

  return NextResponse.next({ request })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
