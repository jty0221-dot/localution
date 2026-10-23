// app/lib/crm-db-errors.ts
// ============================================================
// CRM 표(customers 등)의 DB 오류를 '스키마가 아직 안 바뀐 상태' 와 '진짜 실패' 로 가른다 (LU-018 W2-4 · W2-5)
// · 마이그레이션 실행 전/후 모두 같은 코드가 돌게 하려고 쓴다. 순수 함수 · 서버 import 없음
// ============================================================

export type DbErrorLike = { code?: string | null; message?: string | null; details?: string | null } | null | undefined

// customers.user_id 가 아직 uuid 인데 text 사장님 ID 를 넣거나 비교했을 때 (Postgres 22P02)
// 20261023_crm_owner_key_text.sql 실행 뒤에는 나지 않는다
export function isUuidOwnerKeyError(err: DbErrorLike): boolean {
  if (!err) return false
  return err.code === '22P02' && /uuid/i.test(String(err.message || ''))
}

// 아직 없는 열을 읽거나 쓸 때 (Postgres 42703 · PostgREST 스키마 캐시 PGRST204)
// column 을 주면 그 열 이름이 메시지에 있을 때만 참
export function isMissingColumnError(err: DbErrorLike, column?: string): boolean {
  if (!err) return false
  if (err.code !== '42703' && err.code !== 'PGRST204') return false
  if (!column) return true
  return String(err.message || '').includes(column) || String(err.details || '').includes(column)
}

// 서버 로그 · 관리자 기록에 남길 짧은 분류 (메시지 원문에 전화번호가 섞일 수 있어 원문은 남기지 않는다)
export function classifyCrmSyncError(err: DbErrorLike): 'owner_key_uuid' | 'missing_column' | 'duplicate' | 'db_error' | 'unknown' {
  if (!err) return 'unknown'
  if (isUuidOwnerKeyError(err)) return 'owner_key_uuid'
  if (isMissingColumnError(err)) return 'missing_column'
  if (err.code === '23505') return 'duplicate'
  return err.code ? 'db_error' : 'unknown'
}
