// app/lib/review-ownership.ts
// ============================================================
// 리뷰 upsert 소유 보호 (LU-018 · SEC-L14)
//   · platform_reviews 의 upsert 충돌 키가 (platform, platform_review_id) 라 user_id 가 없다.
//     남의 place_id 로 수집하거나 남의 platform_review_id 를 import 하면 기존 행의 user_id 가
//     호출자로 덮어써져 피해 가게 리뷰함에서 리뷰 · 답글 초안이 사라진다.
//   · 근본 처방은 유니크 키를 (user_id, platform, platform_review_id) 로 바꾸는 마이그레이션(결재 C)이다.
//     그 전까지 코드에서: upsert 직전에 이미 다른 user_id 가 가진 행은 빼고 저장한다.
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js'

export type ReviewKeyRow = { platform: string; platform_review_id: string }
export type ExistingOwner = { platform: string; platform_review_id: string; user_id: string | null }

/** 순수 함수: 이미 다른 사용자가 가진 (platform, platform_review_id) 행을 뺀다. */
export function filterOwnReviewRows<T extends ReviewKeyRow>(rows: T[], existing: ExistingOwner[], userId: string): { kept: T[]; dropped: number } {
  const foreign = new Set(
    existing
      .filter((e) => e.user_id && e.user_id !== userId)
      .map((e) => `${e.platform}\u0001${e.platform_review_id}`),
  )
  const kept = rows.filter((r) => !foreign.has(`${r.platform}\u0001${r.platform_review_id}`))
  return { kept, dropped: rows.length - kept.length }
}

/** DB 조회 + 필터. 조회 실패 시에는 안전하게 아무것도 저장하지 않는다(빈 배열). */
export async function keepOwnReviewRows<T extends ReviewKeyRow>(svc: SupabaseClient, rows: T[], userId: string): Promise<T[]> {
  if (rows.length === 0) return rows
  const existing: ExistingOwner[] = []
  const byPlatform = new Map<string, string[]>()
  for (const r of rows) {
    const list = byPlatform.get(r.platform) || []
    list.push(r.platform_review_id)
    byPlatform.set(r.platform, list)
  }
  const CHUNK = 200
  for (const [platform, ids] of Array.from(byPlatform.entries())) {
    for (let i = 0; i < ids.length; i += CHUNK) {
      const { data, error } = await svc
        .from('platform_reviews')
        .select('platform, platform_review_id, user_id')
        .eq('platform', platform)
        .in('platform_review_id', ids.slice(i, i + CHUNK))
      if (error) {
        console.error('[review-ownership] 기존 행 조회 실패 — 저장 보류', error.message)
        return []
      }
      for (const d of (data || []) as ExistingOwner[]) existing.push(d)
    }
  }
  const { kept, dropped } = filterOwnReviewRows(rows, existing, userId)
  if (dropped > 0) console.warn(`[review-ownership] 다른 사용자 소유 리뷰 ${dropped}건 저장 제외`)
  return kept
}
