// app/lib/runtime-env.ts
// ============================================================
// 운영 환경 판정 (LU-018)
//   · 가짜 리뷰를 넣는 seed 계열 관리자 라우트를 운영에서 410 으로 막을 때 쓴다.
//   · NODE_ENV=production 또는 VERCEL_ENV=production 이면 운영으로 본다.
//     (Vercel Preview 도 NODE_ENV=production 이라 seed 가 막힌다 — 로컬 next dev 에서만 열린다)
//   · 외부 import 없음 → scripts/*.test.mjs 에서 node 로 바로 테스트 가능.
// ============================================================

type EnvLike = Record<string, string | undefined>

export function isProductionRuntime(env: EnvLike = process.env): boolean {
  return env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production'
}
