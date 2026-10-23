// app/lib/customer-owner.ts
// ============================================================
// /api/customers 의 '고객 주인' 키 결정 (LU-018 W2-4)
//
// · 정본은 로그인 ID 그대로(text). stamp_cards · stores · qr_review_logs 와 같은 키다.
// · customers.user_id 가 아직 uuid 인 DB(20261023_crm_owner_key_text.sql 실행 전)에서 OAuth 사장님 ID 를 쓰면
//   Postgres 가 22P02 를 낸다 → 그때만 예전 env 연결 경로(resolveVerifiedIdentity)로 한 번 더 시도한다.
// · 마이그레이션 뒤에는 22P02 가 나지 않아 env 연결 경로를 타지 않는다 → 코드 변경 없이 OAuth 사장님도 서버 저장.
// · resolveVerifiedIdentity 자체는 구독(api/entitlements · subscriptions.user_id uuid) 때문에 계속 필요하다.
// ============================================================
import type { UserResult } from './userAuth'
import { resolveVerifiedIdentity } from './verified-identity'
import { isUuidOwnerKeyError, type DbErrorLike } from './crm-db-errors'

type Authed = Extract<UserResult, { ok: true }>

export type CustomerOwnerRun<T extends { error: DbErrorLike }> =
  | { ok: true; result: T; ownerId: string; via: 'direct' | 'binding' }
  | { ok: false; status: 409 | 503; code: 'identity_mapping_required' | 'identity_verification_failed'; error: string }

export async function runWithCustomerOwner<T extends { error: DbErrorLike }>(
  auth: Authed,
  run: (ownerId: string) => PromiseLike<T>,
): Promise<CustomerOwnerRun<T>> {
  const first = await run(auth.userId)
  if (!isUuidOwnerKeyError(first.error) || auth.source === 'supabase') {
    return { ok: true, result: first, ownerId: auth.userId, via: 'direct' }
  }
  // 마이그레이션 전 DB · OAuth 사장님 → 예전 env 연결 경로
  const identity = await resolveVerifiedIdentity(auth)
  if (!identity.ok) {
    return {
      ok: false,
      status: identity.status,
      code: identity.code,
      error: identity.code === 'identity_mapping_required'
        ? '이 로그인 방식은 아직 고객을 서버에 저장할 수 없어요. 고객지원에 계정 연결 확인을 요청해주세요.'
        : identity.error,
    }
  }
  const second = await run(identity.userId)
  return { ok: true, result: second, ownerId: identity.userId, via: 'binding' }
}
