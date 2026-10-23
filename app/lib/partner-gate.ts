// app/lib/partner-gate.ts
// ============================================================
// 배달 플랫폼 파트너 API 라우트 공용 문 (LU-018 · SEC-L10)
//   · baemin-reply · yogiyo-reply · baemin-reviews · yogiyo-reviews · reviews/coupang 은
//     인증 없이 회사 env 자격(BAEMIN_CLIENT_* · YOGIYO_API_KEY · COUPANG_*)으로 남의 매장에 붙을 수 있었다.
//   · 이제: 로그인 필수. 호출자가 자기 토큰을 직접 넘기면 플랫폼이 소유를 판정하므로 로그인 사용자 허용,
//     토큰 없이 회사 env 자격으로 대신 붙는 경우는 관리자만.
//   · 사용자당 분당 30회 · 1일 500회.
// ============================================================
import { NextResponse } from 'next/server'
import { requireUser } from './userAuth'
import { isAdminEmail } from './admin-emails'
import { enforceQuota } from './paid-quota'

export type PartnerGateResult =
  | { ok: true; userId: string; isAdmin: boolean }
  | { ok: false; response: NextResponse }

export async function requirePartnerAccess(userSuppliedToken: boolean): Promise<PartnerGateResult> {
  const auth = await requireUser()
  if (!auth.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: auth.status === 401 ? '로그인이 필요해요.' : auth.message },
        { status: auth.status },
      ),
    }
  }
  const isAdmin = isAdminEmail(auth.email)
  if (!userSuppliedToken && !isAdmin) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, code: 'company_credentials_admin_only', error: '회사 연동 자격으로 대신 조회 · 등록하는 기능은 관리자만 쓸 수 있어요.' },
        { status: 403 },
      ),
    }
  }
  const limited = await enforceQuota('partner-api', auth.userId, { perMinute: 30, perDay: 500 })
  if (limited) return { ok: false, response: limited }
  return { ok: true, userId: auth.userId, isAdmin }
}
