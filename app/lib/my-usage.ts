// app/lib/my-usage.ts
// ============================================================
// LU-018 W2-12 · /my 서비스 이용 현황 — 서버 집계 (순수 로직)
// 예전엔 브라우저 localStorage(localution_store · localution.customers · localution.platform_links)
// 로 셌다 → 기기마다 다른 숫자 · 새 기기에선 0 0 0. 이제 서버 count 만 쓰고, 못 읽은 칸은 null('-').
// ============================================================

export interface MyUsage {
  stores: number | null
  customers: number | null
  platforms: number | null
}

/** Supabase count 응답 → 숫자 또는 null(모름). 오류를 0 으로 바꾸지 않는다 */
export function countOrNull(res: { count?: number | null; error?: unknown } | null | undefined): number | null {
  if (!res || res.error) return null
  return typeof res.count === 'number' && Number.isFinite(res.count) && res.count >= 0 ? res.count : null
}

/** 세 칸을 모두 알고 전부 0 일 때만 '아직 등록된 데이터가 없어요' 안내 */
export function isUsageAllZero(u: MyUsage | null | undefined): boolean {
  return !!u && u.stores === 0 && u.customers === 0 && u.platforms === 0
}

/** 하나라도 못 읽었는지 */
export function hasUnknownUsage(u: MyUsage | null | undefined): boolean {
  return !u || u.stores === null || u.customers === null || u.platforms === null
}
