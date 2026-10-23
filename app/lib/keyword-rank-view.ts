// app/lib/keyword-rank-view.ts
// ============================================================
// /marketing/keyword-rank 화면용 순위 해석 (순수 함수 · 서버 호출 없음)
//
// 원칙 (대표 2026-10-18 정정)
//   · 순위는 측정값 그대로. 점수 · 등급 · 가중합은 만들지도 보여주지도 않는다.
//   · rank null + 측정 기록 있음 = 측정한 목록 안에 없음(권외). 0위가 아니다.
//   · 측정 기록 없음 = 아직 측정 전. 측정 실패는 서버가 기록하지 않으므로 '그날 기록 없음' 으로만 보인다.
// ============================================================

export type RankRow = {
  rank: number | null
  total: number | null
  method: string | null
  ts: string
}

export type RankState =
  | { kind: 'never' }
  | { kind: 'ranked'; rank: number; total: number | null; ts: string }
  | { kind: 'outside'; total: number | null; ts: string }

/** 화면에 쓰는 측정 상태. method 'none' 은 측정 실패라 측정값으로 쓰지 않는다. */
export function rankState(row: RankRow | null | undefined): RankState {
  if (!row || !row.ts || row.method === 'none') return { kind: 'never' }
  const total = typeof row.total === 'number' && Number.isFinite(row.total) ? row.total : null
  if (typeof row.rank === 'number' && Number.isInteger(row.rank) && row.rank >= 1) {
    return { kind: 'ranked', rank: row.rank, total, ts: row.ts }
  }
  return { kind: 'outside', total, ts: row.ts }
}

export function rankStateLabel(state: RankState): string {
  if (state.kind === 'never') return '아직 측정 전'
  if (state.kind === 'ranked') return `${state.rank}위`
  return state.total ? `미노출 (확인한 ${state.total}개 안에 없음)` : '미노출 (권외)'
}

/** Asia/Seoul 기준 YYYY-MM-DD */
export function seoulDay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export type DayPoint = {
  day: string
  /** 그날 마지막 측정 순위. 권외면 null, 기록이 없으면 measured=false */
  rank: number | null
  measured: boolean
  outside: boolean
}

/**
 * 최근 days 일을 하루 한 칸으로 편다 (Asia/Seoul).
 * 같은 날 여러 번 쟀으면 마지막 측정을 쓴다. 기록이 없는 날은 measured=false 로 두고 값을 지어내지 않는다.
 */
export function dailySeries(rows: RankRow[], days: number, now: Date = new Date()): DayPoint[] {
  const span = Math.max(1, Math.min(365, Math.floor(days)))
  const lastByDay = new Map<string, RankRow>()
  const sorted = [...rows].filter(r => r && r.ts && r.method !== 'none').sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts))
  for (const r of sorted) {
    const day = seoulDay(r.ts)
    if (day) lastByDay.set(day, r)
  }
  const today = seoulDay(now.toISOString())
  const base = Date.parse(today + 'T00:00:00Z')
  const out: DayPoint[] = []
  for (let i = span - 1; i >= 0; i--) {
    const day = new Date(base - i * 86400000).toISOString().slice(0, 10)
    const row = lastByDay.get(day)
    if (!row) { out.push({ day, rank: null, measured: false, outside: false }); continue }
    const state = rankState(row)
    out.push({ day, rank: state.kind === 'ranked' ? state.rank : null, measured: true, outside: state.kind === 'outside' })
  }
  return out
}

export type SeriesSummary = {
  measuredDays: number
  outsideDays: number
  best: number | null
  worst: number | null
}

export function summarize(points: DayPoint[]): SeriesSummary {
  const ranks = points.filter(p => p.measured && p.rank !== null).map(p => p.rank as number)
  return {
    measuredDays: points.filter(p => p.measured).length,
    outsideDays: points.filter(p => p.outside).length,
    best: ranks.length ? Math.min(...ranks) : null,
    worst: ranks.length ? Math.max(...ranks) : null,
  }
}

export function formatSeoulTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
