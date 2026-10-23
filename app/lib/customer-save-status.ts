// app/lib/customer-save-status.ts
// ============================================================
// /api/customers 실패 응답 → 화면 문구 (LU-018 W2-4) · 순수 함수
// · 예전에는 409(계정 연결 필요)를 받으면 아무 말 없이 '이 기기 저장' 으로 떨어졌다
// · 이제 서버 저장이 안 된 이유를 '저장 못 함 · …' 으로 그대로 보여준다
// ============================================================

export const SAVE_BLOCKED_PREFIX = '저장 못 함'

type FailureBody = { code?: unknown; error?: unknown } | null | undefined

export function describeCustomerSaveFailure(status: number, body: FailureBody): string {
  const code = typeof body?.code === 'string' ? body.code : ''
  const serverText = typeof body?.error === 'string' && body.error.trim() ? body.error.trim() : ''
  if (status === 401 || status === 403) return `${SAVE_BLOCKED_PREFIX} · 로그인 상태를 확인한 뒤 다시 시도해주세요.`
  if (code === 'identity_mapping_required') {
    return `${SAVE_BLOCKED_PREFIX} · ${serverText || '이 로그인 방식은 아직 고객을 서버에 저장할 수 없어요. 고객지원에 계정 연결 확인을 요청해주세요.'}`
  }
  if (code === 'duplicate_phone') return `${SAVE_BLOCKED_PREFIX} · ${serverText || '같은 전화번호의 고객이 이미 있어요.'}`
  if (code === 'identity_verification_failed' || status === 503) {
    return `${SAVE_BLOCKED_PREFIX} · ${serverText || '계정 연결을 확인하지 못했어요. 잠시 후 다시 시도해주세요.'}`
  }
  if (status === 0) return `${SAVE_BLOCKED_PREFIX} · 인터넷 연결을 확인한 뒤 다시 시도해주세요.`
  return `${SAVE_BLOCKED_PREFIX} · ${serverText || '서버에 저장하지 못했어요. 잠시 후 다시 시도해주세요.'}`
}

// 처음 불러올 때 서버를 못 쓰는 상태(로그인은 했지만 저장 불가)인지 — 401/403 은 미로그인(게스트)이라 제외
export function isServerSaveBlocked(status: number): boolean {
  return status !== 401 && status !== 403 && (status === 0 || status >= 400)
}
