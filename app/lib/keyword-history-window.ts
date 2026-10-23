// app/lib/keyword-history-window.ts
// 키워드 순위 시계열 조회 창 (R-03 · LU-018 검수 반영)
// 오름차순 + 상한으로 자르면 키워드가 많을 때 최근 날짜가 잘린다.
// 그래서 최근 쪽부터(ts 내림차순) 페이지로 받아 상한에서 멈추고, 화면용으로 오름차순으로 뒤집는다.
// 잘림이 생겨도 사라지는 쪽은 가장 오래된 날짜다.

/** 조회 가능한 최대 일수 — 화면은 30일 추이만 그린다 */
export const HISTORY_MAX_DAYS = 31
/** 매장 1곳 키워드 상한(50) × 31일 × 하루 2회(크론 + 지금 측정) */
export const HISTORY_MAX_ROWS = 50 * HISTORY_MAX_DAYS * 2
/** PostgREST 1회 응답 상한(Supabase 기본 1000행) 안쪽 */
export const HISTORY_PAGE_SIZE = 1000

export function historyDays(raw: string | null | undefined, fallback = 30): number {
  const n = Number(raw ?? fallback)
  if (!Number.isFinite(n)) return fallback
  return Math.min(HISTORY_MAX_DAYS, Math.max(1, Math.floor(n)))
}

type PageResult<T> = { data: T[] | null; error: { message: string } | null }

/**
 * ts 내림차순으로 페이지를 받아 maxRows 에서 멈춘 뒤 오름차순으로 돌려준다.
 * fetchPage(from, to) 는 0부터 시작하는 포함 범위(.range) 를 받는다.
 */
export async function collectRecentRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  maxRows = HISTORY_MAX_ROWS,
  pageSize = HISTORY_PAGE_SIZE,
): Promise<{ rows: T[]; truncated: boolean; error: string | null }> {
  const desc: T[] = []
  let truncated = false
  while (desc.length < maxRows) {
    const from = desc.length
    const want = Math.min(pageSize, maxRows - from)
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await fetchPage(from, from + want - 1)
    if (error) return { rows: [], truncated: false, error: error.message }
    const page = data ?? []
    desc.push(...page)
    if (page.length < want) break
    if (desc.length >= maxRows) {
      // 상한에 딱 닿았다 — 한 행만 더 있는지 확인해 잘림 여부를 정한다
      // eslint-disable-next-line no-await-in-loop
      const probe = await fetchPage(maxRows, maxRows)
      truncated = !probe.error && (probe.data?.length ?? 0) > 0
      break
    }
  }
  return { rows: desc.reverse(), truncated, error: null }
}
