// app/lib/naver-autoreply-options.ts
// ============================================================
// LU-018 W2-11 · 네이버 자동답글 실행 옵션 (순수 로직 · 테스트 대상)
//   · cron   : 하루 4회 크론 — autoreply_auto_approve 를 따른다 (켜져 있으면 바로 발행 큐)
//   · manual : 사장님 '지금 생성' 버튼 — 초안만 만든다. 발행은 사장님이 같은 화면에서 승인
//              (버튼 이름이 '생성' 이라 누른 순간 답글이 올라가면 안 된다)
// ============================================================

export type NaverAutoreplyMode = 'cron' | 'manual'

export interface NaverAutoreplyRunOptions {
  tone: string
  autoApprove: boolean
  maxPerRun: number
  bizId: string | null
}

export const MANUAL_MAX_PER_RUN = 10

export function resolveNaverAutoreplyOptions(
  extra: Record<string, unknown> | null | undefined,
  mode: NaverAutoreplyMode,
): NaverAutoreplyRunOptions {
  const e = extra || {}
  const rawMax = Math.min(20, Math.max(1, Number(e.autoreply_max_per_run) || 5))
  const bizRaw = typeof e.smartplace_biz_id === 'string' || typeof e.smartplace_biz_id === 'number'
    ? String(e.smartplace_biz_id).trim()
    : ''
  return {
    tone: typeof e.autoreply_tone === 'string' && e.autoreply_tone ? e.autoreply_tone : 'friendly',
    autoApprove: mode === 'cron' ? e.autoreply_auto_approve === true : false,
    // 수동 실행은 AI 호출 비용 상한을 더 낮게
    maxPerRun: mode === 'manual' ? Math.min(rawMax, MANUAL_MAX_PER_RUN) : rawMax,
    bizId: bizRaw || null,
  }
}

/** 사장님에게 보여 줄 결과 문장 — 개발자 말 대신 */
export function describeManualRun(r: { drafted: number; skipped: number; candidates: number }): string {
  if (r.candidates === 0) return '새로 초안을 만들 리뷰가 없어요. 답글 안 단 리뷰는 이미 초안이 있거나 처리 중이에요.'
  if (r.drafted === 0) return `초안을 만들지 못했어요. ${r.candidates}건 모두 실패했어요. 잠시 후 다시 시도해주세요.`
  const tail = r.skipped > 0 ? ` · ${r.skipped}건은 만들지 못했어요` : ''
  return `AI 초안 ${r.drafted}건을 만들었어요${tail}. 아래 목록에서 확인하고 승인해주세요.`
}
