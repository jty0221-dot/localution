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

// 세션 판단 — 듀얼 모드 (LU-018 · SEC-L01 연장)
//   1) localution_user : 네이버/카카오/구글 OAuth — signCookie() 의 "<base64url payload>.<sig>" 를
//      Edge 에서 Web Crypto HMAC 으로 검증한다 (cookieSigningEdge.ts).
//      예전에는 localution_session(공급자 access_token · 서명 없음)이 '있는지만' 봐서
//      아무 값이나 심으면 보호 경로 미들웨어를 통과했다. /api/me 도 session 만 있고 user 가 없으면
//      로그아웃으로 보므로 같은 기준으로 맞췄다.
//      예전 코드는 localution_user 를 JSON.parse 해서 항상 실패 → 관리자 검사도 통째로 건너뛰었다.
//   2) sb-*-auth-token : Supabase Auth (브라우저 SDK) — Edge 에서 JWT 를 검증할 비밀값이 없어
//      존재만 본다. 데이터는 각 API 의 requireUser · requireAdmin 이 토큰을 검증해 막는다.
function hasSupabaseSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token') && !!c.value)
}

async function readVerifiedLocalutionUser(request: NextRequest) {
  const raw = request.cookies.get('localution_user')?.value
  const user = raw ? await verifyCookieEdge(raw, process.env.LOCALUTION_COOKIE_SECRET) : null
  return { hasCookie: !!raw, user }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!isProtected(pathname)) {
    return NextResponse.next({ request })
  }

  const lu = await readVerifiedLocalutionUser(request)
  if (!lu.user && !hasSupabaseSessionCookie(request)) {
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
    //   Supabase 세션만 있는 경우는 여기서 판단하지 않고(defer) /admin 레이아웃과 API requireAdmin 이 막는다.
    const decision = decideAdminGate(lu.hasCookie, lu.user, isAdminEmail)
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
