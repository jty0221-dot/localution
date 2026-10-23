// app/lib/stamp-public.ts
// ============================================================
// 공개 스탬프 API 응답 최소화 (LU-018)
//   · /api/stamps/collect 는 로그인 없는 손님용이다. 예전에는 stamp_cards · stamp_collections 를
//     select('*') 그대로 돌려줘 손님 전화번호 · 이름 · 마케팅 동의 · 사장님 user_id 가 노출됐다.
//   · 화면(app/stamp/[slug] · StampCardView)이 실제로 쓰는 필드만 남긴다.
//   · owner_name · owner_phone 은 사장님이 카드에 직접 적어 손님에게 보여주는 매장 연락처라 유지한다.
//   · 외부 import 없음 → scripts/*.test.mjs 에서 node 로 바로 테스트 가능.
// ============================================================

type Row = Record<string, unknown> | null | undefined

export type PublicStampCard = {
  title: unknown
  description: unknown
  required_stamps: unknown
  reward_text: unknown
  theme_color: unknown
  milestones: unknown
  owner_name: unknown
  owner_phone: unknown
}

export type PublicStampCollection = {
  current_stamps: number
  total_collected: number
  rewards_claimed: number
}

export function publicStampCard(card: Row): PublicStampCard | null {
  if (!card) return null
  return {
    title: card.title ?? null,
    description: card.description ?? null,
    required_stamps: card.required_stamps ?? null,
    reward_text: card.reward_text ?? null,
    theme_color: card.theme_color ?? null,
    milestones: card.milestones ?? null,
    owner_name: card.owner_name ?? null,
    owner_phone: card.owner_phone ?? null,
  }
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function publicStampCollection(row: Row): PublicStampCollection | null {
  if (!row) return null
  return {
    current_stamps: num(row.current_stamps),
    total_collected: num(row.total_collected),
    rewards_claimed: num(row.rewards_claimed),
  }
}
