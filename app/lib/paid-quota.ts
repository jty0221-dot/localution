// app/lib/paid-quota.ts
// ============================================================
// 유료 외부 API(AI · Google Places 등) 호출 라우트 공용 문 (LU-018 · SEC-L07 L08 L09 L16)
//   · requirePaidQuota(): 로그인 필수 + 사용자별 분당 · 일일 한도
//   · enforceQuota(): 로그인 없는 공개 경로(QR 손님 등)용 — 매장 · IP 키로 한도만
//   · 한도는 Redis(rate-limit.ts · 인스턴스 공유)와 인스턴스 메모리(rateLimit.ts) 둘 다 건다.
//     rate-limit.ts 는 REDIS_URL 이 없거나 Redis 오류면 허용으로 열리므로(fail-open),
//     그때도 인스턴스 메모리 한도가 최소한의 바닥이 된다. 전체 차단(fail-closed)은 운영
//     REDIS_URL 설정 여부가 확인되지 않아 걸지 않았다 — 켜면 Redis 장애 때 AI 기능 전체가 멈춘다.
// ============================================================
import { NextResponse } from 'next/server'
import { requireUser } from './userAuth'
import { rateLimit } from './rate-limit'
import { checkRate } from './rateLimit'

export type QuotaLimits = {
  perMinute: number
  perDay: number
}

function tooMany(retryAfter: number, message: string) {
  return NextResponse.json(
    { ok: false, error: message, code: 'rate_limited', retryAfter },
    { status: 429, headers: { 'Retry-After': String(retryAfter || 60) } },
  )
}

/** 한도 검사. 통과하면 null, 막히면 429 응답. */
export async function enforceQuota(
  bucket: string,
  id: string,
  limits: QuotaLimits,
  message = '요청이 너무 많아요. 잠시 후 다시 시도해주세요.',
): Promise<NextResponse | null> {
  const key = id.slice(0, 120)
  const minute = await rateLimit({ bucket: `${bucket}-min`, id: key, limit: limits.perMinute, windowSec: 60 })
  if (!minute.ok) return tooMany(minute.retryAfter, message)
  const day = await rateLimit({ bucket: `${bucket}-day`, id: key, limit: limits.perDay, windowSec: 86400 })
  if (!day.ok) return tooMany(day.retryAfter, message)
  // 인스턴스 메모리 바닥 (Redis 가 꺼져 있어도 남는 한도)
  const localMin = checkRate(`paid:${bucket}-min:${key}`, limits.perMinute, 60)
  if (!localMin.ok) return tooMany(localMin.resetIn, message)
  const localDay = checkRate(`paid:${bucket}-day:${key}`, limits.perDay, 86400)
  if (!localDay.ok) return tooMany(localDay.resetIn, message)
  return null
}

export type PaidQuotaResult =
  | { ok: true; userId: string; email: string | null }
  | { ok: false; response: NextResponse }

/** 로그인 + 사용자별 한도. 비로그인은 401 '로그인하면 쓸 수 있어요.' */
export async function requirePaidQuota(bucket: string, limits: QuotaLimits): Promise<PaidQuotaResult> {
  const auth = await requireUser()
  if (!auth.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: auth.status === 401 ? '로그인하면 쓸 수 있어요.' : auth.message,
          code: auth.status === 401 ? 'login_required' : 'auth_error',
        },
        { status: auth.status },
      ),
    }
  }
  const limited = await enforceQuota(bucket, auth.userId, limits)
  if (limited) return { ok: false, response: limited }
  return { ok: true, userId: auth.userId, email: auth.email }
}
